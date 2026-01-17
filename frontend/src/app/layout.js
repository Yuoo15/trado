import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/bottom-nav/BottomNav";
import { ChatNotificationProvider } from "@/contexts/ChatNotificationContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import WelcomeModal from "@/components/welcome-modal/WelcomeModal";
import Preloader from "@/components/preloader/Preloader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Trado - Покупка и продажа товаров",
  description: "Простая и быстрая площадка для покупки и продажи любых товаров",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="light">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider>
          <ToastProvider>
            <ModalProvider>
              <ChatNotificationProvider>
                <Preloader />
                <div className="app-shell">
                  {children}
                  <BottomNav />
                  <WelcomeModal />
                </div>
              </ChatNotificationProvider>
            </ModalProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
