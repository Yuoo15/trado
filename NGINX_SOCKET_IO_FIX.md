# Исправление Socket.IO в Nginx

## Проблема
Socket.IO не может подключиться через Nginx, потому что нужен специальный location для WebSocket соединений.

## Решение

На **СЕРВЕРЕ** открой Nginx конфиг:

```bash
nano /etc/nginx/sites-available/trado.kz
```

**Найди блок `server { listen 443 ssl; ... }`** и **ДОБАВЬ** внутри него (после `location /uploads/`, но **ПЕРЕД** `location / {`):

```nginx
# Socket.IO для чата
location /socket.io/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;
}
```

**Сохрани:** `Ctrl+O` → `Enter` → `Ctrl+X`

**Проверь и перезапусти Nginx:**

```bash
nginx -t
systemctl reload nginx
```

**Проверь что работает:**

```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" https://trado.kz/socket.io/
```

Должен вернуться ответ от Socket.IO (не 404).
