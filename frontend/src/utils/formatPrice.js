/**
 * Форматирует цену, убирая .00 в конце если это целое число
 * @param {string|number} price - Цена как строка или число
 * @returns {string} - Отформатированная цена
 */
export function formatPrice(price) {
  if (price === null || price === undefined || price === '') {
    return '';
  }
  
  // Преобразуем в строку
  let priceStr = String(price);
  
  // Убираем все символы кроме цифр, точки и запятой
  priceStr = priceStr.replace(/[^0-9.,]/g, '');
  
  // Заменяем запятую на точку
  priceStr = priceStr.replace(',', '.');
  
  // Если пустая строка, возвращаем пустую
  if (!priceStr) {
    return '';
  }
  
  // Преобразуем в число для проверки
  const priceNum = parseFloat(priceStr);
  
  if (isNaN(priceNum)) {
    return String(price); // Возвращаем оригинальное значение если не число
  }
  
  // Если число целое, возвращаем без .00
  if (priceNum % 1 === 0) {
    return priceNum.toString();
  }
  
  // Иначе оставляем дробную часть, но убираем .00 если оно есть
  const formatted = priceNum.toString();
  return formatted.replace(/\.00$/, '');
}

/**
 * Форматирует цену с символом валюты
 * @param {string|number} price - Цена
 * @param {string} symbol - Символ валюты (по умолчанию ₸)
 * @returns {string} - Отформатированная цена с символом
 */
export function formatPriceWithSymbol(price, symbol = '₸') {
  const formatted = formatPrice(price);
  if (!formatted) {
    return '';
  }
  return `${symbol}${formatted}`;
}
