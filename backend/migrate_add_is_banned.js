const db = require('./config/db');

async function migrate() {
  try {
    console.log('Добавление поля is_banned в таблицу users...');
    
    // Проверяем, существует ли уже поле
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'is_banned'
    `);
    
    if (columns.length > 0) {
      console.log('Поле is_banned уже существует');
      return;
    }
    
    // Добавляем поле is_banned
    await db.execute(`
      ALTER TABLE users 
      ADD COLUMN is_banned TINYINT(1) DEFAULT 0 NOT NULL
    `);
    
    console.log('✓ Поле is_banned успешно добавлено');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка миграции:', error);
    process.exit(1);
  }
}

migrate();
