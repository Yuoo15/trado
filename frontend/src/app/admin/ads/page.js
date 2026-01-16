"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useModal } from "@/contexts/ModalContext";
import styles from "./page.module.css";
import { API_BASE } from "@/config/api";

export default function AdsManagementPage() {
  const router = useRouter();
  const { showError, showSuccess, showConfirm } = useModal();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [banners, setBanners] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerUrl, setBannerUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [selectedBannerId, setSelectedBannerId] = useState(null);
  const [detailedAnalytics, setDetailedAnalytics] = useState(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  useEffect(() => {
    const checkAdmin = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.role !== "admin") {
            showError("Доступ запрещен");
            router.push("/home");
            return;
          }
          setIsAdmin(true);
        } catch (e) {
          console.error("Ошибка парсинга пользователя:", e);
          router.push("/login");
        }
      } else {
        router.push("/login");
      }
    };

    checkAdmin();
  }, [router, showError]);

  useEffect(() => {
    if (!isAdmin) return;

    loadBanners();
    loadAnalytics();
  }, [isAdmin]);

  const loadBanners = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/banners`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка загрузки баннеров");
      }
    } catch (error) {
      console.error("Ошибка загрузки баннеров:", error);
      showError("Ошибка загрузки баннеров");
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/banners/analytics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Ошибка загрузки аналитики:", error);
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
      showError("Заполните все поля");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", bannerImage);
      formData.append("url", bannerUrl.trim());
      formData.append("display_order", displayOrder.toString());

      const res = await fetch(`${API_BASE}/api/banners`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        await loadBanners();
        await loadAnalytics();
        setShowAddForm(false);
        setBannerImage(null);
        setBannerPreview(null);
        setBannerUrl("");
        setDisplayOrder(0);
        showSuccess("Реклама успешно добавлена");
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка добавления рекламы");
      }
    } catch (error) {
      console.error("Ошибка добавления рекламы:", error);
      showError("Ошибка добавления рекламы");
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    const confirmed = await showConfirm("Вы уверены, что хотите удалить эту рекламу?", "Удалить рекламу");
    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/banners/${bannerId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        await loadBanners();
        await loadAnalytics();
        showSuccess("Реклама успешно удалена");
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка удаления рекламы");
      }
    } catch (error) {
      console.error("Ошибка удаления рекламы:", error);
      showError("Ошибка удаления рекламы");
    }
  };

  const loadBannerAnalytics = async (bannerId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/banners/analytics/${bannerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedBannerId(bannerId);
        setDetailedAnalytics(data);
        setShowAnalyticsModal(true);
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка загрузки аналитики");
      }
    } catch (error) {
      console.error("Ошибка загрузки аналитики баннера:", error);
      showError("Ошибка загрузки аналитики баннера");
    }
  };

  if (!isAdmin || loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.loading}>Загрузка...</div>
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

        <h1 className={styles.title}>Управление рекламой</h1>

        {/* Общая статистика */}
        {analytics && analytics.totalStats && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📊</div>
              <div className={styles.statValue}>{analytics.totalStats.total_clicks}</div>
              <div className={styles.statLabel}>Всего переходов</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📈</div>
              <div className={styles.statValue}>{analytics.totalStats.clicks_last_7_days}</div>
              <div className={styles.statLabel}>За 7 дней</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📉</div>
              <div className={styles.statValue}>{analytics.totalStats.clicks_last_30_days}</div>
              <div className={styles.statLabel}>За 30 дней</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎯</div>
              <div className={styles.statValue}>{banners.length}</div>
              <div className={styles.statLabel}>Активных реклам</div>
            </div>
          </div>
        )}

        {/* Кнопка добавления */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Рекламные баннеры</h2>
          <button 
            className={styles.addButton}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "✕ Отмена" : "➕ Добавить рекламу"}
          </button>
        </div>

        {/* Форма добавления */}
        {showAddForm && (
          <form className={styles.form} onSubmit={handleBannerSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Изображение рекламы</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerImageChange}
                className={styles.fileInput}
                required
              />
              {bannerPreview && (
                <img src={bannerPreview} alt="Preview" className={styles.previewImage} />
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
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Порядок отображения</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                placeholder="0"
                className={styles.formInput}
                min="0"
              />
            </div>
            <button type="submit" className={styles.submitButton}>
              Сохранить рекламу
            </button>
          </form>
        )}

        {/* Список реклам */}
        {banners.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Реклама отсутствует</p>
          </div>
        ) : (
          <div className={styles.bannersList}>
            {banners.map((banner) => {
              const bannerAnalytics = analytics?.banners?.find(b => b.id === banner.id);
              const imageUrl = banner.image_url
                ? banner.image_url.startsWith("http")
                  ? banner.image_url
                  : `${API_BASE}${banner.image_url}`
                : null;

              return (
                <div key={banner.id} className={styles.bannerItem}>
                  <div className={styles.bannerPreview}>
                    {imageUrl ? (
                      <img src={imageUrl} alt="Реклама" className={styles.bannerImage} />
                    ) : (
                      <div className={styles.bannerPlaceholder}>Нет изображения</div>
                    )}
                  </div>
                  <div className={styles.bannerInfo}>
                    <div className={styles.bannerUrl}>{banner.url}</div>
                    <div className={styles.bannerStats}>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Всего переходов:</span>
                        <span className={styles.statValue}>{bannerAnalytics?.total_clicks || 0}</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>За 7 дней:</span>
                        <span className={styles.statValue}>{bannerAnalytics?.clicks_last_7_days || 0}</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>За 30 дней:</span>
                        <span className={styles.statValue}>{bannerAnalytics?.clicks_last_30_days || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.bannerActions}>
                    <button
                      className={styles.analyticsButton}
                      onClick={() => loadBannerAnalytics(banner.id)}
                      title="Просмотр аналитики"
                    >
                      📊
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteBanner(banner.id)}
                      aria-label="Удалить рекламу"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Модальное окно детальной аналитики */}
        {showAnalyticsModal && detailedAnalytics && (
          <div className={styles.modalOverlay} onClick={() => setShowAnalyticsModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>📊 Детальная аналитика баннера</h2>
                <button 
                  className={styles.modalClose}
                  onClick={() => setShowAnalyticsModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.detailedStatsGrid}>
                  <div className={styles.detailedStatCard}>
                    <div className={styles.detailedStatIcon}>📊</div>
                    <div className={styles.detailedStatValue}>{detailedAnalytics.totalClicks || 0}</div>
                    <div className={styles.detailedStatLabel}>Всего переходов</div>
                  </div>
                  <div className={styles.detailedStatCard}>
                    <div className={styles.detailedStatIcon}>📈</div>
                    <div className={styles.detailedStatValue}>{detailedAnalytics.last7Days || 0}</div>
                    <div className={styles.detailedStatLabel}>За 7 дней</div>
                  </div>
                  <div className={styles.detailedStatCard}>
                    <div className={styles.detailedStatIcon}>📉</div>
                    <div className={styles.detailedStatValue}>{detailedAnalytics.last30Days || 0}</div>
                    <div className={styles.detailedStatLabel}>За 30 дней</div>
                  </div>
                  <div className={styles.detailedStatCard}>
                    <div className={styles.detailedStatIcon}>👤</div>
                    <div className={styles.detailedStatValue}>{detailedAnalytics.authClicks || 0}</div>
                    <div className={styles.detailedStatLabel}>Авторизованные</div>
                  </div>
                  <div className={styles.detailedStatCard}>
                    <div className={styles.detailedStatIcon}>👁️</div>
                    <div className={styles.detailedStatValue}>{detailedAnalytics.guestClicks || 0}</div>
                    <div className={styles.detailedStatLabel}>Гости</div>
                  </div>
                </div>

                {detailedAnalytics.clicksByDay && detailedAnalytics.clicksByDay.length > 0 && (
                  <div className={styles.dailyStats}>
                    <h3 className={styles.dailyStatsTitle}>Клики по дням (последние 30 дней)</h3>
                    <div className={styles.dailyStatsList}>
                      {detailedAnalytics.clicksByDay.slice(0, 10).map((day, idx) => (
                        <div key={idx} className={styles.dailyStatItem}>
                          <span className={styles.dailyStatDate}>
                            {new Date(day.date).toLocaleDateString('ru-RU', { 
                              day: '2-digit', 
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                          <span className={styles.dailyStatValue}>{day.count}</span>
                        </div>
                      ))}
                      {detailedAnalytics.clicksByDay.length > 10 && (
                        <div className={styles.dailyStatMore}>
                          ... и еще {detailedAnalytics.clicksByDay.length - 10} дней
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
