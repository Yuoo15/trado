"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useModal } from "@/contexts/ModalContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProfileEdit from "@/components/profile-edit/ProfileEdit";
import styles from "./page.module.css";
import { API_BASE } from "@/config/api";

export default function ProfilePage() {
  const router = useRouter();
  const { showSuccess, showError, showWarning, showConfirm } = useModal();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("ads"); // ads, reviews, settings, admin
  const [userAds, setUserAds] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Settings state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loadingPassword, setLoadingPassword] = useState(false);

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
      loadUserAds(userData.id);
      loadUserReviews(userData.id);
    } catch (e) {
      console.error("Ошибка парсинга пользователя:", e);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserAds = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/api/ads`);
      if (res.ok) {
        const data = await res.json();
        const ads = data.filter(ad => ad.user_id === userId);
        setUserAds(ads);
      }
    } catch (error) {
      console.error("Ошибка загрузки объявлений:", error);
    }
  };

  const loadUserReviews = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/api/reviews/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserReviews(data);
      }
    } catch (error) {
      console.error("Ошибка загрузки отзывов:", error);
    }
  };

  const handleDeleteAd = async (adId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const confirmed = await showConfirm("Вы уверены, что хотите удалить это объявление?", "Удалить объявление");
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/ads/${adId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (res.ok) {
        const userData = JSON.parse(localStorage.getItem("user"));
        await loadUserAds(userData.id);
        showSuccess("Объявление удалено");
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка удаления");
      }
    } catch (error) {
      showError("Ошибка удаления объявления");
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError("Пароли не совпадают");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showError("Пароль должен быть минимум 6 символов");
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
        showSuccess("Пароль изменен");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка изменения пароля");
      }
    } catch (error) {
      showError("Ошибка изменения пароля");
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm("Вы уверены, что хотите выйти?", "Выйти");
    if (confirmed) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/");
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
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.welcomeSection}>
            <h1 className={styles.welcomeTitle}>Добро пожаловать!</h1>
            <p className={styles.welcomeTagline}>
              Простая и быстрая площадка для покупки и продажи товаров.
            </p>
            <div className={styles.welcomeActions}>
              <Link href="/register" className={styles.welcomeCtaButton}>
                Создать аккаунт
              </Link>
              <Link href="/login" className={styles.welcomeLoginLink}>
                Войти
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user.name || "Пользователь";
  const displayPhone = user.phone || "";
  const displayRole = user.role === "admin" ? "Администратор" : user.role === "seller" ? "Продавец" : "Покупатель";

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* Шапка профиля */}
        <div className={styles.profileHeader}>
          <ProfileEdit user={user} onUpdate={(updatedUser) => setUser(updatedUser)} />
          
          <div className={styles.profileInfo}>
            <h1 className={styles.profileName}>{displayName}</h1>
            <div className={styles.profileStats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{userAds.length}</span>
                <span className={styles.statLabel}>Объявления</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{userReviews.length}</span>
                <span className={styles.statLabel}>Отзывы</span>
              </div>
            </div>
          </div>
        </div>

        {/* Вкладки */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "ads" ? styles.active : ""}`}
            onClick={() => setActiveTab("ads")}
          >
            📦 Объявления
          </button>
          <button
            className={`${styles.tab} ${activeTab === "reviews" ? styles.active : ""}`}
            onClick={() => setActiveTab("reviews")}
          >
            ⭐ Отзывы
          </button>
          <button
            className={`${styles.tab} ${activeTab === "settings" ? styles.active : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            ⚙️ Настройки
          </button>
          {isAdmin && (
            <button
              className={`${styles.tab} ${activeTab === "admin" ? styles.active : ""}`}
              onClick={() => setActiveTab("admin")}
            >
              👑 Админ
            </button>
          )}
        </div>

        {/* Контент вкладок */}
        <div className={styles.tabContent}>
          {/* Объявления */}
          {activeTab === "ads" && (
            <div className={styles.adsTab}>
              {userAds.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>У вас пока нет объявлений</p>
                  <Link href="/add" className={styles.addButton}>
                    ➕ Создать объявление
                  </Link>
                </div>
              ) : (
                <div className={styles.adsList}>
                  {userAds.map((ad) => {
                    let imageUrl = ad.image_url;
                    try {
                      const parsed = JSON.parse(ad.image_url);
                      if (Array.isArray(parsed) && parsed.length > 0) {
                        imageUrl = parsed[0];
                      }
                    } catch {}

                    const fullImageUrl = imageUrl
                      ? imageUrl.startsWith("http")
                        ? imageUrl
                        : `${API_BASE}${imageUrl}`
                      : "/example.jpg";

                    return (
                      <div key={ad.id} className={styles.adItem}>
                        <Link href={`/product/${ad.id}`} className={styles.adLink}>
                          <img src={fullImageUrl} alt={ad.title} className={styles.adImage} />
                          <div className={styles.adInfo}>
                            <div className={styles.adTitle}>{ad.title}</div>
                            <div className={styles.adPrice}>₸{String(ad.price).replace(/\.00$/, '')}</div>
                          </div>
                        </Link>
                        <button
                          className={styles.deleteBtn}
                          onClick={(e) => handleDeleteAd(ad.id, e)}
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Отзывы */}
          {activeTab === "reviews" && (
            <div className={styles.reviewsTab}>
              {userReviews.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Вы еще не оставляли отзывы</p>
                </div>
              ) : (
                <div className={styles.reviewsList}>
                  {userReviews.map((review) => (
                    <Link
                      key={review.id}
                      href={`/product/${review.product_id}`}
                      className={styles.reviewItem}
                    >
                      <div className={styles.reviewRating}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={i < review.rating ? styles.starFilled : styles.star}>
                            ⭐
                          </span>
                        ))}
                      </div>
                      <div className={styles.reviewComment}>{review.comment}</div>
                      <div className={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString("ru-RU")}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Настройки */}
          {activeTab === "settings" && (
            <div className={styles.settingsTab}>
              {/* Тема */}
              <div className={styles.settingItem}>
                <div>
                  <div className={styles.settingTitle}>Тема оформления</div>
                  <div className={styles.settingDesc}>Светлая или темная тема</div>
                </div>
                <button
                  className={styles.themeToggle}
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? '🌙 Темная' : '☀️ Светлая'}
                </button>
              </div>

              {/* Смена пароля */}
              <div className={styles.settingItem}>
                <div className={styles.settingTitle}>Изменить пароль</div>
                <form onSubmit={handlePasswordChange} className={styles.passwordForm}>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    placeholder="Текущий пароль"
                    className={styles.input}
                    required
                  />
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    placeholder="Новый пароль"
                    className={styles.input}
                    required
                    minLength={6}
                  />
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    placeholder="Подтвердите пароль"
                    className={styles.input}
                    required
                    minLength={6}
                  />
                  <button type="submit" className={styles.saveButton} disabled={loadingPassword}>
                    {loadingPassword ? "Сохранение..." : "Изменить пароль"}
                  </button>
                </form>
              </div>

              {/* Выход */}
              <div className={styles.settingItem}>
                <button onClick={handleLogout} className={styles.logoutButton}>
                  Выйти из аккаунта
                </button>
              </div>
            </div>
          )}

          {/* Админ панель */}
          {activeTab === "admin" && isAdmin && (
            <div className={styles.adminTab}>
              <Link href="/admin/analytics" className={styles.adminLink}>
                📊 Аналитика
              </Link>
              <Link href="/admin/ads" className={styles.adminLink}>
                🎯 Управление рекламой
              </Link>
              <Link href="/admin/welcome-modal" className={styles.adminLink}>
                👋 Управление приветственным окном
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
