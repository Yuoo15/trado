"use client";
import { useEffect, useState } from "react";
import styles from "./Preloader.module.css";

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const minDuration = 1200;
    const startTime = Date.now();

    const handleLoad = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDuration - elapsedTime);

      setTimeout(() => {
        setIsLoading(false);
      }, remainingTime);
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, []);

  if (!isLoading) return null;

  return (
    <div className={styles.preloader}>
      {/* Фоновая анимация */}
      <div className={styles.background}>
        <div className={styles.gradient1}></div>
        <div className={styles.gradient2}></div>
      </div>

      {/* Логотип */}
      <div className={styles.logoContainer}>
        <div className={styles.logoGlow}></div>
        <div className={styles.logo}>
          <svg viewBox="0 0 200 200" className={styles.logoSvg}>
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#004cff" />
                <stop offset="100%" stopColor="#6ba3ff" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="80" className={styles.circle} />
            <text x="100" y="135" textAnchor="middle" className={styles.text}>
              T
            </text>
          </svg>
        </div>
        <div className={styles.spinner}>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerRing}></div>
        </div>
      </div>
    </div>
  );
}
