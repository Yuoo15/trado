const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

// Настройка хранения файлов для аватарок
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения (JPEG, PNG, GIF, WebP)'));
    }
  },
});

// GET /api/profile - получить профиль текущего пользователя
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [[user]] = await db.execute(
      'SELECT id, name, last_name, email, phone, role, avatar_url, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PATCH /api/profile/status - обновить статус
router.patch('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;

    // Валидация
    if (status && status.length > 200) {
      return res.status(400).json({ error: 'Статус не может быть длиннее 200 символов' });
    }

    await db.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      [status || null, userId]
    );

    res.json({ message: 'Статус обновлен', status: status || null });
  } catch (error) {
    console.error('Ошибка обновления статуса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/profile/avatar - загрузить/обновить аватарку
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    // Получаем старую аватарку для удаления
    const [[user]] = await db.execute(
      'SELECT avatar_url FROM users WHERE id = ?',
      [userId]
    );

    const newAvatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Обновляем аватарку в БД
    await db.execute(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [newAvatarUrl, userId]
    );

    // Удаляем старую аватарку (если существует и не дефолтная)
    if (user && user.avatar_url && user.avatar_url.startsWith('/uploads/avatars/')) {
      const oldAvatarPath = path.join(__dirname, '..', user.avatar_url);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    res.json({ 
      message: 'Аватарка обновлена', 
      avatar_url: newAvatarUrl 
    });
  } catch (error) {
    console.error('Ошибка загрузки аватарки:', error);
    
    // Удаляем загруженный файл в случае ошибки
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// DELETE /api/profile/avatar - удалить аватарку
router.delete('/avatar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Получаем текущую аватарку
    const [[user]] = await db.execute(
      'SELECT avatar_url FROM users WHERE id = ?',
      [userId]
    );

    if (!user || !user.avatar_url) {
      return res.status(404).json({ error: 'Аватарка не найдена' });
    }

    // Удаляем файл (если это не дефолтная аватарка)
    if (user.avatar_url.startsWith('/uploads/avatars/')) {
      const avatarPath = path.join(__dirname, '..', user.avatar_url);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Удаляем из БД
    await db.execute(
      'UPDATE users SET avatar_url = NULL WHERE id = ?',
      [userId]
    );

    res.json({ message: 'Аватарка удалена' });
  } catch (error) {
    console.error('Ошибка удаления аватарки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
