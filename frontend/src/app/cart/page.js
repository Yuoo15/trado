"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useModal } from "@/contexts/ModalContext";
import styles from "./page.module.css";

function CartItemImage({ image, name, onClick, isDeleted }) {
  const [imageError, setImageError] = useState(false);
  
  if (imageError || !image || image === '/example.jpg' || (typeof image === 'string' && image.includes('/example.jpg'))) {
    return (
      <div className={styles.imagePlaceholder} onClick={onClick}>
        ?
      </div>
    );
  }
  
  return (
    <img 
      src={image} 
      alt={name} 
      className={styles.img}
      onClick={onClick}
      onError={() => setImageError(true)}
    />
  );
}

const API_BASE = "http://localhost:3001";

export default function CartPage() {
  const [items, setItems] = useState([]);
  const [deletedItems, setDeletedItems] = useState(new Set());
  const router = useRouter();
  const { showSuccess, showError, showInfo, showConfirm } = useModal();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cart") || "[]";
      setTimeout(async () => {
        try {
          const cartItems = JSON.parse(stored);
          setItems(cartItems);
          
          // Проверяем, какие товары удалены (делаем один запрос для всех товаров)
          const deletedSet = new Set();
          try {
            const res = await fetch(`${API_BASE}/api/ads`);
            if (res.ok) {
              const ads = await res.json();
              const existingIds = new Set(ads.map(ad => ad.id.toString()));
              
              cartItems.forEach((item) => {
                const productId = item.productId || (typeof item.id === 'string' && item.id.includes('-') 
                  ? item.id.split('-').pop() 
                  : item.id);
                
                if (productId) {
                  const idStr = productId.toString();
                  // Проверяем только товары из базы данных (имеют числовой ID)
                  if (!isNaN(parseInt(idStr)) && !existingIds.has(idStr)) {
                    deletedSet.add(item.id);
                  }
                }
              });
            }
          } catch (e) {
            console.error("Ошибка проверки товаров:", e);
          }
          setDeletedItems(deletedSet);
        } catch {
          setItems([]);
        }
      }, 100);
    } catch {
      setTimeout(() => {
        try {
          setItems([]);
        } catch {
          setItems([]);
        }
      }, 100);       
    }
  }, []);

  const persist = (list) => {
    setItems(list);
    localStorage.setItem("cart", JSON.stringify(list));
  };

  const handleRemove = (id) => {
    const next = items.filter((item) => item.id !== id);
    persist(next);
  };

  const handleClear = async () => {
    const confirmed = await showConfirm("Вы уверены, что хотите очистить корзину?", "Очистить корзину");
    if (confirmed) {
      persist([]);
      showSuccess("Корзина очищена");
    }
  };

  const handleItemClick = (item) => {
    // Используем productId если есть, иначе извлекаем из id
    const productId = item.productId || (typeof item.id === 'string' && item.id.includes('-') 
      ? item.id.split('-').pop() 
      : item.id);
    
    if (productId) {
      router.push(`/product/${productId}`);
    }
  };

  const total = items.reduce((sum, item) => {
    const priceNum = parseFloat(String(item.price).replace(/[^0-9.,]/g, "").replace(",", "."));
    return sum + (isNaN(priceNum) ? 0 : priceNum);
  }, 0);

  const formatPriceDisplay = (price) => {
    if (!price) return '';
    // Убираем .00 если есть
    const priceStr = String(price).replace(/\.00$/, '');
    if (typeof price === "string") {
      return priceStr.replace(/[$]/g, "₸");
    }
    return `₸${priceStr}`;
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Корзина</h1>
          <span className={styles.badge}>{items.length} товаров</span>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>Корзина пуста</p>
            <Link href="/home" className={styles.link}>
              Перейти к товарам
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.actions}>
              <button
                className={styles.clearBtn}
                onClick={handleClear}
                style={{
                  padding: '14px 24px',
                  borderRadius: '16px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0a6bff 0%, #2d8dff 50%, #4fa3ff 100%)',
                  color: '#fff',
                  fontWeight: '800',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  marginBottom: '16px',
                }}
              >
                Очистить корзину
              </button>
            </div>
            <div className={styles.list}>
              {items.map((item) => {
                const isDeleted = deletedItems.has(item.id);
                return (
                  <div 
                    key={item.id} 
                    className={`${styles.item} ${isDeleted ? styles.deleted : ''}`}
                  >
                    <CartItemImage 
                      image={item.image}
                      name={item.name}
                      onClick={() => !isDeleted && handleItemClick(item)}
                      isDeleted={isDeleted}
                    />
                    <div 
                      className={styles.info}
                      onClick={() => !isDeleted && handleItemClick(item)}
                    >
                      <div className={styles.name}>
                        {item.name}
                        {isDeleted && <span className={styles.deletedLabel}> (Удалено)</span>}
                      </div>
                      <div className={styles.meta}>
                        <span className={styles.price}>{formatPriceDisplay(item.price)}</span>
                      </div>
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(item.id);
                      }}
                      aria-label="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            <div className={styles.footer}>
              <div className={styles.total}>
                <span>Итого:</span>
                <strong>₸{total % 1 === 0 ? total : total.toFixed(2).replace(/\.00$/, '')}</strong>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
