const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const normalizePhone = (phone) => (phone || '').replace(/\s+/g, '');
const phoneRegex = /^\+?[0-9]{10,15}$/;

const generateSmsCode = () => {
  const code = Math.floor(1000 + Math.random() * 9000);
  return String(code);
};

const sendSmsCode = async (phone, code) => {
  // Заглушка - всегда используем код 1234
  console.log(`[SMS Mock] Код для ${phone}: 1234 (игнорируем реальную отправку)`);
  return true;
};

const saveSmsCode = async (phone, code) => {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await db.execute(
    'INSERT INTO sms_codes (phone, code, expires_at) VALUES (?, ?, ?)',
    [phone, code, expiresAt]
  );
};

const verifySmsCode = async (phone, smsCode) => {
  // Всегда принимаем код 1234
  if (smsCode === '1234') {
    console.log(`[SMS Mock] Код 1234 принят для ${phone}`);
    return { ok: true };
  }
  
  // Если не 1234 - проверяем в БД (на случай если реальные SMS включены)
  const [rows] = await db.execute(
    `SELECT id, code, expires_at, is_used
     FROM sms_codes
     WHERE phone = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone]
  );

  if (!rows.length) {
    return { ok: false, error: 'Код не найден' };
  }

  const record = rows[0];
  if (record.is_used) {
    return { ok: false, error: 'Код уже использован' };
  }
  if (new Date(record.expires_at) < new Date()) {
    return { ok: false, error: 'Срок действия кода истек' };
  }
  if (record.code !== smsCode) {
    return { ok: false, error: 'Неверный проверочный код' };
  }

  await db.execute('UPDATE sms_codes SET is_used = 1 WHERE id = ?', [record.id]);
  return { ok: true };
};

// Настройка хранения для аватаров
const uploadsDir = path.join(__dirname, '../public/uploads');
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

const upload = multer({ storage });

// Отправка SMS кода
router.post('/send-sms', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Номер телефона обязателен' });
    }

    const phoneNorm = normalizePhone(phone);
    if (!phoneRegex.test(phoneNorm)) {
      return res.status(400).json({ error: 'Неверный формат телефона' });
    }

    const code = generateSmsCode();
    await saveSmsCode(phoneNorm, code);
    await sendSmsCode(phoneNorm, code);

    res.json({ message: 'Код отправлен' });
  } catch (error) {
    console.error('Ошибка отправки SMS:', error);
    res.status(500).json({ error: error.message || 'Ошибка отправки SMS' });
  }
});

// Регистрация (поддержка multipart для аватара)
router.post('/register', upload.single('avatar'), async (req, res) => {
  try {
    const { name, last_name, password, role = 'buyer', phone, smsCode } = req.body;
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Валидация
    if (!name || !last_name || !password || !phone || !smsCode) {
      return res.status(400).json({
        error: 'Поля name, last_name, phone, password и smsCode обязательны'
      });
    }

    // Проверка формата телефона (простая: 10-15 цифр, допускаем ведущий +)
    const phoneNorm = normalizePhone(phone);
    if (!phoneRegex.test(phoneNorm)) {
      return res.status(400).json({ error: 'Неверный формат телефона' });
    }

    const smsCheck = await verifySmsCode(phoneNorm, smsCode);
    if (!smsCheck.ok) {
      return res.status(400).json({ error: smsCheck.error });
    }

    // Проверка минимальной длины пароля
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Пароль должен содержать минимум 6 символов' 
      });
    }

    // Проверка роли
    const allowedRoles = ['buyer', 'seller', 'admin'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Роль должна быть: buyer, seller или admin' 
      });
    }

    // Проверка существования пользователя
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE phone = ?',
      [phoneNorm]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Пользователь с таким телефоном уже существует' });
    }

    // Хеширование пароля
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Авто-email для совместимости с колонкой email (уникальный на базе телефона)
    const autoEmail = `user_${phoneNorm.replace(/\D/g, '')}@auto.local`;

    // Если создается админ, используем пароль из .env или хешируем переданный
    let finalPassword = hashedPassword;
    if (role === 'admin' && process.env.ADMIN_PASSWORD) {
      const adminPassword = process.env.ADMIN_PASSWORD;
      const saltRounds = 10;
      finalPassword = await bcrypt.hash(adminPassword, saltRounds);
    }

    // Создание пользователя
    const [result] = await db.execute(
      'INSERT INTO users (name, last_name, email, phone, password, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, last_name, autoEmail, phoneNorm, finalPassword, role || 'buyer', avatarUrl]
    );

    // Генерация JWT токена
    const token = jwt.sign(
      { 
        id: result.insertId, 
        email: autoEmail, 
        phone: phoneNorm,
        role: role 
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
      }
    );

    // Создаем чат с админом для нового пользователя (если не админ)
    if (role !== 'admin') {
      try {
        // Находим админа
        const [admins] = await db.execute(
          'SELECT id FROM users WHERE phone = ? AND role = ?',
          ['+71262342332', 'admin']
        );
        
        if (admins.length > 0) {
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
            const [adResult] = await db.execute(
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
            supportAdId = adResult.insertId;
          } else {
            supportAdId = supportAds[0].id;
          }
          
          // Проверяем, есть ли уже чат с админом (чтобы не создавать дубликат)
          const [existingChats] = await db.execute(
            'SELECT id FROM chats WHERE ad_id = ? AND buyer_id = ? AND seller_id = ? LIMIT 1',
            [supportAdId, result.insertId, adminId]
          );
          
          if (existingChats.length === 0) {
            // Создаем чат с админом
            await db.execute(
              'INSERT INTO chats (ad_id, buyer_id, seller_id) VALUES (?, ?, ?)',
              [supportAdId, result.insertId, adminId]
            );
          }
          console.log('Создан чат поддержки для нового пользователя', result.insertId);
        }
      } catch (err) {
        // Игнорируем ошибки создания чата поддержки
        console.error('Ошибка создания чата поддержки:', err);
      }
    }

    // Ответ без пароля
    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      token,
      user: {
        id: result.insertId,
        name,
        last_name,
        email: autoEmail,
        phone: phoneNorm,
        role,
        avatar_url: avatarUrl
      }
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      message: error.message || 'Неизвестная ошибка',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Быстрый вход для админа (требует пароль из .env)
router.post('/quick-login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ error: 'Поля phone и password обязательны' });
    }

    // Получаем админские данные из переменных окружения
    const adminPhone = process.env.ADMIN_PHONE || '+71262342332';
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return res.status(500).json({ error: 'ADMIN_PASSWORD не настроен в .env' });
    }
    
    // Нормализуем номера (убираем пробелы и все кроме цифр, добавляем +)
    const normalizePhone = (p) => {
      if (!p) return '';
      // Убираем пробелы и все кроме цифр
      let digits = p.replace(/\s+/g, '').replace(/[^\d]/g, '');
      // Всегда добавляем + в начале
      return '+' + digits;
    };
    
    const phoneNorm = normalizePhone(phone);
    const adminPhoneNorm = normalizePhone(adminPhone);
    
    console.log('Quick login attempt:', { 
      originalPhone: phone, 
      normalizedPhone: phoneNorm, 
      adminPhoneFromEnv: adminPhone, 
      normalizedAdminPhone: adminPhoneNorm,
      match: phoneNorm === adminPhoneNorm
    });
    
    // Проверяем совпадение номера телефона
    if (phoneNorm !== adminPhoneNorm) {
      console.log('Phone does not match admin phone:', phoneNorm, '!==', adminPhoneNorm);
      return res.status(401).json({ error: 'Access denied' });
    }

    // Проверяем пароль
    if (password !== adminPassword) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }
    
    // Ищем админа по телефону - пробуем оба варианта (+71262342332 и без +)
    let user = null;
    const searchPhones = [adminPhoneNorm, adminPhoneNorm.replace('+', '')];
    
    for (const searchPhone of searchPhones) {
      const [users] = await db.execute(
        'SELECT id, name, last_name, email, phone, role, avatar_url FROM users WHERE phone = ? AND role = ?',
        [searchPhone, 'admin']
      );
      if (users.length > 0) {
        user = users[0];
        console.log('Found admin user with phone:', searchPhone);
        break;
      }
    }

    if (!user) {
      console.log('Admin user not found with phone:', searchPhones);
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    console.log('Admin user found:', user.id, user.name);
    
    // Генерируем JWT токен
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
      }
    );

    res.json({
      message: 'Авторизация успешна',
      token,
      user: {
        id: user.id,
        name: user.name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Ошибка быстрого входа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Логин
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Поля phone и password обязательны' });
    }

    // Нормализуем телефон (убираем пробелы)
    const phoneNorm = phone.replace(/\s+/g, '');

    // Ищем пользователя по телефону
    const [rows] = await db.execute(
      'SELECT id, name, last_name, email, phone, password, role, avatar_url FROM users WHERE phone = ?',
      [phoneNorm]
    );

    if (!rows.length) {
      return res.status(404).json({ 
        error: 'USER_NOT_FOUND',
        message: 'Вы еще не зарегистрированы в системе, пожалуйста зарегистрируйтесь' 
      });
    }

    const user = rows[0];

    // Если это админ и ADMIN_PASSWORD установлен в .env, проверяем пароль из .env
    if (user.role === 'admin' && process.env.ADMIN_PASSWORD) {
      if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Неверный телефон или пароль' });
      }
    } else {
      // Обычная проверка пароля через bcrypt
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Неверный телефон или пароль' });
      }
    }

    // Генерация JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    // Убеждаемся, что у пользователя есть чат с админом (если не админ)
    if (user.role !== 'admin') {
      try {
        // Находим админа
        const [admins] = await db.execute(
          'SELECT id FROM users WHERE phone = ? AND role = ?',
          ['+71262342332', 'admin']
        );
        
        if (admins.length > 0) {
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
            const [adResult] = await db.execute(
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
            supportAdId = adResult.insertId;
          } else {
            supportAdId = supportAds[0].id;
          }
          
          // Проверяем, есть ли уже чат с админом (чтобы не создавать дубликат)
          const [existingChats] = await db.execute(
            'SELECT id FROM chats WHERE ad_id = ? AND buyer_id = ? AND seller_id = ? LIMIT 1',
            [supportAdId, user.id, adminId]
          );
          
          if (existingChats.length === 0) {
            // Создаем чат с админом
            await db.execute(
              'INSERT INTO chats (ad_id, buyer_id, seller_id) VALUES (?, ?, ?)',
              [supportAdId, user.id, adminId]
            );
            console.log('Создан чат поддержки для пользователя', user.id);
          }
        }
      } catch (err) {
        // Игнорируем ошибки создания чата поддержки
        console.error('Ошибка создания чата поддержки:', err);
      }
    }

    // Ответ без пароля
    res.json({
      message: 'Успешный вход',
      token,
      user: {
        id: user.id,
        name: user.name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Ошибка логина:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      message: error.message || 'Неизвестная ошибка',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/auth/user/:id - получить информацию о пользователе
router.get('/user/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Неверный ID пользователя' });
    }

    const [users] = await db.execute(
      'SELECT id, name, last_name, phone, role, created_at, is_banned, status, avatar_url FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      name: user.name,
      last_name: user.last_name,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
      is_banned: user.is_banned || false,
      status: user.status || null,
      avatar_url: user.avatar_url || null
    });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/auth/user/:id/ban - забанить/разбанить пользователя (только для админа)
const { authenticateToken, authorizeRole } = require('../middleware/auth');
router.post('/user/:id/ban', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { banned } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Неверный ID пользователя' });
    }

    if (typeof banned !== 'boolean') {
      return res.status(400).json({ error: 'Поле banned должно быть boolean' });
    }

    // Проверяем, что пользователь существует
    const [users] = await db.execute('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Нельзя забанить админа
    if (users[0].role === 'admin') {
      return res.status(403).json({ error: 'Нельзя забанить администратора' });
    }

    // Обновляем статус бана
    await db.execute(
      'UPDATE users SET is_banned = ? WHERE id = ?',
      [banned ? 1 : 0, userId]
    );

    res.json({
      message: banned ? 'Пользователь забанен' : 'Пользователь разбанен',
      user_id: userId,
      is_banned: banned
    });
  } catch (error) {
    console.error('Ошибка бана пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PUT /api/auth/admin/set-password - установить пароль администратору из .env
router.put('/admin/set-password', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const adminPhone = process.env.ADMIN_PHONE || '+71262342332';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return res.status(500).json({ error: 'ADMIN_PASSWORD не установлен в .env файле' });
    }

    // Нормализуем телефон
    const phoneNorm = adminPhone.replace(/\s+/g, '');

    // Проверяем, что пользователь с таким телефоном существует и является админом
    const [users] = await db.execute(
      'SELECT id, role FROM users WHERE phone = ? AND role = ?',
      [phoneNorm, 'admin']
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Администратор с таким телефоном не найден' });
    }

    // Хешируем пароль из .env
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Обновляем пароль
    await db.execute(
      'UPDATE users SET password = ? WHERE phone = ? AND role = ?',
      [hashedPassword, phoneNorm, 'admin']
    );

    res.json({
      message: 'Пароль администратора успешно установлен из .env',
      phone: phoneNorm
    });
  } catch (error) {
    console.error('Ошибка установки пароля администратора:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PUT /api/auth/change-password - изменить пароль
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Текущий и новый пароль обязательны' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Новый пароль должен содержать минимум 6 символов' });
    }

    // Получаем текущий пароль пользователя
    const [users] = await db.execute('SELECT password FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем текущий пароль
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный текущий пароль' });
    }

    // Хешируем новый пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Обновляем пароль
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Ошибка изменения пароля:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PUT /api/auth/change-phone - изменить номер телефона
router.put('/change-phone', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone, smsCode } = req.body;

    if (!phone || !smsCode) {
      return res.status(400).json({ error: 'Номер телефона и код подтверждения обязательны' });
    }

    // Проверка формата телефона
    const phoneNorm = phone.replace(/\s+/g, '');
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phoneNorm)) {
      return res.status(400).json({ error: 'Неверный формат телефона' });
    }

    const smsCheck = await verifySmsCode(phoneNorm, smsCode);
    if (!smsCheck.ok) {
      return res.status(400).json({ error: smsCheck.error });
    }

    // Проверяем, не используется ли этот номер другим пользователем
    const [existingUsers] = await db.execute('SELECT id FROM users WHERE phone = ? AND id != ?', [phoneNorm, userId]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Номер телефона уже используется другим пользователем' });
    }

    // Обновляем номер телефона
    await db.execute('UPDATE users SET phone = ? WHERE id = ?', [phoneNorm, userId]);

    // Получаем обновленного пользователя
    const [updatedUsers] = await db.execute('SELECT id, name, last_name, email, phone, role, avatar_url FROM users WHERE id = ?', [userId]);
    
    res.json({ 
      message: 'Номер телефона успешно изменен',
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error('Ошибка изменения номера телефона:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
