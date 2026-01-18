"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useModal } from "@/contexts/ModalContext";
import styles from "./page.module.css";
import { API_BASE } from "@/config/api";

export default function WelcomeModalManagementPage() {
  const router = useRouter();
  const { showError, showSuccess } = useModal();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    button_text: "Понятно",
    is_active: true,
  });

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

    loadModalData();
  }, [isAdmin]);

  const loadModalData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/welcome-modal`);

      if (res.ok) {
        const data = await res.json();
        setFormData({
          title: data.title || "",
          message: data.message || "",
          button_text: data.button_text || "Понятно",
          is_active: data.is_active !== undefined ? data.is_active : true,
        });
      }
    } catch (error) {
      console.error("Ошибка загрузки данных модального окна:", error);
      showError("Ошибка загрузки данных модального окна");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      showError("Заполните все обязательные поля");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/welcome-modal`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showSuccess("Модальное окно успешно обновлено");
        // Сбрасываем флаг показа модального окна, чтобы оно показалось снова
        localStorage.removeItem('welcomeModalShown');
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка обновления модального окна");
      }
    } catch (error) {
      console.error("Ошибка обновления модального окна:", error);
      showError("Ошибка обновления модального окна");
    } finally {
      setSaving(false);
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
        <Link href="/profile" className={styles.backLink}>
          ← Назад
        </Link>

        <h1 className={styles.title}>Управление приветственным окном</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Заголовок</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={styles.formInput}
              placeholder="Добро пожаловать!"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Текст сообщения</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className={styles.formTextarea}
              placeholder="Добро пожаловать на наш маркетплейс!"
              rows={6}
              required
            />
            <div className={styles.formHint}>
              Можно использовать переносы строк - они будут отображаться как отдельные абзацы
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Текст кнопки</label>
            <input
              type="text"
              value={formData.button_text}
              onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
              className={styles.formInput}
              placeholder="Понятно"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className={styles.checkbox}
              />
              <span>Активно (показывать модальное окно)</span>
            </label>
          </div>

          <button type="submit" className={styles.submitButton} disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </form>

        <div className={styles.infoBox}>
          <h3 className={styles.infoTitle}>ℹ️ Информация</h3>
          <p className={styles.infoText}>
            Модальное окно показывается пользователям только один раз (при первом посещении).
            Если вы обновите содержимое, нужно очистить кеш браузера или использовать режим инкогнито, чтобы увидеть изменения.
          </p>
        </div>
      </div>
    </div>
  );
}
