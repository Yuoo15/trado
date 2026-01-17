-- Добавление колонки status для пользователей
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(200) NULL AFTER avatar_url;

-- Проверка результата
DESCRIBE users;
