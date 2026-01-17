# Диагностика проблем с сервером

## Быстрая проверка состояния сервера

Выполни эти команды **по очереди** и покажи вывод каждой:

```bash
# 1. Проверь статус PM2 процессов
sudo pm2 status

# 2. Проверь использование памяти и CPU
free -h
top -bn1 | head -20

# 3. Проверь место на диске
df -h

# 4. Проверь логи PM2 на ошибки
sudo pm2 logs trado-backend --lines 20 --err
sudo pm2 logs trado-frontend --lines 20 --err

# 5. Проверь что MySQL работает
sudo systemctl status mysql | head -10

# 6. Проверь что Nginx работает
sudo systemctl status nginx | head -10

# 7. Проверь доступность портов
sudo netstat -tlnp | grep -E '3000|3001|80|443'
```

## Возможные проблемы и решения

### Проблема 1: Нехватка памяти (82% использовано)
Если память закончилась, процессы могут падать.

**Решение:**
```bash
# Перезапусти процессы PM2
sudo pm2 restart all

# Или перезапусти только проблемные
sudo pm2 restart trado-backend
sudo pm2 restart trado-frontend
```

### Проблема 2: Процессы упали
Если в `pm2 status` видно `errored` или `stopped`.

**Решение:**
```bash
# Удали все процессы
sudo pm2 delete all

# Запусти заново
cd /var/www/trado/backend
sudo pm2 start npm --name "trado-backend" -- start

cd /var/www/trado/frontend
sudo pm2 start npm --name "trado-frontend" -- run dev

# Сохрани
sudo pm2 save
```

### Проблема 3: Нехватка места на диске
Если диск заполнен, ничего не будет работать.

**Решение:**
```bash
# Очисти логи PM2 (они могут быть большими)
sudo pm2 flush

# Очисти кэш Next.js
cd /var/www/trado/frontend
sudo rm -rf .next

# Очисти старые логи системы
sudo journalctl --vacuum-time=7d
```

### Проблема 4: MySQL не работает
Если MySQL упал, backend не сможет работать.

**Решение:**
```bash
# Перезапусти MySQL
sudo systemctl restart mysql
sudo systemctl status mysql
```

### Проблема 5: Nginx не работает
Если Nginx упал, сайт не будет доступен.

**Решение:**
```bash
# Перезапусти Nginx
sudo systemctl restart nginx
sudo nginx -t
```

## Экстренное восстановление

Если ничего не помогает, выполни все команды подряд:

```bash
# 1. Останови все
sudo pm2 stop all

# 2. Перезапусти MySQL
sudo systemctl restart mysql

# 3. Перезапусти Nginx
sudo systemctl restart nginx

# 4. Очисти кэш
cd /var/www/trado/frontend
sudo rm -rf .next

# 5. Запусти заново
cd /var/www/trado/backend
sudo pm2 delete all
sudo pm2 start npm --name "trado-backend" -- start

cd /var/www/trado/frontend
sudo pm2 start npm --name "trado-frontend" -- run dev

# 6. Сохрани
sudo pm2 save

# 7. Проверь статус
sudo pm2 status
```

## Проверка после восстановления

```bash
# Проверь что процессы запущены
sudo pm2 status

# Проверь логи - не должно быть критических ошибок
sudo pm2 logs --lines 10

# Проверь доступность сайта
curl -I https://trado.kz
```
