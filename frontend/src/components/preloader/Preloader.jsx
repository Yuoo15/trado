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
          <svg viewBox="0 0 200 250" className={styles.logo}>
            {/* Звездочки */}
            <polygon points="60,60 62,66 68,66 63,70 65,76 60,72 55,76 57,70 52,66 58,66" className={styles.star} style={{ animationDelay: '0.8s' }}/>
            <polygon points="140,90 142,96 148,96 143,100 145,106 140,102 135,106 137,100 132,96 138,96" className={styles.star} style={{ animationDelay: '1s' }}/>
            <polygon points="45,100 47,106 53,106 48,110 50,116 45,112 40,116 42,110 37,106 43,106" className={styles.star} style={{ animationDelay: '1.2s' }}/>
            <polygon points="155,70 157,76 163,76 158,80 160,86 155,82 150,86 152,80 147,76 153,76" className={styles.star} style={{ animationDelay: '1.4s' }}/>
            
            {/* Подарок */}
            <g className={styles.gift} transform="translate(65, 40)">
              <rect x="0" y="10" width="30" height="30" rx="2"/>
              <rect x="13" y="10" width="4" height="30" fill="rgba(255,255,255,0.3)"/>
              <path d="M 5,10 Q 15,0 25,10" stroke="currentColor" strokeWidth="3" fill="none"/>
            </g>
            
            {/* Ценник */}
            <g className={styles.tag} transform="translate(115, 55)">
              <path d="M 0,0 L 25,0 L 25,15 L 12.5,20 L 0,15 Z"/>
              <circle cx="8" cy="7" r="3" fill="rgba(255,255,255,0.4)"/>
            </g>
            
            {/* Сумка */}
            <g className={styles.bag} transform="translate(50, 110)">
              {/* Основная часть сумки */}
              <path d="M 10,20 L 5,100 Q 5,110 15,110 L 85,110 Q 95,110 95,100 L 90,20 Z" 
                    stroke="currentColor" strokeWidth="2"/>
              
              {/* Двойная линия сумки */}
              <path d="M 15,25 L 11,100 Q 11,105 18,105" 
                    fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
              
              {/* Ручка */}
              <path d="M 30,20 Q 30,0 50,0 Q 70,0 70,20" 
                    fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
              
              {/* Белые точки на ручке */}
              <circle cx="35" cy="12" r="4" fill="rgba(255,255,255,0.4)"/>
              <circle cx="65" cy="12" r="4" fill="rgba(255,255,255,0.4)"/>
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
