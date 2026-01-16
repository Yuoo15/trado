-- Миграция: делаем ad_id опциональным в таблице chats
-- Это позволяет создавать чаты без привязки к объявлению

-- 1. Удаляем старый уникальный ключ (если существует)
ALTER TABLE chats DROP INDEX IF EXISTS unique_chat;

-- 2. Удаляем внешний ключ на ad_id (временно)
-- Нужно найти имя внешнего ключа
SET @constraint_name = (
    SELECT CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'chats' 
    AND COLUMN_NAME = 'ad_id' 
    AND REFERENCED_TABLE_NAME = 'products'
    LIMIT 1
);

SET @sql = CONCAT('ALTER TABLE chats DROP FOREIGN KEY ', @constraint_name);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Делаем ad_id опциональным (NULL)
ALTER TABLE chats MODIFY COLUMN ad_id INT NULL;

-- 4. Восстанавливаем внешний ключ (теперь он может быть NULL)
ALTER TABLE chats 
ADD CONSTRAINT chats_ibfk_1 
FOREIGN KEY (ad_id) REFERENCES products(id) ON DELETE CASCADE;

-- 5. Создаем новый уникальный ключ
-- Для чатов с объявлением: уникальность по (ad_id, buyer_id, seller_id)
-- Для чатов без объявления: уникальность по (buyer_id, seller_id) где ad_id IS NULL
-- В MySQL это можно сделать через составной индекс, но проверка дубликатов будет на уровне приложения
