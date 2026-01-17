#!/bin/bash

# Скрипт для исправления темной темы - замена фиксированных цветов на CSS переменные

cd /Users/ramazankantayev/Desktop/Trado/frontend/src

# Массив файлов для обработки
files=(
  "./app/login/password/page.module.css"
  "./app/login/page.module.css"
  "./app/register/page.module.css"
  "./app/cart/page.module.css"
  "./app/not-found.module.css"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Замена background: #fff; на var(--bg-primary) где это контейнеры
    sed -i.bak 's/background: #fff;/background: var(--bg-primary);/g' "$file"
    sed -i.bak 's/background: white;/background: var(--bg-primary);/g' "$file"
    
    # Для текста на кнопках оставляем #fff как есть (они имеют контекст color и обычно внутри кнопок с градиентом)
    
    # Замена черных цветов на переменные
    sed -i.bak 's/color: #000;/color: var(--text-primary);/g' "$file"
    sed -i.bak 's/color: black;/color: var(--text-primary);/g' "$file"
    
    # Удаляем backup файлы
    rm -f "${file}.bak"
    
    echo "✓ Done: $file"
  else
    echo "✗ File not found: $file"
  fi
done

echo ""
echo "✓ All files processed!"
