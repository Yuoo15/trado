const mysql = require('mysql2/promise');
require('dotenv').config();

async function createWelcomeModalTable() {
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
      CREATE TABLE IF NOT EXISTS welcome_modal (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL DEFAULT 'Добро пожаловать!',
        message TEXT NOT NULL,
        button_text VARCHAR(100) DEFAULT 'Понятно',
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    await connection.execute(sql);
    console.log('✓ Таблица welcome_modal успешно создана!');

    // Вставляем дефолтные значения, если таблица пустая
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM welcome_modal');
    if (existing[0].count === 0) {
      await connection.execute(`
        INSERT INTO welcome_modal (title, message, button_text, is_active) 
        VALUES ('Добро пожаловать!', 'Добро пожаловать на наш маркетплейс!', 'Понятно', TRUE)
      `);
      console.log('✓ Дефолтные данные добавлены');
    }

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

createWelcomeModalTable()
  .then(() => {
    console.log('Готово!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
