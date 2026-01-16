require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  },
  transports: ['websocket'], // Используем только websocket для быстрого подключения
  pingTimeout: 60000, // Увеличиваем таймаут для стабильности
  pingInterval: 25000 // Интервал пинга
});
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
const authRoutes = require('./routes/auth');
const adsRoutes = require('./routes/ads');
const reviewsRoutes = require('./routes/reviews');
const messagesRoutes = require('./routes/messages');
const bannersRoutes = require('./routes/banners');
const welcomeModalRoutes = require('./routes/welcomeModal');
const adminRoutes = require('./routes/admin');
app.use('/api/auth', authRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/welcome-modal', welcomeModalRoutes);
app.use('/api/admin', adminRoutes);

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Trado API is running' });
});

// Socket.IO connection handling
const jwt = require('jsonwebtoken');
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    console.log('Socket auth error: No token provided');
    return next(new Error('Authentication error: No token'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    console.log(`Socket authenticated: userId=${socket.userId}, role=${socket.userRole}`);
    next();
  } catch (err) {
    console.log('Socket auth error:', err.message);
    next(new Error('Authentication error: ' + err.message));
  }
};

io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);
  
  // Присоединяем пользователя к комнате с его ID
  socket.join(`user_${socket.userId}`);
  
  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
  });
  
  socket.on('leave_chat', (chatId) => {
    socket.leave(`chat_${chatId}`);
  });
  
  socket.on('send_message', async (data) => {
    try {
      const db = require('./config/db');
      
      // Проверяем reply_to если есть
      let replyToId = null;
      if (data.replyTo) {
        const [replyMessages] = await db.execute(
          'SELECT id FROM messages WHERE id = ? AND chat_id = ?',
          [data.replyTo, data.chatId]
        );
        if (replyMessages.length > 0) {
          replyToId = parseInt(data.replyTo);
        }
      }
      
      // Сохраняем сообщение в БД
      const [result] = await db.execute(
        'INSERT INTO messages (chat_id, sender_id, message, reply_to, created_at) VALUES (?, ?, ?, ?, NOW())',
        [data.chatId, socket.userId, data.message, replyToId]
      );
      
      // Получаем информацию о чате
      const [chats] = await db.execute(
        'SELECT * FROM chats WHERE id = ?',
        [data.chatId]
      );
      
      if (chats.length > 0) {
        const chat = chats[0];
        const recipientId = chat.buyer_id === socket.userId ? chat.seller_id : chat.buyer_id;
        
        // Получаем имя отправителя
        const [users] = await db.execute(
          'SELECT name FROM users WHERE id = ?',
          [socket.userId]
        );
        const senderName = users.length > 0 ? users[0].name : 'Пользователь';
        
        // Получаем сохраненное сообщение из БД с полной информацией включая reply
        const [savedMessages] = await db.execute(`
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
        
        const saved = savedMessages[0];
        const messageData = saved ? {
          id: saved.id,
          chat_id: saved.chat_id,
          sender_id: saved.sender_id,
          message: saved.message,
          image_url: saved.image_url,
          reply_to: saved.reply_to,
          created_at: saved.created_at,
          sender_name: saved.sender_name || senderName,
          reply_to_sender_id: saved.reply_to_sender_id,
          reply_to_message: saved.reply_to_message,
          reply_to_image_url: saved.reply_to_image_url,
          reply_to_sender_name: saved.reply_to_sender_name
        } : {
          id: result.insertId,
          chat_id: data.chatId,
          sender_id: socket.userId,
          message: data.message,
          created_at: new Date().toISOString(),
          sender_name: senderName,
          reply_to: replyToId
        };
        
        // Обновляем время последнего обновления чата
        await db.execute(
          'UPDATE chats SET updated_at = NOW() WHERE id = ?',
          [data.chatId]
        );
        
        // Отправляем сообщение всем в чате
        io.to(`chat_${data.chatId}`).emit('new_message', messageData);
        
        // Отправляем уведомление пользователю, если он не в чате
        io.to(`user_${recipientId}`).emit('message_notification', {
          chat_id: data.chatId,
          message: data.message,
          sender_id: socket.userId
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// Экспортируем io для использования в роутах
app.set('io', io);

// Инициализация таблицы ad_clicks при старте сервера
const initializeAdClicksTable = async () => {
  try {
    const db = require('./config/db');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ad_clicks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        banner_id INT NOT NULL,
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id INT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        referrer VARCHAR(500) NULL,
        FOREIGN KEY (banner_id) REFERENCES banners(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_banner_clicked (banner_id, clicked_at),
        INDEX idx_clicked_at (clicked_at)
      )
    `);
    console.log('✓ Таблица ad_clicks инициализирована');
  } catch (error) {
    console.error('⚠ Ошибка инициализации таблицы ad_clicks:', error.message);
    if (error.code !== 'ER_TABLE_EXISTS_ERROR') {
      console.warn('Таблица ad_clicks будет недоступна до создания вручную');
    }
  }
};

const initializeSmsCodesTable = async () => {
  try {
    const db = require('./config/db');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sms_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sms_phone (phone),
        INDEX idx_sms_expires (expires_at)
      )
    `);
    console.log('✓ Таблица sms_codes инициализирована');
  } catch (error) {
    console.error('⚠ Ошибка инициализации таблицы sms_codes:', error.message);
    if (error.code !== 'ER_TABLE_EXISTS_ERROR') {
      console.warn('Таблица sms_codes будет недоступна до создания вручную');
    }
  }
};

const initializeUsersLastNameColumn = async () => {
  try {
    const db = require('./config/db');
    const [rows] = await db.execute(
      `SELECT COUNT(*) as count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = 'last_name'`
    );
    if (rows[0].count === 0) {
      await db.execute(`ALTER TABLE users ADD COLUMN last_name VARCHAR(100) NULL AFTER name`);
      console.log('✓ Колонка last_name добавлена в users');
    }
  } catch (error) {
    console.error('⚠ Ошибка добавления last_name в users:', error.message);
  }
};

// Инициализируем таблицы при старте
initializeAdClicksTable();
initializeSmsCodesTable();
initializeUsersLastNameColumn();

server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});