-- Добавление столбца status (игнорирует ошибку, если столбец уже существует)
-- Сначала проверяем структуру таблицы
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'trado' 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'status';

-- Если столбец не существует, добавляем его
-- Выполнить эту команду отдельно:
-- ALTER TABLE users ADD COLUMN status VARCHAR(200) NULL AFTER avatar_url;
