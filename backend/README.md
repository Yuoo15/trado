# Backend API - Trado

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` в корне проекта со следующим содержимым:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=ваш_пароль
DB_NAME=trado
JWT_SECRET=ваш-секретный-ключ-измените-это
JWT_EXPIRES_IN=7d
PORT=3001
ADMIN_PHONE=+71262342332
ADMIN_PASSWORD=ваш_пароль_админа
ADMIN_NAME=Администратор
ADMIN_EMAIL=admin@trado.local
```

3. Инициализируйте администратора (опционально, если еще не создан):
```bash
node scripts/init-admin.js
```
Этот скрипт создаст или обновит администратора с паролем из `ADMIN_PASSWORD` в .env.

3. Убедитесь, что база данных MySQL создана и таблицы созданы через `db.sql`

## Запуск

```bash
# Development режим
npm run dev

# Production режим
npm start
```

## API Endpoints

### Регистрация
**POST** `/api/auth/register`

Тело запроса:
```json
{
  "name": "Имя пользователя",
  "email": "user@example.com",
  "password": "password123",
  "role": "buyer" // опционально: "buyer", "seller", "admin" (по умолчанию "buyer")
}
```

Успешный ответ (201):
```json
{
  "message": "Пользователь успешно зарегистрирован",
  "token": "jwt_token_здесь",
  "user": {
    "id": 1,
    "name": "Имя пользователя",
    "email": "user@example.com",
    "role": "buyer"
  }
}
```

## Middleware

### authenticateToken
Используется для защиты маршрутов, требующих аутентификации.

Пример использования:
```javascript
const { authenticateToken } = require('./middleware/auth');

router.get('/protected', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});
```

### authorizeRole
Используется для проверки роли пользователя.

Пример использования:
```javascript
const { authenticateToken, authorizeRole } = require('./middleware/auth');

router.get('/admin', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.json({ message: 'Только для админов' });
});
```
