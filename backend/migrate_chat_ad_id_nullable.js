const db = require('./config/db');

async function migrate() {
  try {
    console.log('Начинаем миграцию: делаем ad_id опциональным в таблице chats...');
    
    // Проверяем текущую структуру
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'chats' 
      AND COLUMN_NAME = 'ad_id'
    `);
    
    console.log('Текущая структура ad_id:', columns[0]);
    
    if (columns.length > 0 && columns[0].IS_NULLABLE === 'NO') {
      console.log('Изменяем ad_id на NULLABLE...');
      
      // Удаляем старый уникальный ключ если есть
      try {
        await db.execute(`ALTER TABLE chats DROP INDEX unique_chat`);
        console.log('✓ Старый индекс unique_chat удален');
      } catch (e) {
        if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('Индекс unique_chat не найден или уже удален');
        }
      }
      
      // Удаляем внешний ключ на ad_id (временно)
      try {
        await db.execute(`ALTER TABLE chats DROP FOREIGN KEY chats_ibfk_1`);
        console.log('✓ Внешний ключ на ad_id удален');
      } catch (e) {
        console.log('Внешний ключ не найден или уже удален');
      }
      
      // Делаем ad_id опциональным (NULL)
      await db.execute(`
        ALTER TABLE chats 
        MODIFY COLUMN ad_id INT NULL
      `);
      console.log('✓ ad_id теперь может быть NULL');
      
      // Восстанавливаем внешний ключ, но теперь он может быть NULL
      try {
        await db.execute(`
          ALTER TABLE chats 
          ADD CONSTRAINT chats_ibfk_1 
          FOREIGN KEY (ad_id) REFERENCES products(id) ON DELETE CASCADE
        `);
        console.log('✓ Внешний ключ восстановлен');
      } catch (e) {
        console.log('Не удалось восстановить внешний ключ:', e.message);
      }
      
    } else {
      console.log('ad_id уже может быть NULL, миграция не требуется');
    }
    
    console.log('✓ Миграция завершена успешно!');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка миграции:', error.message);
    console.error('Полная ошибка:', error);
    process.exit(1);
  }
}

migrate();
