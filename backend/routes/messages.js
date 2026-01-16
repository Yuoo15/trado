const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка хранения для изображений сообщений
const messagesUploadsDir = path.join(__dirname, '../public/uploads/messages');
if (!fs.existsSync(messagesUploadsDir)) {
  fs.mkdirSync(messagesUploadsDir, { recursive: true });
}

const messagesStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, messagesUploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `message-${unique}${ext}`);
  },
});

const uploadMessage = multer({ 
  storage: messagesStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены'));
    }
  }
});

// Вспомогательная функция для создания/получения чата с админом
async function ensureAdminChat(userId) {
  try {
    // Находим админа (Ramazan)
    const [admins] = await db.execute(
      'SELECT id FROM users WHERE phone = ? AND role = ?',
      ['+71262342332', 'admin']
    );
    
    if (admins.length === 0) {
      console.log('Админ не найден для создания чата поддержки');
      return null;
    }
    
    const adminId = admins[0].id;
    
    // Находим или создаем объявление поддержки (берем первое, если их несколько)
    let [supportAds] = await db.execute(
      'SELECT id FROM products WHERE user_id = ? AND title = ? LIMIT 1',
      [adminId, 'Поддержка']
    );
    
    let supportAdId;
    if (supportAds.length === 0) {
      // Находим первую категорию
      const [categories] = await db.execute('SELECT id FROM categories LIMIT 1');
      const categoryId = categories.length > 0 ? categories[0].id : 1;
      
      // Создаем объявление поддержки
      const [result] = await db.execute(
        'INSERT INTO products (user_id, category_id, title, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)',
        [
          adminId,
          categoryId,
          'Поддержка',
          'Напишите нам, если у вас есть вопросы или нужна помощь',
          '0',
          JSON.stringify([])
        ]
      );
      supportAdId = result.insertId;
    } else {
      supportAdId = supportAds[0].id;
    }
    
    // Проверяем, есть ли уже чат с админом для этого объявления поддержки (используем DISTINCT или проверяем точно)
    const [existingChats] = await db.execute(
      'SELECT id FROM chats WHERE ad_id = ? AND buyer_id = ? AND seller_id = ? LIMIT 1',
      [supportAdId, userId, adminId]
    );
    
    if (existingChats.length === 0) {
      // Создаем чат с админом
      await db.execute(
        'INSERT INTO chats (ad_id, buyer_id, seller_id) VALUES (?, ?, ?)',
        [supportAdId, userId, adminId]
      );
      console.log('Создан чат поддержки для пользователя', userId);
    }
    
    return supportAdId;
  } catch (error) {
    console.error('Ошибка создания чата с админом:', error);
    return null;
  }
}

