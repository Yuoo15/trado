const db = require('../config/db');

async function createSupportAd() {
  try {
    console.log('Создаю объявление поддержки от админа...');
    
    // Находим админа (Ramazan)
    const [admins] = await db.execute(
      'SELECT id FROM users WHERE phone = ? AND role = ?',
      ['+71262342332', 'admin']
    );
    
    if (admins.length === 0) {
      console.log('Админ не найден');
      return;
    }
    
    const adminId = admins[0].id;
    console.log('Админ найден, ID:', adminId);
    
    // Проверяем, есть ли уже объявление поддержки
    const [existingAds] = await db.execute(
      'SELECT id FROM products WHERE user_id = ? AND title LIKE ?',
      [adminId, '%Поддержка%']
    );
    
    if (existingAds.length > 0) {
      console.log('Объявление поддержки уже существует, ID:', existingAds[0].id);
      return existingAds[0].id;
    }
    
    // Находим первую категорию (для объявления)
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
        JSON.stringify(['/uploads/support.jpg']) // Можно использовать реальное изображение
      ]
    );
    
    console.log('✓ Объявление поддержки создано, ID:', result.insertId);
    return result.insertId;
  } catch (error) {
    console.error('Ошибка создания объявления поддержки:', error);
    throw error;
  }
}

// Если запущено напрямую
if (require.main === module) {
  createSupportAd().then(() => {
    console.log('Готово');
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = createSupportAd;
