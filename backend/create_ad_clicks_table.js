require('dotenv').config();
const mysql = require('mysql2/promise');

async function createAdClicksTable() {
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
      );
    `;

    await connection.execute(sql);
    console.log('✓ Таблица ad_clicks успешно создана или уже существует!');
    
    // Проверяем, есть ли уже записи
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM ad_clicks');
    console.log(`Текущее количество кликов: ${existing[0].count}`);
  } catch (error) {
    console.error('Ошибка создания таблицы ad_clicks:', error.message);
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

createAdClicksTable()
  .then(() => {
    console.log('Готово!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
