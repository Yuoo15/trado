"use client";
import { useEffect, useState } from "react";
import styles from "./Preloader.module.css";

export default function Preloader() {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem("hasSeenIntro");
    
    if (!hasSeenIntro) {
      setShowIntro(true);
      
      const timer = setTimeout(() => {
        setShowIntro(false);
        sessionStorage.setItem("hasSeenIntro", "true");
      }, 7000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!showIntro) return null;

  return (
    <div className={styles.intro}>
      <div className={styles.content}>
        {/* Логотип */}
        <div className={styles.logoContainer}>
          <svg viewBox="0 0 200 200" className={styles.logo}>
            {/* Три геометрические формы - символизируют торговлю */}
            
            {/* Левая стрелка вверх - продажа */}
            <path 
              d="M 60 120 L 60 60 L 40 80" 
              className={styles.arrow}
              style={{ animationDelay: '0s' }}
            />
            <path 
              d="M 60 60 L 80 80" 
              className={styles.arrow}
              style={{ animationDelay: '0.1s' }}
            />
            
            {/* Центральный круг - связь */}
            <circle 
              cx="100" 
              cy="90" 
              r="20" 
              className={styles.centerCircle}
            />
            
            {/* Правая стрелка вниз - покупка */}
            <path 
              d="M 140 60 L 140 120 L 120 100" 
              className={styles.arrow}
              style={{ animationDelay: '0.2s' }}
            />
            <path 
              d="M 140 120 L 160 100" 
              className={styles.arrow}
              style={{ animationDelay: '0.3s' }}
            />
            
            {/* Декоративные точки */}
            <circle cx="60" cy="130" r="3" className={styles.dot} style={{ animationDelay: '1.2s' }} />
            <circle cx="100" cy="130" r="3" className={styles.dot} style={{ animationDelay: '1.3s' }} />
            <circle cx="140" cy="130" r="3" className={styles.dot} style={{ animationDelay: '1.4s' }} />
          </svg>
        </div>

        {/* Название */}
        <h1 className={styles.brandName}>TRADO</h1>
        <p className={styles.tagline}>Маркетплейс Казахстана</p>

        {/* Индикатор загрузки */}
        <div className={styles.loadingContainer}>
          <div className={styles.loadingText}>Загрузка</div>
          <div className={styles.loadingDots}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
