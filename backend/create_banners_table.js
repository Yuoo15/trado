const mysql = require('mysql2/promise');
require('dotenv').config();

async function createBannersTable() {
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
      CREATE TABLE IF NOT EXISTS banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        image_url VARCHAR(500) NOT NULL,
        url VARCHAR(500) NOT NULL,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    await connection.execute(sql);
    console.log('✓ Таблица banners успешно создана!');
    
    // Проверяем, есть ли уже записи
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM banners');
    console.log(`Текущее количество баннеров: ${existing[0].count}`);

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

createBannersTable()
  .then(() => {
    console.log('Готово!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
