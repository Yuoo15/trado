const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    console.log('Начинаю миграцию таблиц для чатов...');
    console.log('Проверяю подключение к БД...');
    
    // Проверяем подключение
    await db.execute('SELECT 1');
    console.log('✓ Подключение к БД установлено');
    
    // Читаем SQL файл
    const sql = fs.readFileSync(path.join(__dirname, 'create_chat_tables.sql'), 'utf8');
    
    // Выполняем SQL запросы напрямую
    console.log('Создаю таблицу chats...');
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS chats (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ad_id INT NOT NULL,
          buyer_id INT NOT NULL,
          seller_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (ad_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_chat (ad_id, buyer_id, seller_id)
        )
      `);
      console.log('✓ Таблица chats создана');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
        console.log('⚠ Таблица chats уже существует');
      } else {
        console.error('✗ Ошибка создания таблицы chats:', error.message);
        throw error;
      }
    }
    
    console.log('Создаю таблицу messages...');
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          chat_id INT NOT NULL,
          sender_id INT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_chat_created (chat_id, created_at)
        )
      `);
      console.log('✓ Таблица messages создана');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
        console.log('⚠ Таблица messages уже существует');
      } else {
        console.error('✗ Ошибка создания таблицы messages:', error.message);
        throw error;
      }
    }
    
    console.log('✓ Миграция завершена успешно!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Ошибка миграции:', error);
    process.exit(1);
  }
}

migrate();
