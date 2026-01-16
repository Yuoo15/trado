const db = require('./config/db');
const bcrypt = require('bcrypt');

async function createAdminRamazan() {
  try {
    console.log('Создаю админский аккаунт для Ramazan...');
    
    const phone = '+71262342332';
    const password = 'adminRamazan';
    const name = 'Ramazan Admin';
    const email = 'ramazan@trado.local';
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Пароль захеширован');
    
    // Проверяем, существует ли уже пользователь с таким телефоном
    const [existingUsers] = await db.execute(
      'SELECT id, role FROM users WHERE phone = ?',
      [phone]
    );
    
    if (existingUsers.length > 0) {
      // Обновляем существующего пользователя
      await db.execute(
        'UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE phone = ?',
        [name, email, hashedPassword, 'admin', phone]
      );
      console.log(`✓ Админский аккаунт обновлен для телефона ${phone}`);
    } else {
      // Создаем нового пользователя
      await db.execute(
        'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
        [name, email, phone, hashedPassword, 'admin']
      );
      console.log(`✓ Админский аккаунт создан для телефона ${phone}`);
    }
    
    console.log('✓ Готово!');
    console.log(`Телефон: ${phone}`);
    console.log(`Пароль: ${password}`);
    console.log(`Email: ${email}`);
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Ошибка создания админского аккаунта:', error);
    process.exit(1);
  }
}

createAdminRamazan();