// Получить список чатов текущего пользователя
router.get('/chats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Убеждаемся, что у пользователя есть чат с админом
    await ensureAdminChat(userId);
    
    const [chats] = await db.execute(`
      SELECT DISTINCT
        c.id,
        c.ad_id,
        c.buyer_id,
        c.seller_id,
        c.updated_at,
        COALESCE(a.title, 'Общий чат') as ad_title,
        a.image_url as ad_image,
        a.price as ad_price,
        CASE 
          WHEN c.buyer_id = ? THEN seller.name
          ELSE buyer.name
        END as other_user_name,
        CASE 
          WHEN c.buyer_id = ? THEN seller.id
          ELSE buyer.id
        END as other_user_id,
        (SELECT message FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM chats c
      LEFT JOIN products a ON c.ad_id = a.id
      INNER JOIN users buyer ON c.buyer_id = buyer.id
      INNER JOIN users seller ON c.seller_id = seller.id
      WHERE (c.buyer_id = ? OR c.seller_id = ?)
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `, [userId, userId, userId, userId]);
    
    // Обрабатываем image_url для каждого чата
    const processedChats = chats.map(chat => {
      let imageUrl = chat.ad_image;
      if (imageUrl) {
        try {
          const parsed = JSON.parse(imageUrl);
          if (Array.isArray(parsed) && parsed.length > 0) {
            imageUrl = parsed[0];
          }
        } catch {
          // Если не JSON, используем как есть
        }
      }
      return {
        ...chat,
        ad_image: imageUrl || '/example.jpg'
      };
    });
    
    res.json(processedChats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Создать или получить чат по объявлению или напрямую с продавцом
router.post('/chats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ad_id, seller_id } = req.body;
    
    let sellerId;
    let adId = ad_id || null;
    
    // Если передан seller_id, используем его напрямую
    if (seller_id) {
      sellerId = parseInt(seller_id);
      if (isNaN(sellerId)) {
        return res.status(400).json({ error: 'Неверный ID продавца' });
      }
      
      // Проверяем, что продавец существует
      const [users] = await db.execute('SELECT id FROM users WHERE id = ?', [sellerId]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'Продавец не найден' });
      }
    } 
    // Если передан ad_id, получаем seller_id из объявления
    else if (ad_id) {
      const [ads] = await db.execute('SELECT user_id FROM products WHERE id = ?', [ad_id]);
      if (ads.length === 0) {
        return res.status(404).json({ error: 'Объявление не найдено' });
      }
      sellerId = ads[0].user_id;
      adId = ad_id;
    } 
    else {
      return res.status(400).json({ error: 'Необходимо указать ad_id или seller_id' });
    }
    
    if (userId === sellerId) {
      return res.status(400).json({ error: 'Вы не можете писать самому себе' });
    }
    
    // Проверяем, существует ли уже чат (с учетом того, что ad_id может быть NULL)
    let existingChats;
    if (adId) {
      // Для чатов с объявлением ищем по ad_id, buyer_id и seller_id
      [existingChats] = await db.execute(
        'SELECT * FROM chats WHERE ad_id = ? AND buyer_id = ? AND seller_id = ?',
        [adId, userId, sellerId]
      );
    } else {
      // Для чатов без объявления ищем по buyer_id и seller_id с NULL ad_id
      // Также проверяем, что нет чата с объявлением между этими пользователями
      [existingChats] = await db.execute(
        'SELECT * FROM chats WHERE ad_id IS NULL AND buyer_id = ? AND seller_id = ?',
        [userId, sellerId]
      );
      
      // Если не нашли чат без объявления, проверяем, есть ли вообще чат между этими пользователями
      if (existingChats.length === 0) {
        const [anyChat] = await db.execute(
          'SELECT * FROM chats WHERE buyer_id = ? AND seller_id = ? LIMIT 1',
          [userId, sellerId]
        );
        if (anyChat.length > 0) {
          existingChats = anyChat;
        }
      }
    }
    
    if (existingChats.length > 0) {
      return res.json(existingChats[0]);
    }
    
    // Создаем новый чат (ad_id может быть NULL)
    const [result] = await db.execute(
      'INSERT INTO chats (ad_id, buyer_id, seller_id) VALUES (?, ?, ?)',
      [adId, userId, sellerId]
    );
    
    const [newChat] = await db.execute('SELECT * FROM chats WHERE id = ?', [result.insertId]);
    res.json(newChat[0]);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Получить сообщения чата
router.get('/chats/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    
    // Проверяем, что пользователь является участником чата
    const [chats] = await db.execute(
      'SELECT * FROM chats WHERE id = ? AND (buyer_id = ? OR seller_id = ?)',
      [chatId, userId, userId]
    );
    
    if (chats.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const [messages] = await db.execute(`
      SELECT 
        m.id,
        m.chat_id,
        m.sender_id,
        m.message,
        m.image_url,
        m.reply_to,
        m.created_at,
        u.name as sender_name,
        r.sender_id as reply_to_sender_id,
        r.message as reply_to_message,
        r.image_url as reply_to_image_url,
        ru.name as reply_to_sender_name
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      LEFT JOIN messages r ON m.reply_to = r.id
      LEFT JOIN users ru ON r.sender_id = ru.id
      WHERE m.chat_id = ?
      ORDER BY m.created_at ASC
    `, [chatId]);
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Получить информацию о чате
router.get('/chats/:chatId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    
    const [chats] = await db.execute(`
      SELECT 
        c.*,
        COALESCE(a.title, 'Общий чат') as ad_title,
        a.image_url as ad_image,
        a.price as ad_price,
        a.description as ad_description,
        CASE 
          WHEN c.buyer_id = ? THEN seller.name
          ELSE buyer.name
        END as other_user_name,
        CASE 
          WHEN c.buyer_id = ? THEN seller.id
          ELSE buyer.id
        END as other_user_id,
        CASE 
          WHEN c.buyer_id = ? THEN seller.phone
          ELSE buyer.phone
        END as other_user_phone
      FROM chats c
      LEFT JOIN products a ON c.ad_id = a.id
      INNER JOIN users buyer ON c.buyer_id = buyer.id
      INNER JOIN users seller ON c.seller_id = seller.id
      WHERE c.id = ? AND (c.buyer_id = ? OR c.seller_id = ?)
    `, [userId, userId, userId, chatId, userId, userId]);
    
    if (chats.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    let imageUrl = chats[0].ad_image;
    if (imageUrl) {
      try {
        const parsed = JSON.parse(imageUrl);
        if (Array.isArray(parsed) && parsed.length > 0) {
          imageUrl = parsed[0];
        }
      } catch {
        // Если не JSON, используем как есть
      }
    }
    
    res.json({
      ...chats[0],
      ad_image: imageUrl || null
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// POST /api/messages - создать сообщение (fallback если socket не работает)
router.post('/', authenticateToken, uploadMessage.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId, message, replyTo } = req.body;
    const imageFile = req.file;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId обязателен' });
    }

    if (!message?.trim() && !imageFile) {
      return res.status(400).json({ error: 'Сообщение или изображение обязательны' });
    }

    // Проверяем, что пользователь является участником чата
    const [chats] = await db.execute(
      'SELECT * FROM chats WHERE id = ? AND (buyer_id = ? OR seller_id = ?)',
      [chatId, userId, userId]
    );

    if (chats.length === 0) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Если есть replyTo, проверяем что сообщение существует
    let replyToId = null;
    if (replyTo) {
      const [replyMessages] = await db.execute(
        'SELECT id, sender_id, message FROM messages WHERE id = ? AND chat_id = ?',
        [replyTo, chatId]
      );
      if (replyMessages.length > 0) {
        replyToId = parseInt(replyTo);
      }
    }

    const imageUrl = imageFile ? `/uploads/messages/${imageFile.filename}` : null;
    const messageText = message?.trim() || null;

    // Создаем сообщение
    const [result] = await db.execute(
      'INSERT INTO messages (chat_id, sender_id, message, image_url, reply_to) VALUES (?, ?, ?, ?, ?)',
      [chatId, userId, messageText, imageUrl, replyToId]
    );

    // Обновляем время последнего обновления чата
    await db.execute(
      'UPDATE chats SET updated_at = NOW() WHERE id = ?',
      [chatId]
    );

    // Получаем созданное сообщение с информацией о reply
    const [messages] = await db.execute(`
      SELECT 
        m.id,
        m.chat_id,
        m.sender_id,
        m.message,
        m.image_url,
        m.reply_to,
        m.created_at,
        u.name as sender_name,
        r.sender_id as reply_to_sender_id,
        r.message as reply_to_message,
        r.image_url as reply_to_image_url,
        ru.name as reply_to_sender_name
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      LEFT JOIN messages r ON m.reply_to = r.id
      LEFT JOIN users ru ON r.sender_id = ru.id
      WHERE m.id = ?
    `, [result.insertId]);

    res.json(messages[0]);
  } catch (error) {
    console.error('Ошибка создания сообщения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// DELETE /api/messages/chats/:chatId - удалить чат (только участники чата)
router.delete('/chats/:chatId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    if (isNaN(parseInt(chatId))) {
      return res.status(400).json({ error: 'Неверный ID чата' });
    }

    // Проверяем, что пользователь является участником чата
    const [chats] = await db.execute(
      'SELECT * FROM chats WHERE id = ? AND (buyer_id = ? OR seller_id = ?)',
      [chatId, userId, userId]
    );

    if (chats.length === 0) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Удаляем чат (сообщения удалятся автоматически благодаря ON DELETE CASCADE)
    await db.execute('DELETE FROM chats WHERE id = ?', [chatId]);

    res.json({ message: 'Чат успешно удален' });
  } catch (error) {
    console.error('Ошибка удаления чата:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
