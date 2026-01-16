"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/logo/logo";
import { useModal } from "@/contexts/ModalContext";
import { useTheme } from "@/contexts/ThemeContext";
import styles from "./page.module.css";
import { API_BASE } from "@/config/api";

export default function ProfilePage() {
  const router = useRouter();
  const { showSuccess, showError, showWarning, showConfirm } = useModal();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [phoneForm, setPhoneForm] = useState({
    phone: "",
    smsCode: ""
  });
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingPhone, setLoadingPhone] = useState(false);
  const [userAds, setUserAds] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [banners, setBanners] = useState([]);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerUrl, setBannerUrl] = useState("");
  const [modalSettings, setModalSettings] = useState({
    title: "",
    message: "",
    button_text: "Понятно",
    is_active: true
  });
  const [loadingModal, setLoadingModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    setIsAuthenticated(true);
    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setIsAdmin(userData.role === "admin");
      
      // Загружаем объявления пользователя
      loadUserAds(userData.id);
      
      // Загружаем отзывы пользователя
      loadUserReviews(userData.id);
      
      // Если админ, загружаем баннеры и настройки модального окна
      if (userData.role === "admin") {
        loadBanners();
        loadModalSettings();
      }
    } catch (e) {
      console.error("Ошибка парсинга пользователя:", e);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadUserAds = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/api/ads`);
      if (res.ok) {
        const data = await res.json();
        // Фильтруем объявления по user_id
        const ads = data.filter(ad => ad.user_id === userId);
        setUserAds(ads);
      }
    } catch (error) {
      console.error("Ошибка загрузки объявлений:", error);
    }
  };

  const handleDeleteAd = async (adId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const confirmed = await showConfirm("Вы уверены, что хотите удалить это объявление?", "Удалить объявление");
    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/ads/${adId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.ok) {
        // Обновляем список объявлений
        const userData = JSON.parse(localStorage.getItem("user"));
        await loadUserAds(userData.id);
        showSuccess("Объявление успешно удалено");
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка удаления объявления");
      }
    } catch (error) {
      console.error("Ошибка удаления объявления:", error);
      showError("Ошибка удаления объявления");
    }
  };

  const loadUserReviews = async (userId) => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`${API_BASE}/api/reviews/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserReviews(data);
      }
    } catch (error) {
      console.error("Ошибка загрузки отзывов:", error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const loadBanners = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/banners`);
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (error) {
      console.error("Ошибка загрузки баннеров:", error);
    }
  };

  const handleBannerImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    if (!bannerImage || !bannerUrl.trim()) {
      showWarning("Заполните все поля");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", bannerImage);
      formData.append("url", bannerUrl.trim());

      const res = await fetch(`${API_BASE}/api/banners`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        await loadBanners();
        setShowBannerForm(false);
        setBannerImage(null);
        setBannerPreview(null);
        setBannerUrl("");
        showSuccess("Баннер успешно добавлен");
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка добавления баннера");
      }
    } catch (error) {
      console.error("Ошибка добавления баннера:", error);
      showError("Ошибка добавления баннера");
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    const confirmed = await showConfirm("Вы уверены, что хотите удалить этот баннер?", "Удалить баннер");
    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/banners/${bannerId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.ok) {
        await loadBanners();
        showSuccess("Баннер успешно удален");
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка удаления баннера");
      }
    } catch (error) {
      console.error("Ошибка удаления баннера:", error);
      showError("Ошибка удаления баннера");
    }
  };

  const loadModalSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/welcome-modal`);
      if (res.ok) {
        const data = await res.json();
        setModalSettings({
          title: data.title || "",
          message: data.message || "",
          button_text: data.button_text || "Понятно",
          is_active: data.is_active !== undefined ? data.is_active : true
        });
      }
    } catch (error) {
      console.error("Ошибка загрузки настроек модального окна:", error);
    }
  };

  const handleModalSettingsChange = (field, value) => {
    setModalSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleModalSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoadingModal(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/welcome-modal`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(modalSettings),
      });

      if (res.ok) {
        showSuccess("Настройки модального окна успешно сохранены");
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка сохранения настроек");
      }
    } catch (error) {
      console.error("Ошибка сохранения настроек:", error);
      showError("Ошибка сохранения настроек");
    } finally {
      setLoadingModal(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm("Вы уверены, что хотите выйти?", "Выйти из аккаунта");
    if (confirmed) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/");
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError("Новые пароли не совпадают");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showError("Пароль должен содержать минимум 6 символов");
      return;
    }

    setLoadingPassword(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        }),
      });

      if (res.ok) {
        showSuccess("Пароль успешно изменен");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка изменения пароля");
      }
    } catch (error) {
      console.error("Ошибка изменения пароля:", error);
      showError("Ошибка изменения пароля");
    } finally {
      setLoadingPassword(false);
    }
  };

  const handlePhoneChange = async (e) => {
    e.preventDefault();
    
    setLoadingPhone(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/auth/change-phone`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phoneForm.phone,
          smsCode: phoneForm.smsCode
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showSuccess("Номер телефона успешно изменен");
        // Обновляем данные пользователя
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
        setPhoneForm({
          phone: "",
          smsCode: ""
        });
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка изменения номера телефона");
      }
    } catch (error) {
      console.error("Ошибка изменения номера телефона:", error);
      showError("Ошибка изменения номера телефона");
    } finally {
      setLoadingPhone(false);
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

  if (!isAuthenticated || !user) {
    // Показываем приветствие для незарегистрированных пользователей
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.welcomeSection}>
            <Logo style={{ fontSize: "48px", marginBottom: "24px" }} />
            
            <h1 className={styles.welcomeTitle}>Добро пожаловать!</h1>
            
            <p className={styles.welcomeTagline}>
              Простая и быстрая площадка для<br /> покупки и продажи любых товаров.
            </p>

            <div className={styles.welcomeActions}>
              <Link href="/register" className={styles.welcomeCtaButton}>
                Создать аккаунт
              </Link>

              <Link href="/login" className={styles.welcomeLoginLink}>
                У меня уже есть аккаунт
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={styles.arrowIcon}
                >
                  <path
                    d="M5 12H19M19 12L12 5M19 12L12 19"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const avatarUrl = user.avatar_url
    ? user.avatar_url.startsWith("http")
      ? user.avatar_url
      : `${API_BASE}${user.avatar_url}`
    : null;

  const displayName = user.name || "Пользователь";
  const displayPhone = user.phone || "";
  const displayRole = user.role === "admin" ? "Администратор" : user.role === "seller" ? "Продавец" : "Покупатель";

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>Профиль</h1>

        <div className={styles.profileSection}>
          <div className={styles.avatarSection}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className={styles.avatar} onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }} />
            ) : null}
            <div 
              className={styles.avatarPlaceholder}
              style={{ display: avatarUrl ? 'none' : 'flex' }}
            >
              {displayName[0].toUpperCase()}
            </div>
          </div>

          <div className={styles.userInfo}>
            <h2 className={styles.userName}>{displayName}</h2>
            <div className={styles.userDetail}>
              <span className={styles.label}>Телефон:</span>
              <span className={styles.value}>{displayPhone}</span>
            </div>
            <div className={styles.userDetail}>
              <span className={styles.label}>Роль:</span>
              <span className={styles.value}>{displayRole}</span>
            </div>
          </div>
        </div>

        <div className={styles.statsSection}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{userAds.length}</div>
            <div className={styles.statLabel}>Мои объявления</div>
          </div>
        </div>

        <div className={styles.adsSection}>
          <h3 className={styles.sectionTitle}>Мои объявления</h3>
          {userAds.length === 0 ? (
            <div className={styles.emptyState}>
              <p>У вас пока нет объявлений</p>
            </div>
          ) : (
            <div className={styles.adsList}>
              {userAds.map((ad) => {
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

                return (
                  <div key={ad.id} className={styles.adItemWrapper}>
                    <Link 
                      href={`/product/${ad.id}`}
                      className={styles.adItem}
                    >
                      <div className={styles.adImageWrapper}>
                        <img 
                          src={fullImageUrl} 
                          alt={ad.title} 
                          className={styles.adImage}
                        />
                      </div>
                      <div className={styles.adInfo}>
                        <div className={styles.adTitle}>{ad.title}</div>
                        <div className={styles.adPrice}>₸{String(ad.price).replace(/\.00$/, '')}</div>
                      </div>
                    </Link>
                    <button
                      className={styles.deleteAdBtn}
                      onClick={(e) => handleDeleteAd(ad.id, e)}
                      aria-label="Удалить объявление"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Секция моих отзывов */}
        <div className={styles.reviewsSection}>
          <h3 className={styles.sectionTitle}>Мои отзывы</h3>
          {loadingReviews ? (
            <div className={styles.emptyState}>
              <p>Загрузка отзывов...</p>
            </div>
          ) : userReviews.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Вы еще не оставляли отзывы</p>
            </div>
          ) : (
            <div className={styles.reviewsList}>
              {userReviews.map((review) => {
                let productImageUrl = null;
                if (review.product_image) {
                  try {
                    const parsed = JSON.parse(review.product_image);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      productImageUrl = parsed[0];
                    } else if (typeof parsed === 'string') {
                      productImageUrl = parsed;
                    }
                  } catch {
                    productImageUrl = review.product_image;
                  }
                }

                const fullProductImageUrl = productImageUrl
                  ? productImageUrl.startsWith("http")
                    ? productImageUrl
                    : `${API_BASE}${productImageUrl}`
                  : null;

                return (
                  <Link
                    key={review.id}
                    href={`/product/${review.product_id}`}
                    className={styles.reviewItem}
                  >
                    {fullProductImageUrl && (
                      <div className={styles.reviewProductImageWrapper}>
                        <img 
                          src={fullProductImageUrl} 
                          alt={review.product_title || "Товар"} 
                          className={styles.reviewProductImage}
                        />
                      </div>
                    )}
                    <div className={styles.reviewContent}>
                      <div className={styles.reviewProductTitle}>
                        {review.product_title || "Товар"}
                      </div>
                      <div className={styles.reviewRating}>
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill={i < review.rating ? "#FFB800" : "#E0E0E0"}
                            style={{ marginRight: i < 4 ? "2px" : "0" }}
                          >
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                          </svg>
                        ))}
                      </div>
                      {review.comment && (
                        <div className={styles.reviewComment}>{review.comment}</div>
                      )}
                      <div className={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Секция админ-панели */}
        {isAdmin && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Админ-панель</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link href="/admin/analytics" className={styles.adminLink}>
                📊 Аналитика
              </Link>
              <Link href="/admin/ads" className={styles.adminLink}>
                🎯 Управление рекламой
              </Link>
            </div>
          </div>
        )}

        {/* Секция управления баннерами для админа */}
        {isAdmin && (
          <div className={styles.bannersSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Управление баннерами</h3>
              <button 
                className={styles.addBannerBtn}
                onClick={() => setShowBannerForm(!showBannerForm)}
              >
                {showBannerForm ? "✕ Отмена" : "➕ Добавить баннер"}
              </button>
            </div>

            {showBannerForm && (
              <form className={styles.bannerForm} onSubmit={handleBannerSubmit}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Изображение баннера</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerImageChange}
                    className={styles.fileInput}
                    required
                  />
                  {bannerPreview && (
                    <img src={bannerPreview} alt="Preview" className={styles.bannerPreview} />
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>URL ссылки</label>
                  <input
                    type="url"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://example.com или /page"
                    className={styles.formInput}
                    required
                  />
                </div>
                <button type="submit" className={styles.submitBannerBtn}>
                  Сохранить баннер
                </button>
              </form>
            )}

            {banners.length > 0 ? (
              <div className={styles.bannersList}>
                {banners.map((banner) => {
                  const imageUrl = banner.image_url
                    ? banner.image_url.startsWith("http")
                      ? banner.image_url
                      : `${API_BASE}${banner.image_url}`
                    : null;

                  return (
                    <div key={banner.id} className={styles.bannerItem}>
                      <div className={styles.bannerPreviewItem}>
                        {imageUrl ? (
                          <img src={imageUrl} alt="Баннер" className={styles.bannerPreviewImage} />
                        ) : (
                          <div className={styles.bannerPlaceholder}>Нет изображения</div>
                        )}
                      </div>
                      <div className={styles.bannerInfo}>
                        <div className={styles.bannerUrl}>{banner.url}</div>
                      </div>
                      <button
                        className={styles.deleteBannerBtn}
                        onClick={() => handleDeleteBanner(banner.id)}
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>Баннеры отсутствуют</p>
              </div>
            )}
          </div>
        )}

        {/* Секция управления модальным окном приветствия для админа */}
        {isAdmin && (
          <div className={styles.welcomeModalSection}>
            <h3 className={styles.sectionTitle}>Модальное окно приветствия</h3>
            
            <form className={styles.modalSettingsForm} onSubmit={handleModalSettingsSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Заголовок</label>
                <input
                  type="text"
                  value={modalSettings.title}
                  onChange={(e) => handleModalSettingsChange('title', e.target.value)}
                  placeholder="Добро пожаловать!"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Текст сообщения</label>
                <textarea
                  value={modalSettings.message}
                  onChange={(e) => handleModalSettingsChange('message', e.target.value)}
                  placeholder="Ваш текст сообщения..."
                  className={styles.formTextarea}
                  rows={6}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Текст кнопки</label>
                <input
                  type="text"
                  value={modalSettings.button_text}
                  onChange={(e) => handleModalSettingsChange('button_text', e.target.value)}
                  placeholder="Понятно"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={modalSettings.is_active}
                    onChange={(e) => handleModalSettingsChange('is_active', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>Активно (показывать модальное окно)</span>
                </label>
              </div>

              <button 
                type="submit" 
                className={styles.submitModalBtn}
                disabled={loadingModal}
              >
                {loadingModal ? "Сохранение..." : "Сохранить настройки"}
              </button>
            </form>
          </div>
        )}

        {/* Секция настроек */}
        <div className={styles.settingsSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Настройки</h3>
            <button 
              className={styles.toggleSettingsBtn}
              onClick={() => setShowSettings(!showSettings)}
            >
              {showSettings ? "✕ Скрыть" : "⚙️ Показать"}
            </button>
          </div>

          {showSettings && (
            <div className={styles.settingsContent}>
              {/* Переключатель темы */}
              <div className={styles.settingItem}>
                <div className={styles.settingLabel}>
                  <span className={styles.settingTitle}>Тема</span>
                  <span className={styles.settingDescription}>Светлая / Темная</span>
                </div>
                <button 
                  className={`${styles.themeToggle} ${theme === 'dark' ? styles.dark : styles.light}`}
                  onClick={toggleTheme}
                  aria-label="Переключить тему"
                >
                  <span className={styles.themeToggleIcon}>
                    {theme === 'dark' ? '🌙' : '☀️'}
                  </span>
                  <span className={styles.themeToggleText}>
                    {theme === 'dark' ? 'Темная' : 'Светлая'}
                  </span>
                </button>
              </div>

              {/* Смена пароля */}
              <div className={styles.settingItem}>
                <h4 className={styles.settingSubtitle}>Изменить пароль</h4>
                <form onSubmit={handlePasswordChange} className={styles.settingForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Текущий пароль</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className={styles.formInput}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Новый пароль</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      className={styles.formInput}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Подтвердите новый пароль</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      className={styles.formInput}
                      required
                      minLength={6}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className={styles.submitSettingBtn}
                    disabled={loadingPassword}
                  >
                    {loadingPassword ? "Сохранение..." : "Изменить пароль"}
                  </button>
                </form>
              </div>

              {/* Смена номера телефона */}
              <div className={styles.settingItem}>
                <h4 className={styles.settingSubtitle}>Изменить номер телефона</h4>
                <form onSubmit={handlePhoneChange} className={styles.settingForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Новый номер телефона</label>
                    <input
                      type="tel"
                      value={phoneForm.phone}
                      onChange={(e) => setPhoneForm({...phoneForm, phone: e.target.value})}
                      placeholder="+7XXXXXXXXXX"
                      className={styles.formInput}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Код подтверждения</label>
                    <input
                      type="text"
                      value={phoneForm.smsCode}
                      onChange={(e) => setPhoneForm({...phoneForm, smsCode: e.target.value})}
                      placeholder="1234"
                      className={styles.formInput}
                      required
                    />
                    <span className={styles.formHint}>Используйте код: 1234</span>
                  </div>
                  <button 
                    type="submit" 
                    className={styles.submitSettingBtn}
                    disabled={loadingPhone}
                  >
                    {loadingPhone ? "Сохранение..." : "Изменить номер"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className={styles.actionsSection}>
          <Link href="/add" className={styles.actionButton}>
            ➕ Создать объявление
          </Link>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
}
