const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET /api/admin/analytics - получить аналитику (только для админа)
router.get('/analytics', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    // Общее количество пользователей
    const [usersCount] = await db.execute('SELECT COUNT(*) as count FROM users');
    const totalUsers = usersCount[0].count;

    // Количество забаненных пользователей
    const [bannedCount] = await db.execute('SELECT COUNT(*) as count FROM users WHERE is_banned = 1');
    const bannedUsers = bannedCount[0].count;

    // Общее количество объявлений
    const [adsCount] = await db.execute('SELECT COUNT(*) as count FROM products');
    const totalAds = adsCount[0].count;

    // Общее количество чатов
    const [chatsCount] = await db.execute('SELECT COUNT(*) as count FROM chats');
    const totalChats = chatsCount[0].count;

    // Общее количество отзывов
    const [reviewsCount] = await db.execute('SELECT COUNT(*) as count FROM reviews');
    const totalReviews = reviewsCount[0].count;

    // Количество активных продавцов (продавцы с объявлениями)
    const [sellersCount] = await db.execute(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM products 
      WHERE user_id IN (SELECT id FROM users WHERE role = 'seller')
    `);
    const activeSellers = sellersCount[0].count;

    // Последние 10 пользователей (без дубликатов)
    const [recentUsers] = await db.execute(`
      SELECT DISTINCT id, name, phone, role, created_at, is_banned 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    res.json({
      totalUsers,
      bannedUsers,
      totalAds,
      totalChats,
      totalReviews,
      activeSellers,
      recentUsers: recentUsers.map(user => ({
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
        is_banned: user.is_banned || false
      }))
    });
  } catch (error) {
    console.error('Ошибка получения аналитики:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
