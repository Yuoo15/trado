"use client";
import { useEffect, useState } from "react";
import styles from "./Preloader.module.css";

export default function Preloader() {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // Проверяем, показывали ли интро раньше
    const hasSeenIntro = sessionStorage.getItem("hasSeenIntro");
    
    if (!hasSeenIntro) {
      setShowIntro(true);
      
      // Скрываем интро через 3 секунды
      const timer = setTimeout(() => {
        setShowIntro(false);
        sessionStorage.setItem("hasSeenIntro", "true");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!showIntro) return null;

  return (
    <div className={styles.intro}>
      {/* Анимированный фон */}
      <div className={styles.background}>
        <div className={styles.gradient1}></div>
        <div className={styles.gradient2}></div>
        <div className={styles.gradient3}></div>
      </div>

      {/* Контент */}
      <div className={styles.content}>
        {/* Логотип */}
        <div className={styles.logoContainer}>
          <div className={styles.logoGlow}></div>
          <svg viewBox="0 0 200 200" className={styles.logo}>
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#004cff" />
                <stop offset="50%" stopColor="#2d76ff" />
                <stop offset="100%" stopColor="#6ba3ff" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" className={styles.circle} filter="url(#glow)" />
            <text x="100" y="135" textAnchor="middle" className={styles.text} filter="url(#glow)">
              T
            </text>
          </svg>
        </div>

        {/* Название */}
        <div className={styles.brandContainer}>
          <h1 className={styles.brandName}>TRADO</h1>
          <p className={styles.tagline}>Покупай. Продавай. Легко.</p>
        </div>

        {/* Декоративные элементы */}
        <div className={styles.decorations}>
          <div className={styles.line}></div>
          <div className={styles.dot}></div>
          <div className={styles.line}></div>
        </div>
      </div>

      {/* Частицы */}
      <div className={styles.particles}>
        {[...Array(15)].map((_, i) => (
          <div key={i} className={styles.particle}></div>
        ))}
      </div>
    </div>
  );
}
