const db = require('./config/db');

async function migrate() {
  try {
    console.log('Начинаем миграцию: делаем ad_id опциональным в таблице chats...');
    
    // 1. Удаляем старый уникальный ключ (если существует)
    try {
      await db.execute(`ALTER TABLE chats DROP INDEX unique_chat`);
      console.log('✓ Старый индекс unique_chat удален');
    } catch (e) {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY' && e.code !== 'ER_DROP_INDEX_FK') {
        console.log('Индекс unique_chat не найден, пропускаем');
      }
    }
    
    // 2. Удаляем внешний ключ на ad_id
    // Сначала находим имя внешнего ключа
    try {
      const [constraints] = await db.execute(`
        SELECT CONSTRAINT_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'chats' 
        AND COLUMN_NAME = 'ad_id' 
        AND REFERENCED_TABLE_NAME = 'products'
        LIMIT 1
      `);
      
      if (constraints.length > 0) {
        const constraintName = constraints[0].CONSTRAINT_NAME;
        await db.execute(`ALTER TABLE chats DROP FOREIGN KEY ${constraintName}`);
        console.log(`✓ Внешний ключ ${constraintName} удален`);
      }
    } catch (e) {
      console.log('Внешний ключ не найден или уже удален');
    }
    
    // 3. Делаем ad_id опциональным (NULL)
    await db.execute(`
      ALTER TABLE chats 
      MODIFY COLUMN ad_id INT NULL
    `);
    console.log('✓ ad_id теперь может быть NULL');
    
    // 4. Восстанавливаем внешний ключ (теперь он может быть NULL)
    try {
      await db.execute(`
        ALTER TABLE chats 
        ADD CONSTRAINT chats_ibfk_1 
        FOREIGN KEY (ad_id) REFERENCES products(id) ON DELETE CASCADE
      `);
      console.log('✓ Внешний ключ восстановлен');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') {
        console.log('Не удалось восстановить внешний ключ (возможно уже существует):', e.message);
      } else {
        console.log('✓ Внешний ключ уже существует');
      }
    }
    
    console.log('✓ Миграция завершена успешно!');
    console.log('Теперь можно создавать чаты без привязки к объявлению.');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка миграции:', error.message);
    console.error('Код ошибки:', error.code);
    process.exit(1);
  }
}

migrate();
