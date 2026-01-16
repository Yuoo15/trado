"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { io } from "socket.io-client";
import { useChatNotification } from "@/contexts/ChatNotificationContext";
import { useModal } from "@/contexts/ModalContext";
import styles from "./page.module.css";

const API_BASE = "http://localhost:3001";

export default function ChatListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedChatId = searchParams?.get('chat');
  
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const { unreadChats, markChatAsRead } = useChatNotification() || { unreadChats: new Set(), markChatAsRead: () => {} };
  const { showSuccess, showError, showWarning, showConfirm } = useModal();

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }
    setIsAuthenticated(true);
    loadChats();
  }, []);

  useEffect(() => {
    const storedBlocked = localStorage.getItem("blocked_users");
    if (storedBlocked) {
      try {
        const parsed = JSON.parse(storedBlocked);
        if (Array.isArray(parsed)) {
          setBlockedUsers(parsed.map(String));
        }
      } catch {
        setBlockedUsers([]);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowChatMenu(false);
    };
    if (showChatMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showChatMenu]);

  useEffect(() => {
    if (selectedChatId) {
      loadSelectedChat(selectedChatId);
    } else {
      setSelectedChat(null);
      setMessages([]);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [selectedChatId]);

  const loadChats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/messages/chats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedChat = async (chatId) => {
    try {
      setChatLoading(true);
      const token = localStorage.getItem("token");
      
      // Загружаем информацию о чате
      const chatRes = await fetch(`${API_BASE}/api/messages/chats/${chatId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        setSelectedChat(chatData);
      }

      // Загружаем сообщения
      const messagesRes = await fetch(`${API_BASE}/api/messages/chats/${chatId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        console.log('Loaded messages:', messagesData);
        setMessages(messagesData);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setChatLoading(false);
    }
  };




  const isUserBlocked = (userId) => {
    if (!userId) return false;
    return blockedUsers.includes(String(userId));
  };

  const toggleBlockUser = async (userId, userName) => {
    if (!userId) return;
    const currentlyBlocked = isUserBlocked(userId);
    const confirmed = await showConfirm(
      currentlyBlocked
        ? `Разблокировать пользователя ${userName || "Пользователь"}?`
        : `Заблокировать пользователя ${userName || "Пользователь"}?`,
      currentlyBlocked ? "Разблокировать" : "Заблокировать"
    );
    if (!confirmed) return;
    const next = currentlyBlocked
      ? blockedUsers.filter((id) => id !== String(userId))
      : [...blockedUsers, String(userId)];
    setBlockedUsers(next);
    localStorage.setItem("blocked_users", JSON.stringify(next));
    showSuccess(currentlyBlocked ? "Пользователь разблокирован" : "Пользователь заблокирован");
  };

  const reloadMessages = async (chatId) => {
    const targetChatId = chatId || selectedChatId;
    if (!targetChatId) return;
    try {
      const token = localStorage.getItem("token");
      const messagesRes = await fetch(`${API_BASE}/api/messages/chats/${targetChatId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        console.log('Reloaded messages:', messagesData);
        setMessages(messagesData);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error reloading messages:', error);
    }
  };

  // Подключаемся к Socket.IO
  useEffect(() => {
    if (!selectedChatId) return;
    
    const token = localStorage.getItem("token");
    if (!token) return;
    
    if (socket) {
      socket.disconnect();
    }
    
    const newSocket = io(API_BASE, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: 5,
      timeout: 5000,
      forceNew: false
    });
    
    setSocket(newSocket);
    
    const handleConnect = () => {
      console.log('Socket connected, joining chat:', selectedChatId);
      newSocket.emit('join_chat', selectedChatId);
    };
    
    const handleDisconnect = () => {
      console.log('Socket disconnected');
    };
    
    const handleReconnect = () => {
      console.log('Socket reconnected, joining chat:', selectedChatId);
      newSocket.emit('join_chat', selectedChatId);
    };
    
    const handleNewMessage = (message) => {
      console.log('Received new message from socket:', message);
      console.log('Message has image_url:', message.image_url);
      console.log('Message has reply_to:', message.reply_to);
      console.log('Message has reply_to_message:', message.reply_to_message);
      console.log('Message has reply_to_image_url:', message.reply_to_image_url);
      
      // Если сообщение содержит image_url или reply_to, перезагружаем сообщения для получения полных данных
      if (message.image_url || (message.reply_to && (!message.reply_to_message && !message.reply_to_image_url))) {
        console.log('Message has image/reply, reloading messages to get full data...');
        const token = localStorage.getItem("token");
        if (token && selectedChatId) {
          setTimeout(async () => {
            try {
              const messagesRes = await fetch(`${API_BASE}/api/messages/chats/${selectedChatId}/messages`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              if (messagesRes.ok) {
                const messagesData = await messagesRes.json();
                console.log('Reloaded messages:', messagesData);
                setMessages(messagesData);
                setTimeout(() => {
                  if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
                  }
                }, 100);
              }
            } catch (err) {
              console.error('Error reloading messages:', err);
            }
          }, 500);
          // Повторная загрузка через секунду для надежности
          setTimeout(async () => {
            try {
              const messagesRes = await fetch(`${API_BASE}/api/messages/chats/${selectedChatId}/messages`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              if (messagesRes.ok) {
                const messagesData = await messagesRes.json();
                console.log('Reloaded messages (second attempt):', messagesData);
                setMessages(messagesData);
                setTimeout(() => {
                  if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
                  }
                }, 100);
              }
            } catch (err) {
              console.error('Error reloading messages:', err);
            }
          }, 1000);
        }
        return;
      }
      
      setMessages((prev) => {
        const exists = prev.some(m => m.id === message.id);
        if (exists) {
          // Обновляем существующее сообщение, если пришли новые данные
          const updated = prev.map(m => {
            if (m.id === message.id) {
              const merged = { ...m, ...message };
              console.log('Merged message:', merged);
              return merged;
            }
            return m;
          });
          return updated;
        }
        const newMessages = [...prev, message];
        return newMessages.sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return dateA - dateB;
        });
      });
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    };
    
    const handleMessageError = (error) => {
      console.error('Message error:', error);
      showError('Ошибка отправки сообщения: ' + (error.error || 'Неизвестная ошибка'));
    };
    
    const handleConnectError = (error) => {
      console.error('Socket connection error:', error);
      // Не показываем ошибку сразу, так как может быть переподключение
    };
    
    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('reconnect', handleReconnect);
    newSocket.on('new_message', handleNewMessage);
    newSocket.on('message_error', handleMessageError);
    newSocket.on('connect_error', handleConnectError);
    
    // Если уже подключен, сразу присоединяемся
    if (newSocket.connected) {
      newSocket.emit('join_chat', selectedChatId);
    }
    
    if (selectedChatId && markChatAsRead) {
      markChatAsRead(selectedChatId);
    }
    
    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('reconnect', handleReconnect);
      newSocket.off('new_message', handleNewMessage);
      newSocket.off('message_error', handleMessageError);
      newSocket.off('connect_error', handleConnectError);
      if (newSocket) {
        newSocket.emit('leave_chat', selectedChatId);
        newSocket.disconnect();
      }
    };
  }, [selectedChatId, markChatAsRead]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const handleChatClick = (chatId) => {
    // На мобильных - переходим на отдельную страницу
    if (window.innerWidth < 1024) {
      router.push(`/chat/${chatId}`);
    } else {
      // На десктопе - обновляем URL с параметром
      router.push(`/chat?chat=${chatId}`);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showError("Размер файла не должен превышать 5 МБ");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !selectedChatId) return;
    if (selectedChat?.other_user_id && isUserBlocked(selectedChat.other_user_id)) {
      showWarning("Пользователь заблокирован. Разблокируйте, чтобы отправлять сообщения.");
      return;
    }
    
    const messageText = newMessage.trim();
    const imageToSend = selectedImage;
    const replyToSend = replyingTo;
    
    // Сохраняем значения перед очисткой
    const hasReply = !!replyToSend;
    const replyToId = replyToSend?.id || null;
    
    const formData = new FormData();
    formData.append('chatId', selectedChatId);
    if (messageText) {
      formData.append('message', messageText);
    }
    if (imageToSend) {
      formData.append('image', imageToSend);
    }
    if (replyToSend) {
      formData.append('replyTo', replyToSend.id);
    }

    setNewMessage("");
    setSelectedImage(null);
    setImagePreview(null);
    setReplyingTo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Если есть изображение или ответ, всегда отправляем через API
    if (imageToSend || hasReply) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (res.ok) {
          const newMsg = await res.json();
          console.log('New message from API (with image/reply):', newMsg);
          console.log('Message image_url:', newMsg.image_url);
          console.log('Message reply_to:', newMsg.reply_to);
          console.log('Message reply_to_message:', newMsg.reply_to_message);
          
          // Сразу добавляем сообщение в список
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) {
              // Используем новые данные полностью, а не мержим со старыми
              return prev.map(m => m.id === newMsg.id ? newMsg : m);
            }
            const sorted = [...prev, newMsg].sort((a, b) => {
              const dateA = new Date(a.created_at);
              const dateB = new Date(b.created_at);
              return dateA - dateB;
            });
            return sorted;
          });
          scrollToBottom();
          
          // Перезагружаем сообщения для получения полных данных (на случай если данные неполные)
          setTimeout(async () => {
            await reloadMessages(selectedChatId);
          }, 500);
          setTimeout(async () => {
            await reloadMessages(selectedChatId);
          }, 1500);
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error('Error sending message:', errorData);
          showError("Ошибка отправки сообщения");
          setNewMessage(messageText);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        showError("Ошибка отправки сообщения");
        setNewMessage(messageText);
      }
      return;
    }

    // Только текст без ответа - через socket если подключен
    if (!socket || !socket.connected) {
      // Пытаемся отправить через API, если socket не подключен
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (res.ok) {
          const newMsg = await res.json();
          console.log('New message from API (socket fallback):', newMsg);
          // Перезагружаем сообщения, чтобы получить полные данные
          setTimeout(async () => {
            await reloadMessages(selectedChatId);
          }, 500);
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error('Error sending message (socket fallback):', errorData);
          showError("Ошибка отправки сообщения");
          setNewMessage(messageText);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        showError("Ошибка отправки сообщения");
        setNewMessage(messageText);
      }
      return;
    }

    try {
      socket.emit('send_message', {
        chatId: parseInt(selectedChatId),
        message: messageText,
        replyTo: replyToId
      });
      // Перезагружаем сообщения через небольшую задержку, чтобы сервер успел сохранить
      setTimeout(async () => {
        await reloadMessages(selectedChatId);
      }, 500);
    } catch (error) {
      console.error("Error sending message:", error);
      showError("Ошибка отправки сообщения");
      setNewMessage(messageText);
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = await showConfirm("Вы уверены, что хотите удалить этот чат?", "Удалить чат");
    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/messages/chats/${chatId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));
        if (selectedChatId === chatId.toString()) {
          router.push('/chat');
        }
        showSuccess("Чат успешно удален");
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка удаления чата");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      showError("Ошибка удаления чата");
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "только что";
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;
    return date.toLocaleDateString("ru-RU");
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.loading}>Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <h2>Войдите в аккаунт</h2>
            <p>Вы еще не зарегистрированы в системе, пожалуйста зарегистрируйтесь, чтобы использовать чат</p>
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
        {/* Левая панель - список чатов */}
        <div className={styles.chatsPanel}>
          <div className={styles.panelHeader}>
            <h1 className={styles.title}>Сообщения</h1>
          </div>
          {chats.length === 0 ? (
            <div className={styles.emptyState}>
              <p>У вас пока нет сообщений</p>
            </div>
          ) : (
            <div className={styles.chatsList}>
              {chats.map((chat) => {
                const hasUnread = unreadChats instanceof Set && unreadChats.has(chat.id.toString());
                const isSelected = selectedChatId === chat.id.toString();
                const isBlocked = isUserBlocked(chat.other_user_id);
                const userName = chat.other_user_name || '';
                let avatarLetter = '?';
                if (userName && userName.trim()) {
                  avatarLetter = userName.trim().charAt(0).toUpperCase();
                }

                return (
                  <div 
                    key={chat.id} 
                    className={`${styles.chatItemWrapper} ${isSelected ? styles.selected : ''} ${isBlocked ? styles.blockedChat : ''}`}
                    onClick={() => handleChatClick(chat.id)}
                  >
                    <div className={styles.chatItem}>
                      <div className={styles.chatImageWrapper}>
                        <div className={styles.chatAvatar}>
                          {avatarLetter}
                        </div>
                      </div>
                      <div className={styles.chatInfo}>
                        <div className={styles.chatHeader}>
                          <h3 className={styles.chatUserName}>
                            {chat.other_user_name}
                            {hasUnread && <span className={styles.unreadBadge}></span>}
                            {isBlocked && <span className={styles.blockedBadge}>Заблокирован</span>}
                          </h3>
                          <span className={styles.chatTime}>
                            {formatTime(chat.last_message_time)}
                          </span>
                        </div>
                        {chat.ad_id && (
                          <p className={styles.chatAdTitle}>{chat.ad_title}</p>
                        )}
                        {chat.last_message && (
                          <p className={styles.chatLastMessage}>{chat.last_message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Правая панель - открытый чат (только на десктопе) */}
        {selectedChatId && isDesktop && (
          <div className={styles.chatPanel}>
            {chatLoading ? (
              <div className={styles.loading}>Загрузка...</div>
            ) : selectedChat ? (
              <>
                {/* Заголовок чата */}
                <div className={styles.chatHeader}>
                  <Link href={`/seller/${selectedChat.other_user_id}`} className={styles.chatHeaderAvatar}>
                    <div className={styles.chatAvatar}>
                      {selectedChat.other_user_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  </Link>
                  <div className={styles.chatHeaderInfo}>
                    <Link href={`/seller/${selectedChat.other_user_id}`} className={styles.titleLink}>
                      <h1 className={styles.title}>
                        {selectedChat.other_user_name || 'Пользователь'}
                      </h1>
                    </Link>
                    {selectedChat.ad_id && (
                      <p className={styles.adTitle}>{selectedChat.ad_title}</p>
                    )}
                    {!selectedChat.ad_id && (
                      <p className={styles.adTitle}>Общий чат</p>
                    )}
                  </div>
                  <div className={styles.menuContainer}>
                    <button
                      className={styles.menuButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowChatMenu((prev) => !prev);
                      }}
                      type="button"
                      aria-label="Меню"
                    >
                      ⋮
                    </button>
                    {showChatMenu && (
                      <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        <button
                          className={styles.menuItem}
                          onClick={() => {
                            toggleBlockUser(selectedChat.other_user_id, selectedChat.other_user_name);
                            setShowChatMenu(false);
                          }}
                          type="button"
                        >
                          {isUserBlocked(selectedChat.other_user_id) ? "Разблокировать" : "Заблокировать"}
                        </button>
                        <button
                          className={styles.menuItem}
                          onClick={(e) => {
                            handleDeleteChat(selectedChatId, e);
                            setShowChatMenu(false);
                          }}
                          type="button"
                        >
                          Удалить чат
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Превью объявления (если есть, но не для поддержки) */}
                {selectedChat.ad_id && selectedChat.ad_title && !selectedChat.ad_title.toLowerCase().includes('поддержка') && (
                  <div className={styles.adPreview}>
                    <div className={styles.adImageWrapper}>
                      {selectedChat.ad_image && !selectedChat.ad_image.includes('/example.jpg') ? (
                        <img 
                          src={selectedChat.ad_image.startsWith('http') ? selectedChat.ad_image : `${API_BASE}${selectedChat.ad_image}`}
                          alt={selectedChat.ad_title}
                          className={styles.adImage}
                        />
                      ) : (
                        <div className={styles.adPlaceholder}>?</div>
                      )}
                    </div>
                    <div className={styles.adDetails}>
                      <h3>{selectedChat.ad_title}</h3>
                      {selectedChat.ad_price && (
                        <p className={styles.adPrice}>{String(selectedChat.ad_price).replace(/\.00$/, '')}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Сообщения */}
                <div className={styles.messagesContainer} ref={messagesContainerRef}>
                  {messages.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>Начните общение</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      // Отладочный вывод для проверки данных
                      if (message.image_url || message.reply_to) {
                        console.log('Message with image/reply:', {
                          id: message.id,
                          image_url: message.image_url,
                          reply_to: message.reply_to,
                          reply_to_message: message.reply_to_message,
                          reply_to_image_url: message.reply_to_image_url,
                          fullMessage: message
                        });
                      }
                      
                      const userStr = localStorage.getItem("user");
                      let isMyMessage = false;
                      if (userStr) {
                        try {
                          const user = JSON.parse(userStr);
                          isMyMessage = message.sender_id === user.id;
                        } catch {
                          isMyMessage = false;
                        }
                      }
                      return (
                        <div
                          key={message.id}
                          className={`${styles.message} ${isMyMessage ? styles.myMessage : styles.otherMessage}`}
                        >
                          <div className={styles.messageContent}>
                            {(message.reply_to !== null && message.reply_to !== undefined && message.reply_to !== 0) && (
                              <div className={styles.replyPreview}>
                                <div className={styles.replyLine}></div>
                                <div className={styles.replyContent}>
                                  <span className={styles.replyAuthor}>
                                    {message.reply_to_sender_name || 'Пользователь'}
                                  </span>
                                  <span className={styles.replyText}>
                                    {message.reply_to_message || (message.reply_to_image_url ? 'Изображение' : 'Сообщение')}
                                  </span>
                                </div>
                              </div>
                            )}
                            {(message.image_url !== null && message.image_url !== undefined && message.image_url !== '') && (
                              <div className={styles.messageImageWrapper}>
                                <img 
                                  src={message.image_url.startsWith('http') ? message.image_url : `${API_BASE}${message.image_url}`}
                                  alt="Изображение"
                                  className={styles.messageImage}
                                  onError={(e) => {
                                    if (e.target) {
                                      e.target.style.display = 'none';
                                    }
                                    if (e.target && e.target.nextSibling) {
                                      e.target.nextSibling.style.display = 'flex';
                                    }
                                  }}
                                  onLoad={() => {
                                    console.log('Image loaded successfully:', message.image_url);
                                  }}
                                />
                                <div className={styles.messageImagePlaceholder} style={{display: 'none'}}>?</div>
                              </div>
                            )}
                            {(message.message !== null && message.message !== undefined && message.message !== '') && (
                              <p className={styles.messageText}>{message.message}</p>
                            )}
                            <span className={styles.messageTime}>
                              {formatMessageTime(message.created_at)}
                            </span>
                          </div>
                          <button
                            className={styles.replyButton}
                            onClick={() => handleReply(message)}
                            aria-label="Ответить"
                            type="button"
                          >
                            ↪
                          </button>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Форма отправки сообщения */}
                <form className={styles.inputForm} onSubmit={handleSendMessage}>
                  {selectedChat?.other_user_id && isUserBlocked(selectedChat.other_user_id) && (
                    <div className={styles.blockedNotice}>
                      Вы заблокировали этого пользователя. Разблокируйте, чтобы писать.
                    </div>
                  )}
                  {replyingTo && (
                    <div className={styles.replyBar}>
                      <div className={styles.replyInfo}>
                        <span className={styles.replyLabel}>Ответ на:</span>
                        <span className={styles.replyMessage}>{replyingTo.message || 'Изображение'}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.cancelReplyButton}
                        onClick={handleCancelReply}
                        aria-label="Отменить ответ"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {imagePreview && (
                    <div className={styles.imagePreviewContainer}>
                      <img src={imagePreview} alt="Превью" className={styles.imagePreview} />
                      <button
                        type="button"
                        className={styles.removeImageButton}
                        onClick={handleRemoveImage}
                        aria-label="Удалить изображение"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className={styles.inputRow}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageSelect}
                      className={styles.fileInput}
                      id="imageInput"
                      disabled={selectedChat?.other_user_id && isUserBlocked(selectedChat.other_user_id)}
                    />
                    <label htmlFor="imageInput" className={`${styles.imageButton} ${selectedChat?.other_user_id && isUserBlocked(selectedChat.other_user_id) ? styles.imageButtonDisabled : ''}`}>
                      📷
                    </label>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Написать сообщение..."
                      className={styles.messageInput}
                      disabled={selectedChat?.other_user_id && isUserBlocked(selectedChat.other_user_id)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className={styles.sendButton}
                      disabled={(!newMessage.trim() && !selectedImage) || (selectedChat?.other_user_id && isUserBlocked(selectedChat.other_user_id))}
                    >
                      <svg className={styles.sendIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className={styles.sendText}>Отправить</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className={styles.emptyState}>
                <p>Чат не найден</p>
              </div>
            )}
          </div>
        )}

        {/* На десктопе показываем пустое состояние, если чат не выбран */}
        {!selectedChatId && isDesktop && (
          <div className={styles.emptyChatPanel}>
            <p>Выберите чат для начала общения</p>
          </div>
        )}
      </div>
    </div>
  );
}
