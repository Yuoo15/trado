/**
 * Скрипт для инициализации администратора с паролем из .env
 * Запуск: node scripts/init-admin.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/db');

async function initAdmin() {
  try {
    const adminPhone = process.env.ADMIN_PHONE || '+71262342332';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Администратор';
    const adminEmail = process.env.ADMIN_EMAIL || `admin_${adminPhone.replace(/\D/g, '')}@trado.local`;

    if (!adminPassword) {
      console.error('Ошибка: ADMIN_PASSWORD не установлен в .env файле');
      process.exit(1);
    }

    console.log('Инициализация администратора...');
    console.log(`Телефон: ${adminPhone}`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Имя: ${adminName}`);

    // Хешируем пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Нормализуем телефон (убираем пробелы)
    const phoneNorm = adminPhone.replace(/\s+/g, '');

    // Проверяем, существует ли уже админ с таким телефоном
    const [existingAdmins] = await db.execute(
      'SELECT id, name FROM users WHERE phone = ? AND role = ?',
      [phoneNorm, 'admin']
    );

    if (existingAdmins.length > 0) {
      // Обновляем существующего админа
      await db.execute(
        'UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE phone = ? AND role = ?',
        [adminName, adminEmail, hashedPassword, 'admin', phoneNorm, 'admin']
      );
      console.log(`✓ Администратор обновлен (ID: ${existingAdmins[0].id})`);
    } else {
      // Создаем нового админа
      const [result] = await db.execute(
        'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
        [adminName, adminEmail, phoneNorm, hashedPassword, 'admin']
      );
      console.log(`✓ Администратор создан (ID: ${result.insertId})`);
    }

    console.log('✓ Инициализация завершена успешно');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка инициализации администратора:', error);
    process.exit(1);
  }
}

initAdmin();
