"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useModal } from "@/contexts/ModalContext";
import styles from "./page.module.css";
import { API_BASE } from "@/config/api";

export default function AnalyticsPage() {
  const router = useRouter();
  const { showError } = useModal();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [analytics, setAnalytics] = useState(null);

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

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/admin/analytics`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        } else {
          const error = await res.json();
          showError(error.error || "Ошибка загрузки аналитики");
        }
      } catch (error) {
        console.error("Ошибка загрузки аналитики:", error);
        showError("Ошибка загрузки аналитики");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [isAdmin, showError]);

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

        <h1 className={styles.title}>Аналитика</h1>

        {analytics && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>👥</div>
              <div className={styles.statValue}>{analytics.totalUsers || 0}</div>
              <div className={styles.statLabel}>Всего пользователей</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📦</div>
              <div className={styles.statValue}>{analytics.totalAds || 0}</div>
              <div className={styles.statLabel}>Всего объявлений</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>💬</div>
              <div className={styles.statValue}>{analytics.totalChats || 0}</div>
              <div className={styles.statLabel}>Всего чатов</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>⭐</div>
              <div className={styles.statValue}>{analytics.totalReviews || 0}</div>
              <div className={styles.statLabel}>Всего отзывов</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>🚫</div>
              <div className={styles.statValue}>{analytics.bannedUsers || 0}</div>
              <div className={styles.statLabel}>Забаненных пользователей</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📊</div>
              <div className={styles.statValue}>{analytics.activeSellers || 0}</div>
              <div className={styles.statLabel}>Активных продавцов</div>
            </div>
          </div>
        )}

        {analytics && analytics.recentUsers && analytics.recentUsers.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Последние пользователи</h2>
            <div className={styles.usersList}>
              {analytics.recentUsers
                .filter((user, index, self) => 
                  index === self.findIndex(u => u.id === user.id)
                )
                .map((user) => (
                <div key={user.id} className={styles.userItem}>
                  <div className={styles.userAvatar}>
                    {user.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{user.name}</div>
                    <div className={styles.userMeta}>
                      <span className={styles.userRole}>{user.role}</span>
                      {user.is_banned && (
                        <span className={styles.bannedBadge}>🚫 Забанен</span>
                      )}
                    </div>
                  </div>
                  <Link href={`/seller/${user.id}`} className={styles.viewButton}>
                    Просмотр
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
