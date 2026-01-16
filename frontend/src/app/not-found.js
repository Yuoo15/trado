"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./not-found.module.css";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.errorCode}>404</div>
          <h1 className={styles.title}>Упс!</h1>
          <p className={styles.message}>
            Кажется эта страница еще в разработке
          </p>
          <div className={styles.actions}>
            <button 
              onClick={() => router.back()} 
              className={styles.backButton}
            >
              ← Назад
            </button>
            <Link href="/home" className={styles.homeButton}>
              На главную
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
