"use client";
import { useEffect } from "react";
import styles from "./Modal.module.css";

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(true);
    onClose();
  };

  const handleCancel = () => {
    onConfirm(false);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.content} ${styles.warning}`}>
          <div className={styles.header}>
            <div className={styles.icon}>⚠</div>
            {title && <h3 className={styles.title}>{title}</h3>}
          </div>
          <div className={styles.body}>
            <p className={styles.message}>{message}</p>
          </div>
          <div className={styles.footer}>
            <button className={`${styles.button} ${styles.cancelButton}`} onClick={handleCancel}>
              Отмена
            </button>
            <button className={`${styles.button} ${styles.confirmButton}`} onClick={handleConfirm}>
              Подтвердить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
