CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('buyer', 'seller', 'admin') DEFAULT 'buyer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);


CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS sms_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sms_phone (phone),
    INDEX idx_sms_expires (expires_at)
);


CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status ENUM('pending', 'paid', 'shipped', 'completed', 'cancelled') DEFAULT 'pending',
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);


CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Создание предустановленного админ-аккаунта
-- Телефон: +77771234567
-- Пароль: admin123
-- Email: admin@trado.local

INSERT INTO users (name, email, phone, password, role) 
VALUES (
  'Администратор',
  'admin@trado.local',
  '+77771234567',
  '$2b$10$zbOD8q.34OysRQBYX9Un6eSkC9uecOP9VAe7SXccsIhQVjPJiYl0i',
  'admin'
)
ON DUPLICATE KEY UPDATE role = 'admin';

-- Создание админского аккаунта для Ramazan
-- Телефон: +7 126 234 23 32
-- Пароль: adminRamazan
-- Email: ramazan@trado.local

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

-- Таблица для чатов между покупателем и продавцом по объявлению
CREATE TABLE IF NOT EXISTS chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ad_id INT NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ad_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_chat (ad_id, buyer_id, seller_id)
);

-- Таблица для сообщений в чатах
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NULL,
    image_url VARCHAR(255) NULL,
    reply_to INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL,
    INDEX idx_chat_created (chat_id, created_at)
);

-- Таблица для отслеживания кликов по рекламе (баннерам)
CREATE TABLE IF NOT EXISTS ad_clicks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    banner_id INT NOT NULL,
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    referrer VARCHAR(500) NULL,
    FOREIGN KEY (banner_id) REFERENCES banners(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_banner_clicked (banner_id, clicked_at),
    INDEX idx_clicked_at (clicked_at)
);