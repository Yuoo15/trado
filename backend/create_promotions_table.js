const mysql = require('mysql2/promise');
require('dotenv').config();

async function createPromotionsTable() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'trado'
    });

    console.log('Подключение к базе данных установлено...');

    const sql = `
      CREATE TABLE IF NOT EXISTS promotions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        promoted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_user_date (user_id, promoted_at),
        INDEX idx_product_user (product_id, user_id)
      );
    `;

    await connection.execute(sql);
    console.log('✓ Таблица promotions успешно создана!');

  } catch (error) {
    console.error('Ошибка создания таблицы:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Таблица уже существует, все хорошо!');
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createPromotionsTable()
  .then(() => {
    console.log('Готово!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
