"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { Raleway } from "next/font/google";

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Пробуем быстрый вход через специальный endpoint на сервере
    // Проверка админского номера происходит только на сервере в .env
    try {
      // Отправляем номер как есть - сервер сам нормализует
      const response = await fetch(`${API_BASE}/api/auth/quick-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: phone }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Сохраняем токен и данные пользователя
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          router.push("/home");
          return;
        }
      } else {
        // Логируем ошибку для отладки (если быстрый вход не прошел, это нормально)
        const errorData = await response.json().catch(() => ({}));
        console.log('Quick login not available for this number:', response.status);
      }
    } catch (error) {
      // Игнорируем ошибку, продолжаем обычный процесс
      // Это нормально - не все номера имеют быстрый вход
      console.log('Quick login error:', error);
    }
    
    // Обычный процесс для остальных пользователей
    // Переход на шаг ввода пароля, прокидываем phone через query
    router.push(`/login/password?phone=${encodeURIComponent(phone)}`);
  };

  return (
    <div className={`${styles.container} ${raleway.className} ${isReady ? styles.animate : ""}`}>
      <div className={styles.bgTop}></div>
      <div className={styles.bgRight}></div>
      <div className={styles.bgBottom}></div>

      <div className={styles.content}>
        <h1 className={styles.title}>Вход</h1>
        <p className={styles.subtitle}>Рады видеть вас снова! ❤️</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="phone">
            Номер телефона
          </label>
          <input
            id="phone"
            type="tel"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={styles.input}
            placeholder="+7XXXXXXXXXX"
            required
          />

          <button type="submit" className={styles.primaryButton}>
            Далее
          </button>
        </form>

        <Link href="/" className={styles.cancel}>
          Отмена
        </Link>
      </div>
    </div>
  );
}
