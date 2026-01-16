/** @type {import('next').NextConfig} */
const nextConfig = {
  // Оптимизации для production
  reactStrictMode: true,
  
  // Компрессия для production
  compress: true,
  
  // Оптимизация изображений
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  // Оптимизация сборки
  swcMinify: true,
  
  // Оптимизация производительности
  poweredByHeader: false,
  
  // Экспериментальные оптимизации
  experimental: {
    optimizePackageImports: ['swiper'],
  },
};

export default nextConfig;
