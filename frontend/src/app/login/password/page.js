"use client";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

export default function PasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const phone = searchParams.get("phone") || "";
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [isReady, setIsReady] = useState(false);
  const maskedPhone = useMemo(() => {
    if (!phone) return "";
    if (phone.length < 4) return phone;
    const last4 = phone.slice(-4);
    return `${phone[0]}***${last4}`;
  }, [phone]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.avatar_url) setAvatarUrl(parsed.avatar_url);
        if (parsed?.name) setDisplayName(parsed.name);
      }
    } catch {
      // ignore parse errors
    }
    setIsReady(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Нормализуем телефон (убираем пробелы)
      const phoneNorm = phone.replace(/\s+/g, '');
      
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: phoneNorm, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        // Если пользователь не найден, показываем специальное сообщение
        if (response.status === 404 && data.error === 'USER_NOT_FOUND') {
          setError(data.message || "Вы еще не зарегистрированы в системе, пожалуйста зарегистрируйтесь");
          return;
        }
        throw new Error(data.error || data.message || "Ошибка входа");
      }

      // сохраняем токен
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      router.push("/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.container} ${isReady ? styles.animate : ""}`}>
      <div className={styles.bgTop}></div>
      <div className={styles.bgRight}></div>
      <div className={styles.bgBottom}></div>

      <div className={styles.content}>
        <div
          className={styles.avatarCircle}
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
          }}
        >
          {avatarUrl ? (
            <img
              src={
                avatarUrl.startsWith("http")
                  ? avatarUrl
                  : `${API_BASE}${avatarUrl}`
              }
              alt="Avatar"
              className={styles.avatarImage}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              onError={() => setAvatarUrl(null)}
            />
          ) : (
            <span className={styles.avatarText}>
              {(displayName || phone || "U")[0].toUpperCase()}
            </span>
          )}
        </div>
        <h1 className={styles.title}>Привет{phone ? "," : ""}</h1>
        {phone && <h2 className={styles.subtitle}>{maskedPhone}</h2>}
        <p className={styles.helper}>Введите ваш пароль</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              minLength={6}
              placeholder="Password"
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.68192 3.96914 7.65663 6.06 6.06M9.9 4.24C10.5883 4.0789 11.2931 3.99836 12 4C19 4 23 12 23 12C22.393 13.1356 21.6691 14.2048 20.84 15.19M14.12 14.12C13.8454 14.4148 13.5141 14.6512 13.1462 14.8151C12.7782 14.9791 12.3809 15.0673 11.9781 15.0744C11.5753 15.0815 11.1751 15.0074 10.8016 14.8565C10.4281 14.7056 10.0887 14.4811 9.80385 14.1962C9.51897 13.9113 9.29439 13.5719 9.14351 13.1984C8.99262 12.8249 8.91853 12.4247 8.92563 12.0219C8.93274 11.6191 9.02091 11.2218 9.18488 10.8538C9.34884 10.4859 9.58525 10.1546 9.88 9.88M1 1L23 23"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <div className={styles.error}>
              {error}
              {error.includes("не зарегистрированы") && (
                <div style={{ marginTop: "12px", display: "flex", gap: "8px", justifyContent: "center" }}>
                  <Link href="/register" className={styles.primaryButton} style={{ textDecoration: "none", display: "inline-block" }}>
                    Зарегистрироваться
                  </Link>
                </div>
              )}
            </div>
          )}

          <button type="submit" className={styles.primaryButton}>
            {loading ? "Загрузка..." : "Далее"}
          </button>
        </form>

        <Link href="/login" className={styles.cancel}>
          Не вы?
        </Link>
      </div>
    </div>
  );
}
