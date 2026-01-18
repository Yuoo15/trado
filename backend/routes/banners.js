const express = require('express');
const router = express.Router();
const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Хранилище для баннеров
const uploadsDir = path.join(__dirname, '../uploads/banners');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `banner-${unique}${ext}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB максимум
});

// GET /api/banners - получить все баннеры (публичный доступ)
router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, image_url, url, display_order FROM banners WHERE is_active = 1 ORDER BY display_order ASC, id ASC'
    );
    
    const banners = rows.map(row => ({
      id: row.id,
      image_url: row.image_url,
      url: row.url,
      display_order: row.display_order
    }));
    
    res.json(banners);
  } catch (error) {
    console.error('Ошибка получения баннеров:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/banners - создать баннер (только админ)
router.post('/', authenticateToken, authorizeRole('admin'), upload.single('image'), async (req, res) => {
  try {
    const { url, display_order = 0 } = req.body;

    if (!url || !req.file) {
      return res.status(400).json({ error: 'Поля url и image обязательны' });
    }

    const imageUrl = `/uploads/banners/${req.file.filename}`;

    const [result] = await db.execute(
      'INSERT INTO banners (image_url, url, display_order) VALUES (?, ?, ?)',
      [imageUrl, url, parseInt(display_order) || 0]
    );

    res.status(201).json({
      id: result.insertId,
      image_url: imageUrl,
      url,
      display_order: parseInt(display_order) || 0
    });
  } catch (error) {
    console.error('Ошибка создания баннера:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/banners/:id/click - отслеживание клика по баннеру (публичный доступ)
router.post('/:id/click', async (req, res) => {
  try {
    const bannerId = parseInt(req.params.id);

    if (isNaN(bannerId)) {
      return res.status(400).json({ error: 'Неверный ID баннера' });
    }

    // Проверяем существование баннера
    const [banners] = await db.execute(
      'SELECT id FROM banners WHERE id = ?',
      [bannerId]
    );

    if (banners.length === 0) {
      return res.status(404).json({ error: 'Баннер не найден' });
    }

    // Получаем информацию о пользователе (если авторизован)
    let userId = null;
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        userId = decoded.id;
      }
    } catch (e) {
      // Пользователь не авторизован - это нормально
    }

    // Получаем IP и user agent
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || null;
    const userAgent = req.headers['user-agent'] || null;
    const referrer = req.headers['referer'] || req.headers['referrer'] || null;

    // Сохраняем клик (игнорируем ошибку, если таблицы нет)
    try {
      await db.execute(
        'INSERT INTO ad_clicks (banner_id, user_id, ip_address, user_agent, referrer) VALUES (?, ?, ?, ?, ?)',
        [bannerId, userId, ipAddress, userAgent, referrer]
      );
    } catch (tableError) {
      if (tableError.code === 'ER_NO_SUCH_TABLE') {
        console.warn('Таблица ad_clicks не существует, клик не записан');
        // Возвращаем успех, но клик не записан
      } else {
        throw tableError;
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка отслеживания клика:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// GET /api/banners/analytics/:id - получить аналитику по баннеру (только админ)
router.get('/analytics/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const bannerId = parseInt(req.params.id);

    if (isNaN(bannerId)) {
      return res.status(400).json({ error: 'Неверный ID баннера' });
    }

    // Общее количество кликов
    let totalClicks, last7Days, last30Days, clicksByDay, authClicks, guestClicks;
    
    try {
      [totalClicks] = await db.execute(
        'SELECT COUNT(*) as count FROM ad_clicks WHERE banner_id = ?',
        [bannerId]
      );

      // Клики за последние 7 дней
      [last7Days] = await db.execute(
        'SELECT COUNT(*) as count FROM ad_clicks WHERE banner_id = ? AND clicked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
        [bannerId]
      );

      // Клики за последние 30 дней
      [last30Days] = await db.execute(
        'SELECT COUNT(*) as count FROM ad_clicks WHERE banner_id = ? AND clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
        [bannerId]
      );

      // Клики по дням (последние 30 дней)
      [clicksByDay] = await db.execute(`
        SELECT 
          DATE(clicked_at) as date,
          COUNT(*) as count
        FROM ad_clicks
        WHERE banner_id = ? AND clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(clicked_at)
        ORDER BY date DESC
      `, [bannerId]);

      // Клики от авторизованных пользователей
      [authClicks] = await db.execute(
        'SELECT COUNT(*) as count FROM ad_clicks WHERE banner_id = ? AND user_id IS NOT NULL',
        [bannerId]
      );

      // Клики от неавторизованных пользователей
      [guestClicks] = await db.execute(
        'SELECT COUNT(*) as count FROM ad_clicks WHERE banner_id = ? AND user_id IS NULL',
        [bannerId]
      );
    } catch (tableError) {
      // Если таблицы нет, возвращаем нули
      if (tableError.code === 'ER_NO_SUCH_TABLE') {
        totalClicks = [{ count: 0 }];
        last7Days = [{ count: 0 }];
        last30Days = [{ count: 0 }];
        clicksByDay = [];
        authClicks = [{ count: 0 }];
        guestClicks = [{ count: 0 }];
      } else {
        throw tableError;
      }
    }

    res.json({
      totalClicks: totalClicks[0].count,
      last7Days: last7Days[0].count,
      last30Days: last30Days[0].count,
      clicksByDay: clicksByDay.map(row => ({
        date: row.date,
        count: row.count
      })),
      authClicks: authClicks[0].count,
      guestClicks: guestClicks[0].count
    });
  } catch (error) {
    console.error('Ошибка получения аналитики баннера:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// GET /api/banners/analytics - получить общую аналитику по всем баннерам (только админ)
router.get('/analytics', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    let banners, totalStats;
    
    try {
      // Получаем все баннеры с количеством кликов
      [banners] = await db.execute(`
        SELECT 
          b.id,
          b.image_url,
          b.url,
          b.display_order,
          b.created_at,
          COUNT(ac.id) as total_clicks,
          COUNT(CASE WHEN ac.clicked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as clicks_last_7_days,
          COUNT(CASE WHEN ac.clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as clicks_last_30_days
        FROM banners b
        LEFT JOIN ad_clicks ac ON b.id = ac.banner_id
        GROUP BY b.id, b.image_url, b.url, b.display_order, b.created_at
        ORDER BY b.display_order ASC, b.id ASC
      `);

      // Общая статистика
      [totalStats] = await db.execute(`
        SELECT 
          COUNT(DISTINCT ac.banner_id) as active_banners,
          COUNT(ac.id) as total_clicks,
          COUNT(CASE WHEN ac.clicked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as clicks_last_7_days,
          COUNT(CASE WHEN ac.clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as clicks_last_30_days
        FROM ad_clicks ac
      `);
    } catch (tableError) {
      // Если таблицы нет, получаем баннеры без статистики кликов
      if (tableError.code === 'ER_NO_SUCH_TABLE') {
        [banners] = await db.execute(`
          SELECT 
            id,
            image_url,
            url,
            display_order,
            created_at
          FROM banners
          ORDER BY display_order ASC, id ASC
        `);
        banners = banners.map(b => ({
          ...b,
          total_clicks: 0,
          clicks_last_7_days: 0,
          clicks_last_30_days: 0
        }));
        totalStats = [{
          active_banners: 0,
          total_clicks: 0,
          clicks_last_7_days: 0,
          clicks_last_30_days: 0
        }];
      } else {
        throw tableError;
      }
    }

    res.json({
      banners: banners.map(row => ({
        id: row.id,
        image_url: row.image_url,
        url: row.url,
        display_order: row.display_order,
        created_at: row.created_at,
        total_clicks: parseInt(row.total_clicks) || 0,
        clicks_last_7_days: parseInt(row.clicks_last_7_days) || 0,
        clicks_last_30_days: parseInt(row.clicks_last_30_days) || 0
      })),
      totalStats: {
        active_banners: parseInt(totalStats[0].active_banners) || 0,
        total_clicks: parseInt(totalStats[0].total_clicks) || 0,
        clicks_last_7_days: parseInt(totalStats[0].clicks_last_7_days) || 0,
        clicks_last_30_days: parseInt(totalStats[0].clicks_last_30_days) || 0
      }
    });
  } catch (error) {
    console.error('Ошибка получения общей аналитики:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// DELETE /api/banners/:id - удалить баннер (только админ)
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const bannerId = parseInt(req.params.id);

    if (isNaN(bannerId)) {
      return res.status(400).json({ error: 'Неверный ID баннера' });
    }

    // Получаем информацию о баннере для удаления файла
    const [rows] = await db.execute(
      'SELECT image_url FROM banners WHERE id = ?',
      [bannerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Баннер не найден' });
    }

    const banner = rows[0];

    // Удаляем файл изображения
    if (banner.image_url) {
      const imagePath = path.join(__dirname, '..', banner.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Удаляем запись из БД (клики удалятся автоматически через CASCADE)
    await db.execute('DELETE FROM banners WHERE id = ?', [bannerId]);

    res.json({ message: 'Баннер успешно удален' });
  } catch (error) {
    console.error('Ошибка удаления баннера:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
