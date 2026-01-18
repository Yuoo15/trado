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
            {/* Современный минималистичный дизайн */}
            
            {/* Внешний круг */}
            <circle 
              cx="100" 
              cy="100" 
              r="60" 
              className={styles.outerRing}
            />
            
            {/* Буква T с современным дизайном */}
            <g className={styles.letterT}>
              {/* Горизонтальная линия */}
              <rect x="60" y="70" width="80" height="8" rx="4" />
              
              {/* Вертикальная линия */}
              <rect x="96" y="70" width="8" height="50" rx="4" />
            </g>
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
