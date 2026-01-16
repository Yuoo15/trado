-- Создание таблицы для модального окна приветствия
CREATE TABLE IF NOT EXISTS welcome_modal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT 'Добро пожаловать!',
    message TEXT NOT NULL,
    button_text VARCHAR(100) DEFAULT 'Понятно',
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Вставляем дефолтные значения
INSERT INTO welcome_modal (title, message, button_text, is_active) 
VALUES ('Добро пожаловать!', 'Добро пожаловать на наш маркетплейс!', 'Понятно', TRUE)
ON DUPLICATE KEY UPDATE id=id;
