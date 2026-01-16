"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useModal } from "@/contexts/ModalContext";
import styles from "./page.module.css";
import { catalogs } from "@/db/catalogs";
import { API_BASE } from "@/config/api";

export default function AddPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState("");
  const defaultCategory = useMemo(() => catalogs?.[0]?.name || "", []);
  const [category, setCategory] = useState(defaultCategory);
  
  // Очищаем цену при выборе категории "Даром"
  useEffect(() => {
    if (category === "Даром") {
      setPrice("");
    }
  }, [category]);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [message, setMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [whatsApp, setWhatsApp] = useState("");
  const [telegram, setTelegram] = useState("");
  const [showMessengerFields, setShowMessengerFields] = useState(false);
  const { showWarning } = useModal();

  useEffect(() => {
    // Проверяем наличие токена в localStorage
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Добавляем к существующим файлам (до 10 всего)
    const currentCount = images.length;
    const remainingSlots = 10 - currentCount;
    
    if (remainingSlots <= 0) {
      showWarning("Можно загрузить максимум 10 фотографий");
      e.target.value = ""; // Сбрасываем input
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    const newImages = [...images, ...filesToAdd];
    
    // Создаем превью для новых изображений
    const previewPromises = filesToAdd.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previewPromises).then((previewResults) => {
      const validPreviews = previewResults.filter(p => p !== null);
      setImages(newImages);
      setPreviews([...previews, ...validPreviews]);
    });

    // Сбрасываем input, чтобы можно было выбрать те же файлы снова
    e.target.value = "";
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    const isFree = category === "Даром";
    if (!title.trim() || !phone.trim() || (!isFree && !price.trim()) || !category.trim()) {
      setMessage(`Заполните все обязательные поля (название, телефон${isFree ? "" : ", цена"}, категория)`);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Требуется авторизация");
        return;
      }

      const form = new FormData();
      form.append("title", title);
      const extraContacts = [
        whatsApp.trim() ? `WhatsApp: ${whatsApp.trim()}` : null,
        telegram.trim() ? `Telegram: ${telegram.trim()}` : null,
      ].filter(Boolean);

      const finalDescription = extraContacts.length > 0
        ? `${description}${description ? "\n" : ""}${extraContacts.join("\n")}`
        : description;

      form.append("description", finalDescription);
      form.append("phone", phone);
      // Если категория "Даром", отправляем "0" или пустую строку, иначе цену
      form.append("price", category === "Даром" ? "0" : price);
      form.append("category", category);
      
      // Добавляем все изображения
      images.forEach((image) => {
        form.append("images", image);
      });

      const res = await fetch(`${API_BASE}/api/ads`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка сохранения");
      }

      // Для быстрого отображения локально — добавим в ads localStorage
      const adsRaw = localStorage.getItem("ads") || "[]";
      const ads = JSON.parse(adsRaw);
      const firstImage = data.image_urls && data.image_urls.length > 0
        ? data.image_urls[0]
        : (data.image_url || (previews.length > 0 ? previews[0] : null));
      
      ads.unshift({
        id: data.id || Date.now(),
        name: data.title || title,
        description: description || `Категория: ${category}`,
        price: data.price ? `₸${data.price}` : price,
        image: firstImage
          ? (firstImage.startsWith("http")
              ? firstImage
              : `${API_BASE}${firstImage}`)
          : null,
      });
      localStorage.setItem("ads", JSON.stringify(ads));

      setMessage("Объявление сохранено.");
      setTitle("");
      setDescription("");
      setPhone("");
      setPrice("");
      setCategory("");
      setImages([]);
      setPreviews([]);
      setWhatsApp("");
      setTelegram("");
      setShowMessengerFields(false);
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.chatWrapper}>
        <div className={styles.chatContainer}>
          <div className={styles.emptyState}>
            <h2>Войдите в аккаунт</h2>
            <p>Вы еще не зарегистрированы в системе, пожалуйста зарегистрируйтесь, чтобы добавить объявление</p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "20px" }}>
              <Link href="/register" className={styles.loginButton} style={{ background: "var(--accent-color)", textDecoration: "none" }}>
                Зарегистрироваться
              </Link>
              <Link href="/login" className={styles.loginButton}>
                Войти
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>Добавить объявление</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Название объявления
            <input
              className={styles.input}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Новые очки"
              required
            />
          </label>

          <label className={styles.label}>
            Описание
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробное описание объявления..."
              rows={4}
            />
          </label>

          <label className={styles.label}>
            Номер телефона
            <input
              className={styles.input}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7XXXXXXXXXX"
              required
            />
          </label>

          <div className={styles.optionalSection}>
            <button
              type="button"
              className={styles.optionalToggle}
              onClick={() => setShowMessengerFields((prev) => !prev)}
            >
              {showMessengerFields ? "Скрыть WhatsApp/Telegram" : "Указать WhatsApp или Telegram"}
            </button>

            {showMessengerFields && (
              <div className={styles.optionalFields}>
                <label className={styles.label}>
                  WhatsApp (номер)
                  <input
                    className={styles.input}
                    type="tel"
                    value={whatsApp}
                    onChange={(e) => setWhatsApp(e.target.value)}
                    placeholder="+7XXXXXXXXXX"
                  />
                </label>

                <label className={styles.label}>
                  Telegram (юзернейм)
                  <input
                    className={styles.input}
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="@username"
                  />
                </label>
              </div>
            )}
          </div>

          {category !== "Даром" && (
            <label className={styles.label}>
              Цена
              <input
                className={styles.input}
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="₸100"
                required
              />
            </label>
          )}

          <label className={styles.label}>
            Категория
            <select
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {catalogs.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Фото объявления (можно выбрать несколько)
            <div className={styles.uploadBox}>
              <input
                className={styles.fileInput}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
              />
              {previews.length === 0 ? (
                <span className={styles.uploadText}>Загрузить фото (до 10 штук)</span>
              ) : (
                <div className={styles.previewsGrid}>
                  {previews.map((preview, index) => (
                    <div key={index} className={styles.previewItem}>
                      <img src={preview} alt={`preview ${index + 1}`} className={styles.preview} />
                      <button
                        type="button"
                        className={styles.removePreviewBtn}
                        onClick={() => removeImage(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </label>

          {message && <div className={styles.message}>{message}</div>}

          <button type="submit" className={styles.submit}>
            Добавить
          </button>
        </form>
      </div>
    </div>
  );
}
