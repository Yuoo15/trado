-- Создание предустановленного админ-аккаунта
-- Телефон: +77771234567
-- Пароль: admin123
-- Email: admin@trado.local

-- Хешированный пароль для "admin123" (создан с помощью bcrypt)
-- Для использования выполните этот SQL после создания таблицы users

INSERT INTO users (name, email, phone, password, role) 
VALUES (
  'Администратор',
  'admin@trado.local',
  '+77771234567',
  '$2b$10$zbOD8q.34OysRQBYX9Un6eSkC9uecOP9VAe7SXccsIhQVjPJiYl0i',
  'admin'
)
ON DUPLICATE KEY UPDATE role = 'admin';

-- Если аккаунт уже существует, обновит роль на admin
