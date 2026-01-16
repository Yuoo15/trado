"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import Banner from "@/components/banner/banner";
import styles from "./banners.module.css";
import { useEffect, useState } from "react";

const API_BASE = "http://localhost:3001";

export default function Banners() {
  const [swiperInstance, setSwiperInstance] = useState(null);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/banners`);
        if (res.ok) {
          const data = await res.json();
          setBanners(data);
        }
      } catch (error) {
        console.error("Ошибка загрузки баннеров:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBanners();
  }, []);

  useEffect(() => {
    if (swiperInstance?.autoplay) {
      swiperInstance.autoplay.start();
    }
  }, [swiperInstance]);

  if (loading) {
    return null;
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <Swiper
      className={styles.swiper}
      slidesPerView={1}
      spaceBetween={20}
      pagination={{
        clickable: true,
        renderBullet: (index, className) => {
          return `<span class="${className} ${styles.bullet}"><span class="${styles.progress}"></span></span>`;
        },
      }}
      autoplay={{ delay: 7000, disableOnInteraction: false }}
      loop={banners.length > 1}
      modules={[Pagination, Autoplay]}
      onSwiper={setSwiperInstance}
    >
      {banners.map((banner) => (
        <SwiperSlide key={banner.id}>
          <Banner image_url={banner.image_url} url={banner.url} text="" bannerId={banner.id} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
