require('dotenv').config();
const db = require('../config/db');

async function createAdClicksTable() {
  try {
    console.log('Проверка таблицы ad_clicks...');

    const sql = `
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
    `;

    await db.execute(sql);
    console.log('✓ Таблица ad_clicks успешно создана или уже существует!');
    
    // Проверяем, есть ли уже записи
    const [existing] = await db.execute('SELECT COUNT(*) as count FROM ad_clicks');
    console.log(`Текущее количество кликов: ${existing[0].count}`);
  } catch (error) {
    console.error('Ошибка создания таблицы ad_clicks:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Таблица уже существует, все хорошо!');
    } else {
      throw error;
    }
  }
}

createAdClicksTable()
  .then(() => {
    console.log('Готово!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
