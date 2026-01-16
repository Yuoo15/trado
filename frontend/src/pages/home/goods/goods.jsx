"use client";
import { useEffect, useState, useMemo } from "react";
import ProductCard from "@/components/product/productCard";
import { goods as staticGoods } from "@/db/goods";
import { useModal } from "@/contexts/ModalContext";
import { categories } from "@/db/cat";
import styles from "./goods.module.css";
import { API_BASE } from "@/config/api";

export default function Goods({ searchQuery = "", selectedCategory = null }) {
  const [items, setItems] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const { showError, showSuccess, showWarning } = useModal();

  useEffect(() => {
    // Проверяем роль и ID пользователя
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.role === "admin");
        setCurrentUserId(user.id || null);
      } catch (e) {
        console.error("Ошибка парсинга пользователя:", e);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    
    const load = async () => {
      try {
        let normalizedApiAds = [];
        try {
          const res = await fetch(`${API_BASE}/api/ads`, {
            // Добавляем заголовки для кэширования
            headers: {
              'Cache-Control': 'max-age=60',
            },
          });
          if (res.ok) {
            const data = await res.json();
            normalizedApiAds = (data || []).map((ad) => {
              // Обрабатываем image_url - может быть JSON массив или строка
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
                id: ad.id || ad.title,
                source: "db",
                name: ad.title,
                description: ad.description,
                price: ad.price != null ? `₸${ad.price}` : "",
                image: fullImageUrl,
                average_rating: ad.average_rating || null,
                reviews_count: ad.reviews_count || 0,
                user_id: ad.user_id || null,
                category_id: ad.category_id || null,
                category_name: ad.category_name || null,
              };
            });
          }
        } catch {
          // ignore fetch errors
        }
        if (!cancelled) {
          setItems(normalizedApiAds);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      }
    };

    load();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Фильтрация товаров по поисковому запросу и категории
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Фильтрация по категории (сравниваем по ID и по названию на случай рассинхронизации)
    if (selectedCategory !== null) {
      // Находим название категории по ID из выбранной категории
      const { categories } = require("@/db/cat");
      const selectedCat = categories.find(c => c.id === selectedCategory);
      const selectedCategoryName = selectedCat?.name;

      if (selectedCategoryName) {
        filtered = filtered.filter((item) => {
          // Сравниваем и по ID, и по названию для надежности
          return item.category_id === selectedCategory || 
                 (item.category_name && item.category_name.toLowerCase() === selectedCategoryName.toLowerCase());
        });
      }
    }

    // Фильтрация по поисковому запросу
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const description = (item.description || "").toLowerCase();
        const price = (item.price || "").toLowerCase();
        return name.includes(query) || description.includes(query) || price.includes(query);
      });
    }

    return filtered;
  }, [items, searchQuery, selectedCategory]);

  // Функция удаления объявления
  const handleDelete = async (adId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showWarning("Требуется авторизация");
        return;
      }

      const response = await fetch(`${API_BASE}/api/ads/${adId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка удаления объявления");
      }

      // Удаляем объявление из локального состояния
      setItems((prevItems) => prevItems.filter((item) => item.id !== adId));
      
      showSuccess("Объявление успешно удалено");
    } catch (error) {
      console.error("Ошибка удаления объявления:", error);
      showError(error.message || "Не удалось удалить объявление");
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        {filteredItems.length > 0 ? (
          filteredItems.map((product, idx) => {
            const key = `${product.source || "item"}-${product.id || idx}`;
            const isOwner = currentUserId && product.user_id === currentUserId;
            const canDelete = isAdmin || isOwner;

            return (
              <ProductCard 
                key={key} 
                product={product}
                onDelete={canDelete ? handleDelete : null}
                isAdmin={isAdmin}
                showDelete={canDelete}
              />
            );
          })
        ) : (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#666" }}>
            {searchQuery || selectedCategory ? "Ничего не найдено" : "Нет товаров"}
          </div>
        )}
      </div>
    </div>
  );
}
