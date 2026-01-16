const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/reviews/user/:userId - получить отзывы пользователя
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Неверный ID пользователя' });
    }

    const [rows] = await db.execute(
      `SELECT r.id, r.product_id, r.user_id, r.rating, r.comment, r.created_at, 
              u.name as user_name, p.title as product_title, p.image_url as product_image
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       LEFT JOIN products p ON r.product_id = p.id
       WHERE r.user_id = ? 
       ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Ошибка получения отзывов пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// GET /api/reviews/:productId - получить отзывы для товара
router.get('/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Неверный ID товара' });
    }

    const [rows] = await db.execute(
      `SELECT r.id, r.product_id, r.user_id, r.rating, r.comment, r.created_at, u.name as user_name 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.product_id = ? 
       ORDER BY r.created_at DESC`,
      [productId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Ошибка получения отзывов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/reviews - создать или обновить отзыв (требуется авторизация)
// Если отзыв от пользователя уже существует, он обновляется
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    const userId = req.user.id;

    if (!product_id || !rating) {
      return res.status(400).json({ error: 'Поля product_id и rating обязательны' });
    }

    const productId = parseInt(product_id);
    const ratingNum = parseInt(rating);

    if (isNaN(productId) || isNaN(ratingNum)) {
      return res.status(400).json({ error: 'Неверный формат product_id или rating' });
    }

    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
    }

    // Проверяем существование товара
    const [products] = await db.execute('SELECT id FROM products WHERE id = ?', [productId]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    // Проверяем, существует ли уже отзыв от этого пользователя
    const [existingReviews] = await db.execute(
      'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?',
      [productId, userId]
    );

    let reviewId;
    if (existingReviews.length > 0) {
      // Обновляем существующий отзыв
      reviewId = existingReviews[0].id;
      await db.execute(
        'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
        [ratingNum, comment || '', reviewId]
      );
    } else {
      // Создаем новый отзыв
      const [result] = await db.execute(
        'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
        [productId, userId, ratingNum, comment || '']
      );
      reviewId = result.insertId;
    }

    // Получаем отзыв с именем пользователя
    const [updatedReview] = await db.execute(
      `SELECT r.id, r.product_id, r.user_id, r.rating, r.comment, r.created_at, u.name as user_name 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.id = ?`,
      [reviewId]
    );

    res.status(existingReviews.length > 0 ? 200 : 201).json(updatedReview[0]);
  } catch (error) {
    console.error('Ошибка создания/обновления отзыва:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PUT /api/reviews/:id - обновить отзыв (только свой)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (isNaN(reviewId)) {
      return res.status(400).json({ error: 'Неверный ID отзыва' });
    }

    if (!rating) {
      return res.status(400).json({ error: 'Поле rating обязательно' });
    }

    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
    }

    // Проверяем, что отзыв принадлежит пользователю
    const [reviews] = await db.execute(
      'SELECT id FROM reviews WHERE id = ? AND user_id = ?',
      [reviewId, userId]
    );

    if (reviews.length === 0) {
      return res.status(403).json({ error: 'Вы можете редактировать только свои отзывы' });
    }

    // Обновляем отзыв
    await db.execute(
      'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
      [ratingNum, comment || '', reviewId]
    );

    // Получаем обновленный отзыв
    const [updatedReview] = await db.execute(
      `SELECT r.id, r.product_id, r.user_id, r.rating, r.comment, r.created_at, u.name as user_name 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.id = ?`,
      [reviewId]
    );

    res.json(updatedReview[0]);
  } catch (error) {
    console.error('Ошибка обновления отзыва:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// DELETE /api/reviews/:id - удалить отзыв (только свой)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(reviewId)) {
      return res.status(400).json({ error: 'Неверный ID отзыва' });
    }

    // Проверяем, что отзыв принадлежит пользователю
    const [reviews] = await db.execute(
      'SELECT id FROM reviews WHERE id = ? AND user_id = ?',
      [reviewId, userId]
    );

    if (reviews.length === 0) {
      return res.status(403).json({ error: 'Вы можете удалять только свои отзывы' });
    }

    // Удаляем отзыв
    await db.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);

    res.json({ message: 'Отзыв успешно удален' });
  } catch (error) {
    console.error('Ошибка удаления отзыва:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
