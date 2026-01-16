-- Создание админского аккаунта для Ramazan
-- Телефон: +7 126 234 23 32
-- Пароль: adminRamazan
-- Email: ramazan@trado.local

-- Хешированный пароль (adminRamazan) через bcrypt
INSERT INTO users (name, email, phone, password, role) 
VALUES (
  'Ramazan Admin',
  'ramazan@trado.local',
  '+71262342332',
  '$2b$10$/ChVQ/QOeeZw6rwoepnSaOJhAmvP7y9XxxYcX9Z/oP9IUbTiiIz8m',
  'admin'
)
ON DUPLICATE KEY UPDATE 
  role = 'admin',
  password = '$2b$10$/ChVQ/QOeeZw6rwoepnSaOJhAmvP7y9XxxYcX9Z/oP9IUbTiiIz8m';
