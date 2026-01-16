require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trado'
  });

  try {
    // Проверяем существование колонок
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'messages'
    `, [process.env.DB_NAME || 'trado']);

    const columnNames = columns.map(col => col.COLUMN_NAME);

    // Добавляем reply_to если не существует
    if (!columnNames.includes('reply_to')) {
      await connection.execute(`
        ALTER TABLE messages 
        ADD COLUMN reply_to INT NULL
      `);
      console.log('Added reply_to column');
    }

    // Добавляем image_url если не существует
    if (!columnNames.includes('image_url')) {
      await connection.execute(`
        ALTER TABLE messages 
        ADD COLUMN image_url VARCHAR(255) NULL
      `);
      console.log('Added image_url column');
    }

    // Добавляем внешний ключ для reply_to если не существует
    const [foreignKeys] = await connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'messages' 
      AND COLUMN_NAME = 'reply_to'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [process.env.DB_NAME || 'trado']);

    if (foreignKeys.length === 0) {
      await connection.execute(`
        ALTER TABLE messages 
        ADD FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL
      `);
      console.log('Added foreign key for reply_to');
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await connection.end();
  }
}

migrate();
