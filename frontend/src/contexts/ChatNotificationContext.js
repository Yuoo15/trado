"use client";
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { usePathname } from "next/navigation";

const ChatNotificationContext = createContext();

export function ChatNotificationProvider({ children }) {
  const [unreadChats, setUnreadChats] = useState(() => new Set()); // Множество ID чатов с непрочитанными сообщениями
  const socketRef = useRef(null);
  const pathnameRef = useRef(null);
  const pathname = usePathname();
  
  // Обновляем ref при изменении pathname
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // Сбрасываем индикатор для конкретного чата при его открытии
    if (pathname?.match(/^\/chat\/[^/]+$/)) {
      const chatId = pathname.split('/')[2];
      setUnreadChats((prev) => {
        // Проверяем, нужно ли обновлять
        if (!prev.has(chatId)) {
          return prev; // Не обновляем, если чат уже прочитан
        }
        const newSet = new Set(prev);
        newSet.delete(chatId);
        return newSet;
      });
    }
    // Сбрасываем все индикаторы при открытии списка чатов
    else if (pathname === '/chat') {
      setUnreadChats((prev) => {
        // Проверяем, нужно ли обновлять
        if (prev.size === 0) {
          return prev; // Не обновляем, если уже пусто
        }
        return new Set();
      });
    }
  }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    // Если socket уже подключен, не создаем новый
    if (socketRef.current) {
      return;
    }

    const API_BASE = "http://localhost:3001";
    const newSocket = io(API_BASE, {
      auth: { token },
      transports: ['websocket'], // Используем только websocket для быстрого подключения
      reconnection: true,
      reconnectionDelay: 500, // Уменьшаем задержку переподключения
      reconnectionAttempts: 5,
      timeout: 5000, // Таймаут подключения 5 секунд
      forceNew: false // Переиспользуем существующее подключение если возможно
    });

    newSocket.on('connect', () => {
      console.log('Notification socket connected');
    });

    // Слушаем уведомления о новых сообщениях
    // Используем ref для pathname, чтобы не пересоздавать обработчик
    newSocket.on('message_notification', (data) => {
      console.log('Received message notification:', data);
      const currentPathname = pathnameRef.current;
      // Показываем индикатор только если пользователь не на странице этого чата
      const isInThisChat = currentPathname === `/chat/${data.chat_id}`;
      if (!isInThisChat && data.chat_id) {
        setUnreadChats((prev) => {
          // Проверяем, нет ли уже этого чата
          if (prev.has(data.chat_id.toString())) {
            return prev; // Не обновляем, если уже есть
          }
          const newSet = new Set(prev);
          newSet.add(data.chat_id.toString());
          console.log('Added chat to unread:', data.chat_id, 'Unread chats:', Array.from(newSet));
          return newSet;
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Notification socket disconnected');
    });

    socketRef.current = newSocket;

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Пустой массив зависимостей - подключаемся только один раз

  const hasNewMessages = unreadChats.size > 0;

  const markChatAsRead = useCallback((chatId) => {
    setUnreadChats((prev) => {
      // Проверяем, нужно ли обновлять
      if (!prev.has(chatId.toString())) {
        return prev; // Не обновляем, если чат уже прочитан
      }
      const newSet = new Set(prev);
      newSet.delete(chatId.toString());
      return newSet;
    });
  }, []);

  return (
    <ChatNotificationContext.Provider value={{ 
      hasNewMessages, 
      unreadChats, 
      markChatAsRead
    }}>
      {children}
    </ChatNotificationContext.Provider>
  );
}

export function useChatNotification() {
  return useContext(ChatNotificationContext);
}
