-- Скрипт для установки/обновления пароля администратора
-- Использование: mysql -u root -p trado < set-admin-password.sql
-- Или выполните SQL запросы вручную в вашей базе данных

-- Пароль для установки (по умолчанию: admin123)
-- Вы можете изменить хеш пароля на свой, используя bcrypt

-- Обновить пароль для всех администраторов (role = 'admin')
-- Замените '$2b$10$zbOD8q.34OysRQBYX9Un6eSkC9uecOP9VAe7SXccsIhQVjPJiYl0i' на хеш вашего пароля
-- Пароль: admin123

UPDATE users 
SET password = '$2b$10$zbOD8q.34OysRQBYX9Un6eSkC9uecOP9VAe7SXccsIhQVjPJiYl0i'
WHERE role = 'admin';

-- Или обновить пароль для конкретного админа по телефону
-- UPDATE users 
-- SET password = '$2b$10$zbOD8q.34OysRQBYX9Un6eSkC9uecOP9VAe7SXccsIhQVjPJiYl0i'
-- WHERE role = 'admin' AND phone = '+77771234567';

-- Или обновить пароль для конкретного админа по ID
-- UPDATE users 
-- SET password = '$2b$10$zbOD8q.34OysRQBYX9Un6eSkC9uecOP9VAe7SXccsIhQVjPJiYl0i'
-- WHERE role = 'admin' AND id = 1;

-- Проверка: посмотреть список администраторов
-- SELECT id, name, email, phone, role FROM users WHERE role = 'admin';
