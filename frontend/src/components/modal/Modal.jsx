"use client";
import { useEffect } from "react";
import styles from "./Modal.module.css";

export default function Modal({ isOpen, onClose, title, message, type = "info" }) {
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

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      default:
        return "ℹ";
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.content} ${styles[type]}`}>
          <div className={styles.header}>
            <div className={styles.icon}>{getIcon()}</div>
            {title && <h3 className={styles.title}>{title}</h3>}
          </div>
          <div className={styles.body}>
            <p className={styles.message}>{message}</p>
          </div>
          <div className={styles.footer}>
            <button className={styles.button} onClick={onClose}>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
