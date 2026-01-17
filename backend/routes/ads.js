const express = require('express');
const router = express.Router();
const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Хранилище для фото объявлений
const uploadsDir = path.join(__dirname, '../public/uploads/ads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB максимум на файл
});

// Для множественных файлов
const uploadMultiple = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 } // Максимум 10 файлов
});

// GET /api/ads - список объявлений с средним рейтингом
router.get('/', async (_req, res) => {
  try {
    // Сначала проверяем существует ли таблица promotions
    let hasPromotions = true;
    try {
      await db.execute('SELECT 1 FROM promotions LIMIT 1');
    } catch (err) {
      hasPromotions = false;
    }

    // Если promotions нет - упрощенный запрос
    const query = hasPromotions
      ? `SELECT 
          p.id, 
          p.title, 
          p.description, 
          p.price, 
          p.image_url,
          p.user_id,
          p.category_id,
          c.name as category_name,
          u.name as seller_name,
          COALESCE(AVG(r.rating), 0) as average_rating,
          COUNT(r.id) as reviews_count,
          MAX(pr.promoted_at) as last_promoted_at,
          CASE 
            WHEN MAX(pr.promoted_at) IS NOT NULL 
              AND DATE_ADD(MAX(pr.promoted_at), INTERVAL 7 DAY) >= NOW()
            THEN 1 
            ELSE 0 
          END as is_promoted
        FROM products p
        LEFT JOIN reviews r ON p.id = r.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN promotions pr ON p.id = pr.product_id 
          AND DATE_ADD(pr.promoted_at, INTERVAL 7 DAY) >= NOW()
        WHERE p.title NOT LIKE '%Поддержка%'
        GROUP BY p.id
        ORDER BY is_promoted DESC, last_promoted_at DESC, p.id DESC 
        LIMIT 100`
      : `SELECT 
          p.id, 
          p.title, 
          p.description, 
          p.price, 
          p.image_url,
          p.user_id,
          p.category_id,
          c.name as category_name,
          u.name as seller_name,
          COALESCE(AVG(r.rating), 0) as average_rating,
          COUNT(r.id) as reviews_count,
          NULL as last_promoted_at,
          0 as is_promoted
        FROM products p
        LEFT JOIN reviews r ON p.id = r.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.title NOT LIKE '%Поддержка%'
        GROUP BY p.id
        ORDER BY p.id DESC 
        LIMIT 100`;

    const [rows] = await db.execute(query);
    
    // Преобразуем результаты
    const products = rows.map(row => ({
      id: row.id,
      title: row.title,
      category_id: row.category_id,
      category_name: row.category_name,
      description: row.description,
      price: row.price,
      image_url: row.image_url,
      user_id: row.user_id,
      seller_name: row.seller_name,
      average_rating: parseFloat(row.average_rating).toFixed(1),
      reviews_count: row.reviews_count
    }));
    
    res.json(products);
  } catch (error) {
    console.error('Ошибка получения объявлений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/ads - создать объявление (требуется авторизация)
router.post('/', authenticateToken, uploadMultiple.array('images', 10), async (req, res) => {
  try {
    const { title, phone, price, description = '', category } = req.body;
    const userId = req.user.id; // Получаем user_id из токена

    if (!title || !phone || !price) {
      return res.status(400).json({ error: 'Поля title, phone, price обязательны' });
    }

    const phoneNorm = phone.replace(/\s+/g, '');
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phoneNorm)) {
      return res.status(400).json({ error: 'Неверный формат телефона' });
    }

    const priceNum = parseFloat(String(price).replace(',', '.'));
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'Неверная цена' });
    }

    // Обрабатываем множественные изображения
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => `/uploads/ads/${file.filename}`);
    } else if (req.file) {
      // Для обратной совместимости (если отправлен один файл)
      imageUrls = [`/uploads/ads/${req.file.filename}`];
    }

    // Сохраняем массив изображений в JSON (если фото нет — сохраняем null)
    const imageUrlJson = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;

    let categoryId;
    const catName = (category || 'Default').trim() || 'Default';
    const [[catRow]] = await db.execute('SELECT id FROM categories WHERE name = ? LIMIT 1', [catName]);
    if (catRow?.id) {
      categoryId = catRow.id;
    } else {
      const [catRes] = await db.execute('INSERT INTO categories (name) VALUES (?)', [catName]);
      categoryId = catRes.insertId;
    }

    const [result] = await db.execute(
      'INSERT INTO products (user_id, category_id, title, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, categoryId, title, `Тел: ${phoneNorm}\n${description}`, priceNum, imageUrlJson]
    );

    res.status(201).json({
      id: result.insertId,
      title,
      description,
      price: priceNum,
      image_url: imageUrls[0] || null, // Первое изображение для обратной совместимости
      image_urls: imageUrls, // Массив всех изображений (может быть пустым)
    });
  } catch (error) {
    console.error('Ошибка создания объявления:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// DELETE /api/ads/:id - удалить объявление (можно удалить свой пост или админ может удалить любой)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const adId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    if (isNaN(adId)) {
      return res.status(400).json({ error: 'Неверный ID объявления' });
    }

    // Проверяем существование объявления
    const [rows] = await db.execute(
      'SELECT id, image_url, user_id FROM products WHERE id = ?',
      [adId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    const ad = rows[0];

    // Проверяем права: можно удалить только свой пост или админ может удалить любой
    if (ad.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Вы можете удалять только свои объявления' });
    }

    // Удаляем файлы изображений
    try {
      let imageUrls = [];
      if (ad.image_url) {
        // Проверяем, это JSON массив или строка
        try {
          imageUrls = JSON.parse(ad.image_url);
        } catch {
          // Если не JSON, значит это одно изображение
          imageUrls = [ad.image_url];
        }

        // Удаляем все файлы
        imageUrls.forEach(imageUrl => {
          const imagePath = path.join(__dirname, '../public', imageUrl);
          if (fs.existsSync(imagePath)) {
            try {
              fs.unlinkSync(imagePath);
            } catch (err) {
              console.error('Ошибка удаления файла изображения:', err);
            }
          }
        });
      }
    } catch (err) {
      console.error('Ошибка удаления файлов:', err);
    }

    // Удаляем связанные данные перед удалением товара
    
    // 1. Удаляем сообщения в чатах, связанных с этим объявлением
    try {
      const [chatsForAd] = await db.execute('SELECT id FROM chats WHERE ad_id = ?', [adId]);
      const chatIds = chatsForAd.map(chat => chat.id);
      if (chatIds.length > 0) {
        const placeholders = chatIds.map(() => '?').join(',');
        await db.execute(`DELETE FROM messages WHERE chat_id IN (${placeholders})`, chatIds);
      }
    } catch (err) {
      console.error('Ошибка удаления сообщений:', err);
    }
    
    // 2. Удаляем чаты, связанные с этим объявлением
    try {
      await db.execute('DELETE FROM chats WHERE ad_id = ?', [adId]);
    } catch (err) {
      console.error('Ошибка удаления чатов:', err);
    }
    
    // 3. Удаляем отзывы для этого товара
    try {
      await db.execute('DELETE FROM reviews WHERE product_id = ?', [adId]);
    } catch (err) {
      console.error('Ошибка удаления отзывов:', err);
    }
    
    // 4. Теперь можно безопасно удалить товар
    await db.execute('DELETE FROM products WHERE id = ?', [adId]);

    res.json({ message: 'Объявление успешно удалено' });
  } catch (error) {
    console.error('Ошибка удаления объявления:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/ads/:id/promote - продвинуть объявление (нельзя продвинуть свое объявление, максимум 3 раза в день)
router.post('/:id/promote', authenticateToken, async (req, res) => {
  try {
    const adId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(adId)) {
      return res.status(400).json({ error: 'Неверный ID объявления' });
    }

    // Получаем информацию об объявлении
    const [rows] = await db.execute(
      'SELECT id, user_id, title FROM products WHERE id = ?',
      [adId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    const ad = rows[0];

    // Проверяем, что пользователь не продвигает свое объявление
    if (ad.user_id === userId) {
      return res.status(403).json({ error: 'Вы не можете продвигать свои собственные объявления' });
    }

    // Проверяем количество продвижений пользователя за сегодня
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [todayPromotions] = await db.execute(
      `SELECT COUNT(*) as count FROM promotions pr
       JOIN products p ON pr.product_id = p.id
       WHERE p.user_id = ? AND pr.promoted_at >= ? AND pr.promoted_at <= ?`,
      [userId, todayStart, todayEnd]
    );

    const promotionCount = todayPromotions[0]?.count || 0;

    if (promotionCount >= 3) {
      return res.status(403).json({ 
        error: 'Вы достигли лимита продвижений на сегодня (3 объявления). Попробуйте завтра.' 
      });
    }

    // Проверяем, не продвинул ли пользователь уже это объявление сегодня
    const [existingPromotion] = await db.execute(
      `SELECT id FROM promotions 
       WHERE user_id = ? AND product_id = ? AND promoted_at >= ? AND promoted_at <= ?`,
      [userId, adId, todayStart, todayEnd]
    );

    if (existingPromotion.length > 0) {
      return res.status(403).json({ 
        error: 'Вы уже продвинули это объявление сегодня. Каждое объявление можно продвигать один раз в день.' 
      });
    }

    // Создаем запись о продвижении (продвижение действует 7 дней с момента создания)
    await db.execute(
      'INSERT INTO promotions (user_id, product_id, promoted_at) VALUES (?, ?, NOW())',
      [userId, adId]
    );

    const remainingPromotions = 3 - (promotionCount + 1);
    const promotedUntil = new Date();
    promotedUntil.setDate(promotedUntil.getDate() + 7);

    res.json({ 
      message: 'Объявление успешно продвинуто',
      promoted_until: promotedUntil,
      remaining_promotions: remainingPromotions,
      ad: {
        id: ad.id,
        title: ad.title
      }
    });
  } catch (error) {
    console.error('Ошибка продвижения объявления:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// GET /api/ads/seller/:userId - получить все объявления продавца
router.get('/seller/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Неверный ID продавца' });
    }

    const [rows] = await db.execute(
      `SELECT 
        p.id, 
        p.title, 
        p.description, 
        p.price, 
        p.image_url,
        p.user_id,
        p.category_id,
        c.name as category_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as reviews_count
      FROM products p
      LEFT JOIN reviews r ON p.id = r.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.user_id = ? AND p.title NOT LIKE '%Поддержка%'
      GROUP BY p.id
      ORDER BY p.id DESC`
    , [userId]);
    
    const products = rows.map(row => ({
      id: row.id,
      title: row.title,
      category_id: row.category_id,
      category_name: row.category_name,
      description: row.description,
      price: row.price,
      image_url: row.image_url,
      user_id: row.user_id,
      average_rating: parseFloat(row.average_rating).toFixed(1),
      reviews_count: row.reviews_count
    }));
    
    res.json(products);
  } catch (error) {
    console.error('Ошибка получения объявлений продавца:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
