"use client";
import { useEffect, useState } from "react";
import styles from "./Preloader.module.css";

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Симуляция прогресса загрузки
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        // Замедляем прогресс ближе к концу для плавности
        const increment = prev > 70 ? 2 : prev > 50 ? 5 : 10;
        return Math.min(prev + increment, 100);
      });
    }, 100);

    // Минимальная длительность показа прелоадера
    const minDuration = 1500;
    const startTime = Date.now();

    const handleLoad = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDuration - elapsedTime);

      setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      }, remainingTime);
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }

    return () => clearInterval(progressInterval);
  }, []);

  if (!isLoading) return null;

  return (
    <div className={styles.preloader}>
      {/* Фоновая анимация */}
      <div className={styles.background}>
        <div className={styles.gradient1}></div>
        <div className={styles.gradient2}></div>
        <div className={styles.gradient3}></div>
      </div>

      {/* Основной контент */}
      <div className={styles.content}>
        {/* Логотип с эффектом */}
        <div className={styles.logoContainer}>
          <div className={styles.logoGlow}></div>
          <div className={styles.logo}>
            <svg viewBox="0 0 100 100" className={styles.logoSvg}>
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#004cff" />
                  <stop offset="100%" stopColor="#2d76ff" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="38" className={styles.circleBg} />
              <circle cx="50" cy="50" r="38" className={styles.circle} />
              <text x="50" y="68" textAnchor="middle" className={styles.text}>
                T
              </text>
            </svg>
          </div>
        </div>

        {/* Прогресс бар */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${progress}%` }}
            >
              <div className={styles.progressGlow}></div>
            </div>
          </div>
          <div className={styles.progressText}>{Math.round(progress)}%</div>
        </div>

        {/* Анимированный текст */}
        <div className={styles.loadingTextContainer}>
          <p className={styles.loadingText}>
            {progress < 30 && "Инициализация..."}
            {progress >= 30 && progress < 60 && "Загрузка ресурсов..."}
            {progress >= 60 && progress < 90 && "Почти готово..."}
            {progress >= 90 && "Запуск..."}
          </p>
          <div className={styles.dots}>
            <span className={styles.dot}></span>
            <span className={styles.dot}></span>
            <span className={styles.dot}></span>
          </div>
        </div>
      </div>

      {/* Частицы */}
      <div className={styles.particles}>
        {[...Array(20)].map((_, i) => (
          <div key={i} className={styles.particle}></div>
        ))}
      </div>
    </div>
  );
}
