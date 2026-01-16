"use client";
import { useEffect, useState } from "react";
import styles from "./WelcomeModal.module.css";

const API_BASE = "http://localhost:3001";

export default function WelcomeModal() {
  const [modalData, setModalData] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModalData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/welcome-modal`);
        if (res.ok) {
          const data = await res.json();
          setModalData(data);
          // Показываем модальное окно только если оно активно
          if (data.is_active) {
            setIsVisible(true);
          }
        }
      } catch (error) {
        console.error("Ошибка загрузки данных модального окна:", error);
      } finally {
        setLoading(false);
      }
    };

    loadModalData();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (loading || !modalData || !isVisible || !modalData.is_active) {
    return null;
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose} aria-label="Закрыть">
          ✕
        </button>
        <div className={styles.content}>
          <h2 className={styles.title}>{modalData.title}</h2>
          <div className={styles.message}>
            {modalData.message.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
          <button className={styles.button} onClick={handleClose}>
            {modalData.button_text || 'Понятно'}
          </button>
        </div>
      </div>
    </div>
  );
}
