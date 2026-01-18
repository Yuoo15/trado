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
            {/* Внешний круг */}
            <circle 
              cx="100" 
              cy="100" 
              r="65" 
              className={styles.outerCircle}
            />
            
            {/* Стилизованная T - современный дизайн */}
            <g className={styles.logoIcon}>
              {/* Вертикальная линия */}
              <line x1="100" y1="65" x2="100" y2="135" className={styles.iconLine} />
              
              {/* Горизонтальная верхняя линия */}
              <line x1="70" y1="65" x2="130" y2="65" className={styles.iconLine} />
              
              {/* Декоративный элемент - точка снизу */}
              <circle cx="100" cy="145" r="5" className={styles.iconDot} />
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
