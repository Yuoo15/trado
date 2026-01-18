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
          <svg viewBox="0 0 400 120" className={styles.logo}>
            {/* Текст TRADO написанный пером */}
            <text 
              x="200" 
              y="80" 
              textAnchor="middle" 
              className={styles.handwrittenText}
            >
              TRADO
            </text>
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
