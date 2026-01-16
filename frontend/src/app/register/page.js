"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { Raleway } from "next/font/google";

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export default function RegisterPage() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    password: "",
    phone: "",
    phoneCode: "+7",
    smsCode: "",
    profileImage: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [smsSending, setSmsSending] = useState(false);
  const [smsCooldown, setSmsCooldown] = useState(0);

  const phoneCodes = [
    { code: "+77", flag: "🇷🇺", country: "RU" },
    { code: "+7", flag: "🇰🇿", country: "KZ" },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        profileImage: file,
      }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (smsCooldown <= 0) return;
    const timer = setInterval(() => {
      setSmsCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [smsCooldown]);

  const validatePhone = (phoneFull) => /^\+?[0-9]{10,15}$/.test(phoneFull);

  const handleSendSms = async () => {
    setError("");
    const phoneFull = `${formData.phoneCode}${formData.phone}`.replace(/\s+/g, "");
    if (!validatePhone(phoneFull)) {
      setError("Введите корректный номер телефона");
      return;
    }

    try {
      setSmsSending(true);
      const response = await fetch("http://localhost:3001/api/auth/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: phoneFull }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ошибка отправки SMS");
      }
      setSmsCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setSmsSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const phoneFull = `${formData.phoneCode}${formData.phone}`.replace(/\s+/g, "");
      if (!formData.name.trim() || !formData.lastName.trim()) {
        throw new Error("Имя и фамилия обязательны");
      }
      if (!validatePhone(phoneFull)) {
        throw new Error("Введите корректный номер телефона");
      }
      if (!/^\d{4,6}$/.test(formData.smsCode)) {
        throw new Error("Введите корректный код из SMS");
      }
      const submitData = new FormData();
      submitData.append("name", formData.name);
      submitData.append("last_name", formData.lastName);
      submitData.append("password", formData.password);
      submitData.append("role", "seller");
      submitData.append("phone", phoneFull);
      submitData.append("smsCode", formData.smsCode);
      if (formData.profileImage) {
        submitData.append("avatar", formData.profileImage);
      }

      const response = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        body: submitData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка регистрации");
      }

      // Сохраняем токен
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // Редирект на маркет/главный экран
      window.location.href = "/home";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    window.location.href = "/";
  };

  return (
    <div className={`${styles.container} ${raleway.className} ${isReady ? styles.animate : ""}`}>
      <div className={styles.background}>
        <div className={styles.shape1}></div>
        <div className={styles.shape2}></div>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>Создать аккаунт</h1>

        {/* Profile Image Upload */}
        <div className={styles.profileSection}>
          <label htmlFor="profileImage" className={styles.profileLabel}>
            {previewImage ? (
              <img
                src={previewImage}
                alt="Profile"
                className={styles.profileImage}
              />
            ) : (
              <div className={styles.profilePlaceholder}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={styles.cameraIcon}
                >
                  <path
                    d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="13"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            )}
          </label>
          <input
            type="file"
            id="profileImage"
            accept="image/*"
            onChange={handleImageChange}
            className={styles.hiddenInput}
          />
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Name */}
          <div className={styles.inputGroup}>
            <input
              type="text"
              name="name"
              placeholder="Имя"
              value={formData.name}
              onChange={handleInputChange}
              className={styles.input}
              required
            />
          </div>

          {/* Last Name */}
          <div className={styles.inputGroup}>
            <input
              type="text"
              name="lastName"
              placeholder="Фамилия"
              value={formData.lastName}
              onChange={handleInputChange}
              className={styles.input}
              required
            />
          </div>

          {/* Phone Number */}
          <div className={styles.phoneGroup}>
            <select
              name="phoneCode"
              value={formData.phoneCode}
              onChange={handleInputChange}
              className={styles.phoneCodeSelect}
            >
              {phoneCodes.map((item) => (
                <option key={item.country} value={item.code}>
                  {item.flag} {item.code}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="phone"
              placeholder="Ваш номер"
              value={formData.phone}
              onChange={handleInputChange}
              className={styles.phoneInput}
              required
            />
          </div>

          {/* SMS Code */}
          <div className={styles.smsGroup}>
            <input
              type="text"
              name="smsCode"
              placeholder="Код из SMS"
              value={formData.smsCode}
              onChange={handleInputChange}
              className={styles.input}
              required
              minLength={4}
              maxLength={6}
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={handleSendSms}
              className={styles.smsButton}
              disabled={smsSending || smsCooldown > 0}
            >
              {smsSending
                ? "Отправка..."
                : smsCooldown > 0
                ? `Повтор через ${smsCooldown}s`
                : "Получить код"}
            </button>
          </div>

          {/* Password */}
          <div className={styles.inputGroup}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Пароль"
              value={formData.password}
              onChange={handleInputChange}
              className={styles.input}
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles.eyeButton}
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

          {error && <div className={styles.error}>{error}</div>}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? "Загрузка..." : "Готово"}
          </button>
        </form>

        {/* Cancel Link */}
        <button onClick={handleCancel} className={styles.cancelButton}>
          Отмена
        </button>
      </div>
    </div>
  );
}
