"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useModal } from "@/contexts/ModalContext";
import { useToast } from "@/contexts/ToastContext";
import styles from "./page.module.css";

const API_BASE = "http://localhost:3001";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id;
  const { showSuccess, showError, showWarning, showInfo, showConfirm } = useModal();
  const { showToast } = useToast();
  
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productImages, setProductImages] = useState([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState(null);
  const [userReview, setUserReview] = useState(null);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [isInCart, setIsInCart] = useState(false);
  const [seller, setSeller] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setPhone(user.phone || "");
          setUserId(user.id || null);
        } catch (e) {
          console.error("Ошибка парсинга пользователя:", e);
        }
      }
    }
  }, []);

  // Проверяем, есть ли товар в корзине
  useEffect(() => {
    if (!product) return;
    
    const checkCart = () => {
      try {
        const cartId = `db-${product.id}`;
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
  }, [product]);

  useEffect(() => {
    if (!productId) return;

    const loadProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/ads`);
        if (res.ok) {
          const data = await res.json();
          const foundProduct = data.find((ad) => ad.id === parseInt(productId));
          if (foundProduct) {
            // Обрабатываем image_url - может быть JSON массив или строка
            let images = [];
            if (foundProduct.image_url) {
              try {
                // Пытаемся распарсить как JSON
                const parsed = JSON.parse(foundProduct.image_url);
                if (Array.isArray(parsed)) {
                  images = parsed;
                } else {
                  images = [parsed];
                }
              } catch {
                // Если не JSON, значит это строка
                images = [foundProduct.image_url];
              }
            }

            // Преобразуем пути к полным URL
            const fullImages = images.map(img => 
              img.startsWith("http") ? img : `${API_BASE}${img}`
            );

            // Не добавляем /example.jpg, если изображений нет

            setProductImages(fullImages.length > 0 ? fullImages : []);
            
            const normalizedProduct = {
              ...foundProduct,
              id: foundProduct.id,
              name: foundProduct.title,
              description: foundProduct.description,
              price: foundProduct.price != null ? `₸${String(foundProduct.price).replace(/\.00$/, '')}` : "",
              image: fullImages.length > 0 ? fullImages[0] : null,
              images: fullImages,
              phone: foundProduct.description?.match(/Тел:?\s*(\+?\d+)/i)?.[1] || "",
              user_id: foundProduct.user_id || null,
              seller_name: foundProduct.seller_name || null,
            };
            setProduct(normalizedProduct);
          }
        }
      } catch (error) {
        console.error("Ошибка загрузки товара:", error);
      } finally {
        setLoading(false);
      }
    };

    const loadReviews = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reviews/${productId}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data);
          
          // Находим отзыв текущего пользователя
          const userStr = localStorage.getItem("user");
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              const myReview = data.find(r => r.user_id === user.id);
              if (myReview) {
                setUserReview(myReview);
                setReviewText(myReview.comment || "");
                setReviewRating(myReview.rating || 5);
              } else {
                setUserReview(null);
                setReviewText("");
                setReviewRating(5);
              }
            } catch (e) {
              console.error("Ошибка парсинга пользователя:", e);
            }
          }
        }
      } catch (error) {
        console.error("Ошибка загрузки отзывов:", error);
      }
    };

    loadProduct();
    loadReviews();
  }, [productId]);

  // Загружаем информацию о продавце
  useEffect(() => {
    if (!product?.user_id) return;

    const loadSeller = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/user/${product.user_id}`);
        if (res.ok) {
          const sellerData = await res.json();
          setSeller(sellerData);
        }
      } catch (error) {
        console.error("Ошибка загрузки продавца:", error);
      }
    };

    loadSeller();
  }, [product?.user_id]);

  const handleAddToCart = () => {
    try {
      const cartId = `db-${product.id}`;
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
        cart.push({
          id: cartId,
          productId: product.id, // Сохраняем реальный ID товара для перехода
          name: product.name,
          price: product.price,
          image: product.image,
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
      showError("Ошибка при изменении корзины");
    }
  };

  const handleContactSeller = async () => {
    if (!isAuthenticated) {
      showWarning("Войдите в аккаунт, чтобы написать продавцу");
      router.push("/login");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/messages/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ad_id: parseInt(productId) }),
      });

        if (res.ok) {
          const chat = await res.json();
          router.push(`/chat/${chat.id}`);
        } else {
          const error = await res.json();
          showError(error.error || "Ошибка создания чата");
        }
      } catch (error) {
        console.error("Error creating chat:", error);
        showError("Ошибка создания чата");
      }
  };

  const handlePromote = async () => {
    if (!isAuthenticated) {
      showWarning("Войдите в аккаунт, чтобы продвинуть объявление");
      router.push("/login");
      return;
    }

    // Проверяем, что пользователь не продвигает свое объявление
    if (product.user_id && userId && product.user_id === userId) {
      showWarning("Вы не можете продвигать свои собственные объявления");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/ads/${productId}/promote`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const remainingPromotions = data.remaining_promotions || 0;
        const remainingText = remainingPromotions > 0 
          ? ` Осталось продвижений сегодня: ${remainingPromotions}`
          : " Это ваше последнее продвижение на сегодня.";
        showSuccess(`Объявление успешно продвинуто! Оно будет отображаться выше в поиске на 7 дней.${remainingText}`);
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка продвижения объявления");
      }
    } catch (error) {
      console.error("Error promoting ad:", error);
      showError("Ошибка продвижения объявления");
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/product/${productId}` : '';
    const shareText = `${product?.name || 'Товар'} - ${product?.price || ''}`;

    // Проверяем поддержку Web Share API (для мобильных устройств)
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name || 'Товар',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // Пользователь отменил поделиться или произошла ошибка
        if (error.name !== 'AbortError') {
          console.error('Ошибка поделиться:', error);
          copyToClipboard(shareUrl);
        }
      }
    } else {
      // Для устройств без поддержки Web Share API копируем ссылку
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showSuccess('Ссылка скопирована в буфер обмена!');
      }).catch((err) => {
        console.error('Ошибка копирования:', err);
        fallbackCopyToClipboard(text);
      });
    } else {
      fallbackCopyToClipboard(text);
    }
  };

  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showSuccess('Ссылка скопирована в буфер обмена!');
    } catch (err) {
      console.error('Ошибка копирования:', err);
      showInfo(`Ссылка на товар: ${text}`);
    }
    document.body.removeChild(textArea);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      showWarning("Необходимо войти в систему для оставления отзыва");
      router.push("/login");
      return;
    }

    if (!reviewText.trim()) {
      showWarning("Пожалуйста, введите текст отзыва");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: parseInt(productId),
          rating: reviewRating,
          comment: reviewText,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Ошибка отправки отзыва");
      }

      const updatedReview = await res.json();
      
      // Обновляем список отзывов
      if (userReview) {
        // Обновляем существующий отзыв
        setReviews(reviews.map(r => r.id === updatedReview.id ? updatedReview : r));
      } else {
        // Добавляем новый отзыв
        setReviews([updatedReview, ...reviews]);
      }
      
      setUserReview(updatedReview);
      setEditingReviewId(null);
      showSuccess(userReview ? "Отзыв успешно обновлен" : "Отзыв успешно добавлен");
    } catch (error) {
      console.error("Ошибка отправки отзыва:", error);
      showError(error.message || "Не удалось отправить отзыв");
    }
  };

  const handleEditReview = (review) => {
    setEditingReviewId(review.id);
    setReviewText(review.comment || "");
    setReviewRating(review.rating || 5);
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    if (userReview) {
      setReviewText(userReview.comment || "");
      setReviewRating(userReview.rating || 5);
    } else {
      setReviewText("");
      setReviewRating(5);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    const confirmed = await showConfirm("Вы уверены, что хотите удалить свой отзыв?", "Удалить отзыв");
    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Ошибка удаления отзыва");
      }

      // Удаляем отзыв из списка
      setReviews(reviews.filter(r => r.id !== reviewId));
      setUserReview(null);
      setReviewText("");
      setReviewRating(5);
      setEditingReviewId(null);
      showSuccess("Отзыв успешно удален");
    } catch (error) {
      console.error("Ошибка удаления отзыва:", error);
      showError(error.message || "Не удалось удалить отзыв");
    }
  };

  const cleanDescription = product?.description
    ? product.description
        .split("\n")
        .filter((line) => !line.trim().startsWith("Тел:") && !line.trim().startsWith("Тел."))
        .join("\n")
        .trim()
    : "";

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.loading}>Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.error}>Товар не найден</div>
          <Link href="/home" className={styles.backLink}>
            Вернуться на главную
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

        <div className={styles.productSection}>
          <div className={styles.imageSection}>
            {productImages.length > 1 ? (
              <div className={styles.carousel}>
                {imageError || !productImages[currentImageIndex] || productImages[currentImageIndex] === '/example.jpg' || (typeof productImages[currentImageIndex] === 'string' && productImages[currentImageIndex].includes('/example.jpg')) ? (
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
                    src={productImages[currentImageIndex]} 
                    alt={product.name} 
                    className={styles.productImage}
                    onClick={() => {
                      setLightboxImageIndex(currentImageIndex);
                      setLightboxOpen(true);
                    }}
                    onError={() => setImageError(true)}
                    style={{ cursor: 'pointer' }}
                  />
                )}
                <button
                  className={styles.carouselBtnLeft}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1));
                  }}
                  aria-label="Предыдущее фото"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  className={styles.carouselBtnRight}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0));
                  }}
                  aria-label="Следующее фото"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className={styles.carouselIndicators}>
                  {productImages.map((_, index) => (
                    <button
                      key={index}
                      className={`${styles.carouselDot} ${index === currentImageIndex ? styles.active : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              imageError || !product.image || product.image === '/example.jpg' || (typeof product.image === 'string' && product.image.includes('/example.jpg')) ? (
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
                  alt={product.name} 
                  className={styles.productImage}
                  onClick={() => {
                    setLightboxImageIndex(0);
                    setLightboxOpen(true);
                  }}
                  onError={() => setImageError(true)}
                  style={{ cursor: 'pointer' }}
                />
              )
            )}
          </div>

          <div className={styles.detailsSection}>
            <h1 className={styles.title}>{product.name}</h1>
            
            {cleanDescription && (
              <div className={styles.description}>
                <h3>Описание</h3>
                <p>{cleanDescription}</p>
              </div>
            )}

            <div className={styles.price}>
              {product.price ? (
                typeof product.price === 'string' && product.price.startsWith('₸')
                  ? product.price.replace(/\.00$/, '')
                  : `₸${String(product.price).replace(/\.00$/, '')}`
              ) : ''}
            </div>

            {product.phone && (
              <div className={styles.phone}>
                <strong>Номер продавца:</strong> {product.phone}
              </div>
            )}

            {seller && (
              <div 
                className={styles.sellerInfo}
                onClick={() => router.push(`/seller/${seller.id}`)}
              >
                <div className={styles.sellerAvatar}>
                  {seller.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className={styles.sellerDetails}>
                  <div className={styles.sellerName}>{seller.name || 'Неизвестный продавец'}</div>
                  <div className={styles.sellerLabel}>Продавец</div>
                </div>
                <div className={styles.sellerArrow}>→</div>
              </div>
            )}

            <div className={styles.actions}>
              <div className={styles.actionsRow}>
                <button 
                  className={`${styles.addToCartBtn} ${isInCart ? styles.added : ''}`} 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart();
                  }}
                >
                  {isInCart ? 'Добавлено' : 'В корзину'}
                </button>
                <button className={styles.shareBtn} onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}>
                  📤 Поделиться
                </button>
              </div>
              {/* Показываем кнопку продвижения только если пользователь не является владельцем объявления */}
              {product.user_id && userId && product.user_id !== userId && (
                <button className={styles.promoteBtn} onClick={(e) => {
                  e.stopPropagation();
                  handlePromote();
                }}>
                  ⭐ Продвинуть объявление
                </button>
              )}
              <button className={styles.contactBtn} onClick={(e) => {
                e.stopPropagation();
                handleContactSeller();
              }}>
                💬 Написать продавцу
              </button>
            </div>
          </div>
        </div>

        <div className={styles.reviewsSection}>
          <h2 className={styles.reviewsTitle}>Отзывы</h2>

          {isAuthenticated && (
            <form className={styles.reviewForm} onSubmit={handleSubmitReview}>
              <div className={styles.reviewFormHeader}>
                <h3>{userReview ? "Ваш отзыв" : "Оставить отзыв"}</h3>
                {userReview && editingReviewId !== userReview.id && (
                  <div className={styles.reviewFormActions}>
                    <button 
                      type="button" 
                      className={styles.editReviewBtn}
                      onClick={() => handleEditReview(userReview)}
                    >
                      Редактировать
                    </button>
                  </div>
                )}
              </div>
              <div className={styles.ratingSection}>
                <label>Оценка:</label>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(parseInt(e.target.value))}
                  className={styles.ratingSelect}
                  disabled={userReview && editingReviewId !== userReview.id}
                >
                  <option value={5}>5 звезд</option>
                  <option value={4}>4 звезды</option>
                  <option value={3}>3 звезды</option>
                  <option value={2}>2 звезды</option>
                  <option value={1}>1 звезда</option>
                </select>
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Оставьте ваш отзыв..."
                className={styles.reviewTextarea}
                rows={4}
                disabled={userReview && editingReviewId !== userReview.id}
              />
              {(editingReviewId === userReview?.id || !userReview) && (
                <div className={styles.reviewFormButtons}>
                  <button type="submit" className={styles.submitReviewBtn}>
                    {userReview ? "Обновить отзыв" : "Отправить отзыв"}
                  </button>
                  {editingReviewId === userReview?.id && (
                    <button 
                      type="button" 
                      className={styles.cancelEditBtn}
                      onClick={handleCancelEdit}
                    >
                      Отмена
                    </button>
                  )}
                </div>
              )}
            </form>
          )}

          <div className={styles.reviewsList}>
            {reviews.length === 0 ? (
              <p className={styles.noReviews}>Пока нет отзывов. Будьте первым!</p>
            ) : (
              reviews
                .filter(review => review.id !== userReview?.id || editingReviewId === review.id)
                .map((review) => (
                <div key={review.id} className={styles.reviewItem}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewUserInfo}>
                      <div className={styles.reviewUserName}>
                        {review.user_name || "Анонимный пользователь"}
                      </div>
                      <div className={styles.reviewRating}>
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill={i < review.rating ? "#FFB800" : "#E0E0E0"}
                            style={{ marginRight: i < 4 ? "2px" : "0" }}
                          >
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <div className={styles.reviewHeaderRight}>
                      <div className={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString("ru-RU")}
                      </div>
                      {userId && review.user_id === userId && editingReviewId !== review.id && (
                        <div className={styles.reviewActions}>
                          <button 
                            className={styles.deleteReviewBtn}
                            onClick={() => handleDeleteReview(review.id)}
                            title="Удалить отзыв"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {review.comment && (
                    <p className={styles.reviewComment}>{review.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lightbox для просмотра фото */}
        {lightboxOpen && (
          <div 
            className={styles.lightbox} 
            onClick={() => setLightboxOpen(false)}
          >
            <button
              className={styles.lightboxClose}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
              aria-label="Закрыть"
            >
              ✕
            </button>
            {productImages.length > 1 && (
              <>
                <button
                  className={styles.lightboxPrev}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImageIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1));
                  }}
                  aria-label="Предыдущее фото"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  className={styles.lightboxNext}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImageIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0));
                  }}
                  aria-label="Следующее фото"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </>
            )}
            <div 
              className={styles.lightboxContent}
              onClick={(e) => e.stopPropagation()}
            >
              {productImages.length > 0 ? (
                <img 
                  src={productImages[lightboxImageIndex]} 
                  alt={`${product.name} - фото ${lightboxImageIndex + 1}`}
                  className={styles.lightboxImage}
                />
              ) : (
                <img 
                  src={product.image} 
                  alt={product.name}
                  className={styles.lightboxImage}
                />
              )}
              {productImages.length > 1 && (
                <div className={styles.lightboxIndicators}>
                  {productImages.map((_, index) => (
                    <button
                      key={index}
                      className={`${styles.lightboxDot} ${index === lightboxImageIndex ? styles.active : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxImageIndex(index);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
