"use client"
import React, { useMemo, useCallback, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/contexts/ToastContext"
import { useModal } from "@/contexts/ModalContext"
import { formatPriceWithSymbol } from "@/utils/formatPrice"
import styles from './productCard.module.css'

function ProductCard({ product, onDelete, isAdmin = false, showDelete = false, isDeleted = false }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { showConfirm } = useModal();
  const [isInCart, setIsInCart] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Мемоизируем очистку описания
  const cleanDescription = useMemo(() => {
    if (!product.description) return null;
    return product.description
      .split('\n')
      .filter(line => !line.trim().startsWith('Тел:') && !line.trim().startsWith('Тел.'))
      .join('\n')
      .trim();
  }, [product.description]);

  const handleCardClick = useCallback(() => {
    if (product.id && !isDeleted) {
      router.push(`/product/${product.id}`);
    }
  }, [product.id, router, isDeleted]);

  const handleAddToCart = useCallback((e) => {
    e.stopPropagation(); // Останавливаем всплытие события
    if (isDeleted) return; // Не добавляем удаленные товары
    
    try {
      const cartId = product.cartId || `${product.source || "item"}-${product.id}`;
      const productName = product.name || product.title || "Товар";
      const stored = localStorage.getItem("cart") || "[]";
      const cart = JSON.parse(stored);
      const idx = cart.findIndex((item) => item.id === cartId || item.productId === product.id);
      
      if (idx >= 0) {
        // Товар уже в корзине - удаляем его
        cart.splice(idx, 1);
        localStorage.setItem("cart", JSON.stringify(cart));
        setIsInCart(false); // Обновляем состояние
        // Отправляем событие для обновления других компонентов
        window.dispatchEvent(new Event('cartUpdated'));
        showToast(`Товар "${productName}" удален из корзины`);
      } else {
        // Добавляем товар в корзину
        const title = product.name || product.title || "Товар";
        const img = product.image || product.image_url;
        const priceRaw = product.price;
        const price =
          typeof priceRaw === "number"
            ? priceRaw.toString()
            : priceRaw || "";

        cart.push({
          id: cartId,
          productId: product.id, // Сохраняем реальный ID товара для перехода
          name: title,
          price,
          image: img,
          qty: 1,
        });
        localStorage.setItem("cart", JSON.stringify(cart));
        setIsInCart(true); // Обновляем состояние
        // Отправляем событие для обновления других компонентов
        window.dispatchEvent(new Event('cartUpdated'));
        showToast(`Товар "${productName}" добавлен в корзину`);
      }
    } catch (e) {
      console.error("Не удалось изменить корзину", e);
    }
  }, [product, showToast, isDeleted]);

  const handleDelete = useCallback(async () => {
    const confirmed = await showConfirm('Вы уверены, что хотите удалить это объявление?', 'Удалить объявление');
    if (!confirmed) {
      return;
    }

    if (onDelete && product.id) {
      await onDelete(product.id);
    }
  }, [onDelete, product.id, showConfirm]);

  const averageRating = useMemo(() => {
    return product.average_rating ? parseFloat(product.average_rating) : null;
  }, [product.average_rating]);

  const reviewsCount = useMemo(() => {
    return product.reviews_count || 0;
  }, [product.reviews_count]);

  // Проверяем, есть ли товар в корзине
  useEffect(() => {
    const checkCart = () => {
      try {
        const cartId = product.cartId || `${product.source || "item"}-${product.id}`;
        const stored = localStorage.getItem("cart") || "[]";
        const cart = JSON.parse(stored);
        const idx = cart.findIndex((item) => item.id === cartId || item.productId === product.id);
        setIsInCart(idx >= 0);
      } catch (e) {
        setIsInCart(false);
      }
    };

    checkCart();
    
    // Слушаем изменения в localStorage только из других вкладок
    const handleStorageChange = (e) => {
      if (e.key === 'cart') {
        checkCart();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Слушаем кастомное событие для изменений в той же вкладке
    const handleCartChange = () => checkCart();
    window.addEventListener('cartUpdated', handleCartChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleCartChange);
    };
  }, [product.id, product.cartId, product.source]);

  return (
    <div className={`${styles.card} ${isDeleted ? styles.deleted : ''}`} onClick={!isDeleted ? handleCardClick : undefined}>
      {showDelete && onDelete && (
        <button 
          className={styles.deleteBtn} 
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          title="Удалить объявление"
        >
          ✕
        </button>
      )}
      <div className={styles.imageWrapper}>
        {imageError || !product.image || product.image === '/example.jpg' || (typeof product.image === 'string' && product.image.includes('/example.jpg')) ? (
          <div className={styles.imagePlaceholder}>
            <div className={styles.imagePlaceholderContent}>
              <div className={styles.imagePlaceholderTitle}>
                {product.name || product.title || "Товар"}
              </div>
              {cleanDescription && (
                <div className={styles.imagePlaceholderDesc}>
                  {cleanDescription}
                </div>
              )}
            </div>
          </div>
        ) : (
          <img 
            src={product.image} 
            alt={product.name || product.title}
            className={styles.image}
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
          />
        )}
      </div>
      <div className={styles.content}>
        <div className={styles.title}>{product.name || product.title}</div>
        {cleanDescription && (
          <div className={styles.description}>{cleanDescription}</div>
        )}
        <div className={styles.price}>{formatPriceWithSymbol(product.price)}</div>
        {averageRating !== null && averageRating > 0 && (
          <div className={styles.rating}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="#FFB800"
              style={{ marginRight: "4px", verticalAlign: "middle" }}
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            {averageRating.toFixed(1)}
            {reviewsCount > 0 && (
              <span className={styles.reviewsCount}>({reviewsCount})</span>
            )}
          </div>
        )}
        <button 
          className={`${styles.addBtn} ${isInCart ? styles.added : ''}`} 
          onClick={handleAddToCart}
        >
          {isInCart ? 'Добавлено' : 'В корзину'}
        </button>
      </div>
    </div>
  )
}

// Мемоизируем компонент для предотвращения лишних перерендеров
export default React.memo(ProductCard, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.image === nextProps.product.image &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.name === nextProps.product.name &&
    prevProps.product.description === nextProps.product.description &&
    prevProps.product.average_rating === nextProps.product.average_rating &&
    prevProps.product.reviews_count === nextProps.product.reviews_count &&
    prevProps.showDelete === nextProps.showDelete &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.isDeleted === nextProps.isDeleted &&
    prevProps.onDelete === nextProps.onDelete
  );
});
