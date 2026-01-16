"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useChatNotification } from "@/contexts/ChatNotificationContext";
import styles from "./bottomNav.module.css";

const items = [
  {
    href: "/home",
    label: "Главная",
    icon: (
      <path
        d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  {
    href: "/cart",
    label: "Корзина",
    icon: (
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M.75-.02a.75.75 0 100 1.5l.408-.006 1.606 1.281 1.839 6.881L4.237 12a2 2 0 102.188 2.722l5.705.028a2 2 0 100-1.5l-5.705-.028a2.007 2.007 0 00-.722-.898l.438-2.632 7.933.027 1.91-7.715H4.227L1.683-.026 1.68-.02v-.005L.75-.02z"
        fill="currentColor"
      />
    ),
  },
  {
    href: "/add",
    label: "Добавить",
    center: true,
    icon: (
      <path
        d="M12 6v12M6 12h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  {
    href: "/chat",
    label: "Чат",
    icon: (
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  {
    href: "/profile",
    label: "Профиль",
    icon: (
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-6 7a6 6 0 1 1 12 0Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const context = useChatNotification();
  const hasNewMessages = context?.hasNewMessages || false;
  const isChatPage = pathname?.startsWith('/chat');
  
  // Меню показывается везде, включая страницы чата
  
  return (
    <nav className={styles.nav}>
      {items.map((item) => {
        const isChatItem = item.href === "/chat";
        const showBadge = isChatItem && hasNewMessages;
        const isActive = pathname === item.href || (item.href === "/home" && pathname === "/");
        // Для кнопки "Добавить" не применяем активное состояние
        const shouldBeActive = !item.center && isActive;
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${item.center ? styles.center : ""} ${shouldBeActive ? styles.active : ""} ${item.center && isChatPage ? styles.centerHidden : ""}`}
          >
            <div className={styles.iconWrapper}>
              <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
                {item.icon}
              </svg>
              {showBadge && <span className={styles.badge}></span>}
            </div>
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
