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
            {/* Внешняя рамка */}
            <rect 
              x="30" 
              y="30" 
              width="140" 
              height="140" 
              rx="20" 
              className={styles.outerRect}
            />
            
            {/* Внутренние элементы - стилизованная T */}
            <g className={styles.logoElements}>
              {/* Горизонтальная линия T */}
              <rect x="60" y="70" width="80" height="12" rx="6" />
              
              {/* Вертикальная линия T */}
              <rect x="94" y="70" width="12" height="60" rx="6" />
              
              {/* Декоративные точки */}
              <circle cx="100" cy="145" r="4" />
              <circle cx="85" cy="145" r="3" />
              <circle cx="115" cy="145" r="3" />
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
