"use client";
import { useState, useRef } from "react";
import { useModal } from "@/contexts/ModalContext";
import { API_BASE } from "@/config/api";
import styles from "./ProfileEdit.module.css";

export default function ProfileEdit({ user, onUpdate }) {
  const { showSuccess, showError } = useModal();
  const [status, setStatus] = useState(user?.status || "");
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url ? `${API_BASE}${user.avatar_url}` : null);
  const fileInputRef = useRef(null);

  const handleStatusUpdate = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showError("Требуется авторизация");
        return;
      }

      const res = await fetch(`${API_BASE}/api/profile/status`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка обновления статуса");
      }

      showSuccess("Статус обновлен");
      setIsEditingStatus(false);
      
      // Обновляем localStorage
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        userData.status = status;
        localStorage.setItem("user", JSON.stringify(userData));
        onUpdate?.({ ...userData, status });
      }
    } catch (error) {
      console.error("Ошибка обновления статуса:", error);
      showError(error.message || "Не удалось обновить статус");
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith("image/")) {
      showError("Выберите файл изображения");
      return;
    }

    // Проверка размера (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError("Файл слишком большой. Максимум 5MB");
      return;
    }

    try {
      setIsUploadingAvatar(true);

      const token = localStorage.getItem("token");
      if (!token) {
        showError("Требуется авторизация");
        return;
      }

      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch(`${API_BASE}/api/profile/avatar`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка загрузки аватарки");
      }

      const newAvatarUrl = `${API_BASE}${data.avatar_url}`;
      setAvatarPreview(newAvatarUrl);
      showSuccess("Аватарка обновлена");

      // Обновляем localStorage
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        userData.avatar_url = data.avatar_url;
        localStorage.setItem("user", JSON.stringify(userData));
        onUpdate?.({ ...userData, avatar_url: data.avatar_url });
      }
    } catch (error) {
      console.error("Ошибка загрузки аватарки:", error);
      showError(error.message || "Не удалось загрузить аватарку");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showError("Требуется авторизация");
        return;
      }

      const res = await fetch(`${API_BASE}/api/profile/avatar`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка удаления аватарки");
      }

      setAvatarPreview(null);
      showSuccess("Аватарка удалена");

      // Обновляем localStorage
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        userData.avatar_url = null;
        localStorage.setItem("user", JSON.stringify(userData));
        onUpdate?.({ ...userData, avatar_url: null });
      }
    } catch (error) {
      console.error("Ошибка удаления аватарки:", error);
      showError(error.message || "Не удалось удалить аватарку");
    }
  };

  return (
    <div className={styles.container}>
      {/* Аватарка с информацией */}
      <div className={styles.avatarSection}>
        <div className={styles.avatarWrapper}>
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          {isUploadingAvatar && (
            <div className={styles.avatarLoader}>
              <div className={styles.spinner}></div>
            </div>
          )}
          <button
            className={styles.editAvatarBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            title="Изменить фото"
          >
            ✏️
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className={styles.fileInput}
          />
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>
            {user?.name || "Имя"} {user?.last_name || ""}
          </div>
          {user?.phone && (
            <div className={styles.userPhone}>
              📱 {user.phone}
            </div>
          )}
        </div>
      </div>

      {/* Статус */}
      <div className={styles.statusSection}>
        <label className={styles.label}>Тип деятельности</label>
        {isEditingStatus ? (
          <div className={styles.statusEdit}>
            <select
              className={styles.statusSelect}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Не выбрано</option>
              <option value="Продавец">Продавец</option>
              <option value="Фрилансер">Фрилансер</option>
              <option value="Предоставляю услуги">Предоставляю услуги</option>
            </select>
            <div className={styles.statusActions}>
              <button className={styles.saveBtn} onClick={handleStatusUpdate}>
                Сохранить
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setStatus(user?.status || "");
                  setIsEditingStatus(false);
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.statusDisplay}>
            <p className={styles.statusText}>
              {status || "Не выбрано"}
            </p>
            <button
              className={styles.editBtn}
              onClick={() => setIsEditingStatus(true)}
            >
              Изменить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
