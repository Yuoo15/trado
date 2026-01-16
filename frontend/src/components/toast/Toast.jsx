"use client";
import { useEffect } from "react";
import styles from "./Toast.module.css";

export default function Toast({ message, isVisible, onClose, duration = 3000 }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className={styles.toast} onClick={onClose}>
      <div className={styles.content}>
        <span className={styles.icon}>✓</span>
        <span className={styles.message}>{message}</span>
      </div>
    </div>
  );
}
