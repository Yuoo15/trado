"use client";
import { useEffect, useState } from "react";
import styles from "./Preloader.module.css";

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Минимальная длительность показа прелоадера
    const minDuration = 800;
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
      <div className={styles.content}>
        <div className={styles.logo}>
          <svg viewBox="0 0 100 100" className={styles.logoSvg}>
            <circle cx="50" cy="50" r="40" className={styles.circle} />
            <text x="50" y="65" textAnchor="middle" className={styles.text}>
              T
            </text>
          </svg>
        </div>
        <div className={styles.spinner}>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerRing}></div>
        </div>
        <p className={styles.loadingText}>Загрузка...</p>
      </div>
    </div>
  );
}
