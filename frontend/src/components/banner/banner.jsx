"use client";
import Link from 'next/link';
import { useCallback } from 'react';
import styles from './banner.module.css';

const API_BASE = "http://localhost:3001";

export default function Banner({ image_url, url, text, bannerId }) {
  const imageUrl = image_url 
    ? (image_url.startsWith('http') ? image_url : `${API_BASE}${image_url}`)
    : null;

  const handleClick = useCallback(async () => {
    if (bannerId) {
      try {
        const token = localStorage.getItem("token");
        await fetch(`${API_BASE}/api/banners/${bannerId}/click`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
      } catch (error) {
        console.error("Ошибка отслеживания клика:", error);
      }
    }
  }, [bannerId]);

  const content = (
    <div className={styles.banner}>
      {imageUrl ? (
        <img src={imageUrl} alt={text || "Баннер"} className={styles.bannerImage} />
      ) : (
        <span className={styles.title}>{text || "Баннер"}</span>
      )}
    </div>
  );

  if (url) {
    return (
      <Link 
        href={url} 
        className={styles.bannerLink}
        onClick={handleClick}
      >
        {content}
      </Link>
    );
  }

  return content;
}