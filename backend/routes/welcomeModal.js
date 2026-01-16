const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET /api/welcome-modal - получить данные модального окна (публичный доступ)
router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, title, message, button_text, is_active FROM welcome_modal WHERE id = 1 LIMIT 1'
    );
    
    if (rows.length === 0) {
      // Возвращаем дефолтные значения, если запись не найдена
      return res.json({
        id: 1,
        title: 'Добро пожаловать!',
        message: 'Добро пожаловать на наш маркетплейс!',
        button_text: 'Понятно',
        is_active: true
      });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Ошибка получения данных модального окна:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PUT /api/welcome-modal - обновить данные модального окна (только админ)
router.put('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { title, message, button_text, is_active } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Поля title и message обязательны' });
    }

    // Проверяем, существует ли запись
    const [existing] = await db.execute('SELECT id FROM welcome_modal WHERE id = 1 LIMIT 1');

    if (existing.length === 0) {
      // Создаем запись, если её нет
      await db.execute(
        'INSERT INTO welcome_modal (id, title, message, button_text, is_active) VALUES (1, ?, ?, ?, ?)',
        [title, message, button_text || 'Понятно', is_active !== undefined ? is_active : true]
      );
    } else {
      // Обновляем существующую запись
      await db.execute(
        'UPDATE welcome_modal SET title = ?, message = ?, button_text = ?, is_active = ? WHERE id = 1',
        [title, message, button_text || 'Понятно', is_active !== undefined ? is_active : true]
      );
    }

    const [updated] = await db.execute('SELECT * FROM welcome_modal WHERE id = 1 LIMIT 1');
    res.json(updated[0]);
  } catch (error) {
    console.error('Ошибка обновления модального окна:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
