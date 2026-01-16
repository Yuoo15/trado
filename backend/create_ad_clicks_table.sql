-- Создание таблицы для отслеживания кликов по рекламе (баннерам)
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
