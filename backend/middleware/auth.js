const jwt = require('jsonwebtoken');

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Токен доступа не предоставлен' });
  }

  jwt.verify(
    token, 
    process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Недействительный или истекший токен' });
      }
      req.user = user;
      next();
    }
  );
};

// Middleware для проверки роли
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Пользователь не аутентифицирован' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Доступ запрещен: недостаточно прав' });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole
};
