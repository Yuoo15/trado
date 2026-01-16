"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/product/productCard";
import { useModal } from "@/contexts/ModalContext";
import styles from "./page.module.css";

const API_BASE = "http://localhost:3001";

export default function SellerPage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = params?.id;
  const { showWarning, showError, showConfirm, showSuccess } = useModal();
  
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
    
    // Проверяем, является ли текущий пользователь админом
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.role === "admin");
      } catch (e) {
        console.error("Ошибка парсинга пользователя:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!sellerId) return;

    const loadSeller = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/user/${sellerId}`);
        if (res.ok) {
          const sellerData = await res.json();
          setSeller(sellerData);
        }
      } catch (error) {
        console.error("Ошибка загрузки продавца:", error);
      }
    };

    const loadProducts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/ads/seller/${sellerId}`);
        if (res.ok) {
          const data = await res.json();
          
          // Нормализуем данные для ProductCard
          const normalizedProducts = data.map((ad) => {
            let imageUrl = ad.image_url;
            if (ad.image_url) {
              try {
                const parsed = JSON.parse(ad.image_url);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  imageUrl = parsed[0];
                }
              } catch {
                // Если не JSON, используем как есть
              }
            }

            const fullImageUrl = imageUrl
              ? imageUrl.startsWith("http")
                ? imageUrl
                : `${API_BASE}${imageUrl}`
              : "/example.jpg";

            return {
              ...ad,
              id: ad.id,
              source: "db",
              name: ad.title,
              description: ad.description,
              price: ad.price != null ? `₸${String(ad.price).replace(/\.00$/, '')}` : "",
              image: fullImageUrl,
              average_rating: ad.average_rating || null,
              reviews_count: ad.reviews_count || 0,
              user_id: ad.user_id || null,
              category_id: ad.category_id || null,
              category_name: ad.category_name || null,
            };
          });
          
          setProducts(normalizedProducts);
        }
      } catch (error) {
        console.error("Ошибка загрузки объявлений:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSeller();
    loadProducts();
  }, [sellerId]);

  const handleContactSeller = async () => {
    if (!isAuthenticated) {
      showWarning("Войдите в аккаунт, чтобы написать продавцу");
      router.push("/login");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      // Создаем чат напрямую с продавцом, без привязки к объявлению
      const res = await fetch(`${API_BASE}/api/messages/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seller_id: parseInt(sellerId) }),
      });

      if (res.ok) {
        const chat = await res.json();
        router.push(`/chat/${chat.id}`);
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка создания чата");
      }
    } catch (error) {
      console.error("Ошибка создания чата:", error);
      showError("Ошибка создания чата");
    }
  };

  const handleBanUser = async () => {
    if (!isAdmin) return;
    
    const isBanned = seller?.is_banned || false;
    const action = isBanned ? "разбанить" : "забанить";
    const confirmed = await showConfirm(
      `Вы уверены, что хотите ${action} этого пользователя?`,
      isBanned ? "Разбанить пользователя" : "Забанить пользователя"
    );
    
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/auth/user/${sellerId}/ban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ banned: !isBanned }),
      });

      if (res.ok) {
        showSuccess(isBanned ? "Пользователь разбанен" : "Пользователь забанен");
        // Обновляем данные продавца
        const sellerRes = await fetch(`${API_BASE}/api/auth/user/${sellerId}`);
        if (sellerRes.ok) {
          const sellerData = await sellerRes.json();
          setSeller(sellerData);
        }
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка выполнения действия");
      }
    } catch (error) {
      console.error("Ошибка бана пользователя:", error);
      showError("Ошибка выполнения действия");
    }
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.loading}>Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.error}>Продавец не найден</div>
          <Link href="/home" className={styles.backLink}>
            ← Назад к товарам
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <Link href="/home" className={styles.backLink}>
          ← Назад
        </Link>

        <div className={styles.sellerHeader}>
          <div className={styles.sellerHeaderTop}>
            <div className={styles.sellerAvatar}>
              {seller.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className={styles.sellerInfo}>
              <h1 className={styles.sellerName}>{seller.name || 'Неизвестный продавец'}</h1>
              <div className={styles.sellerMeta}>
                <span className={styles.sellerRole}>Продавец</span>
                {seller.phone && seller.role !== "admin" && (
                  <span className={styles.sellerPhone}>📱 {seller.phone}</span>
                )}
              </div>
            </div>
          </div>
          <div className={styles.actionsRow}>
            <button 
              className={styles.contactButton}
              onClick={handleContactSeller}
            >
              💬 Написать
            </button>
            {isAdmin && seller && seller.id && (
              <button 
                className={`${styles.banButton} ${seller.is_banned ? styles.unbanButton : ''}`}
                onClick={handleBanUser}
              >
                {seller.is_banned ? '🔓 Разбанить' : '🚫 Забанить'}
              </button>
            )}
          </div>
        </div>

        <div className={styles.productsSection}>
          <h2 className={styles.sectionTitle}>
            Объявления продавца ({products.length})
          </h2>
          
          {products.length === 0 ? (
            <div className={styles.empty}>
              <p>У этого продавца пока нет объявлений</p>
            </div>
          ) : (
            <div className={styles.productsGrid}>
              {products.map((product) => {
                const key = `db-${product.id}`;
                return (
                  <ProductCard 
                    key={key} 
                    product={product}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
