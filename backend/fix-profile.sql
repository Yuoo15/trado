-- Проверка и добавление столбца status, если его нет
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(200) NULL AFTER avatar_url;

-- Создание папки для аватарок (выполнить в терминале):
-- mkdir -p /var/www/trado/backend/uploads/avatars
-- chmod 755 /var/www/trado/backend/uploads
-- chmod 755 /var/www/trado/backend/uploads/avatars

-- Проверка структуры таблицы
DESCRIBE users;

-- Проверка, что роут зарегистрирован (проверить в backend/index.js):
-- app.use('/api/profile', profileRoutes);
