"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { io } from "socket.io-client";
import Link from "next/link";
import { useChatNotification } from "@/contexts/ChatNotificationContext";
import { useModal } from "@/contexts/ModalContext";
import styles from "./page.module.css";
import { API_BASE } from "@/config/api";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.id;
  
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [socket, setSocket] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const { markChatAsRead } = useChatNotification() || { markChatAsRead: () => {} };
  const { showError, showSuccess, showWarning, showConfirm } = useModal();

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
    const token = localStorage.getItem("token");
    if (!token || !chatId) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }
    setIsAuthenticated(true);
    
    // Подключаемся к Socket.IO через origin для работы с Nginx
    console.log('Connecting to socket with token:', token ? 'Token exists' : 'No token');
    const socketUrl = typeof window !== 'undefined' ? window.location.origin : API_BASE;
    const newSocket = io(socketUrl, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 10000,
      forceNew: false
    });
    
    setSocket(newSocket);
    
    // Загружаем данные сразу, не дожидаясь подключения сокета
    loadChat();
    loadMessages();
    
    newSocket.on('connect', () => {
      console.log('Connected to socket');
      newSocket.emit('join_chat', chatId);
    });
    
    // Если уже подключен, сразу присоединяемся к чату
    if (newSocket.connected) {
      newSocket.emit('join_chat', chatId);
    }
    
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Не показываем ошибку сразу, Socket.IO автоматически переподключится
      // Ошибка показывается только если подключение полностью не удалось
    });
    
    newSocket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Сервер отключил клиента, нужно переподключиться вручную
        console.log('Server disconnected, attempting reconnect...');
        newSocket.connect();
      }
    });
    
    newSocket.on('new_message', (message) => {
      console.log('Received new message from socket:', message);
      setMessages((prev) => {
        // Проверяем, нет ли уже такого сообщения (защита от дубликатов)
        const exists = prev.some(m => m.id === message.id);
        if (exists) {
          console.log('Message already exists, updating with new data');
          // Обновляем существующее сообщение, если пришли новые данные
          return prev.map(m => m.id === message.id ? { ...m, ...message } : m);
        }
        console.log('Adding new message to list');
        const newMessages = [...prev, message];
        // Сортируем по дате на всякий случай
        return newMessages.sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return dateA - dateB;
        });
      });
      scrollToBottom();
    });
    
    newSocket.on('message_notification', (data) => {
      // Уведомление обрабатывается в ChatNotificationContext
      console.log('New message notification:', data);
    });
    
    newSocket.on('message_error', (error) => {
      console.error('Message error:', error);
      showError('Ошибка отправки сообщения: ' + (error.error || 'Неизвестная ошибка'));
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket');
    });
    
    // Сбрасываем индикатор новых сообщений при открытии этого чата
    if (chatId) {
      markChatAsRead(chatId);
    }
    
    return () => {
      newSocket.emit('leave_chat', chatId);
      newSocket.disconnect();
    };
  }, [chatId, markChatAsRead]);

  const loadChat = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/messages/chats/${chatId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setChat(data);
      }
    } catch (error) {
      console.error("Error loading chat:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/messages/chats/${chatId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Loaded messages:', data);
        // Сортируем сообщения по дате
        const sortedMessages = data.sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return dateA - dateB;
        });
        setMessages(sortedMessages);
        // Прокручиваем вниз после загрузки
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "auto" });
          }
        }, 100);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isSending || (!newMessage.trim() && !selectedImage) || !chatId) return;
    if (chat?.other_user_id && isUserBlocked(chat.other_user_id)) {
      showWarning("Пользователь заблокирован. Разблокируйте, чтобы отправлять сообщения.");
      return;
    }

    setIsSending(true);
    const messageText = newMessage.trim();
    const imageToSend = selectedImage;
    const replyToSend = replyingTo;
    
    const formData = new FormData();
    formData.append('chatId', chatId);
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
    if (imageToSend || replyToSend) {
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
          console.log('New message from API:', newMsg);
          
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
            await loadMessages();
            scrollToBottom();
          }, 500);
          setTimeout(async () => {
            await loadMessages();
            scrollToBottom();
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
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Только текст без ответа - через socket если подключен
    if (!socket || !socket.connected) {
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
          console.log('New message from API:', newMsg);
          
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
            await loadMessages();
            scrollToBottom();
          }, 500);
          setTimeout(async () => {
            await loadMessages();
            scrollToBottom();
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
      } finally {
        setIsSending(false);
      }
      return;
    }

    try {
      socket.emit('send_message', {
        chatId: parseInt(chatId),
        message: messageText,
        replyTo: replyToSend?.id || null
      });
      // Перезагружаем сообщения через небольшую задержку, чтобы сервер успел сохранить
      setTimeout(async () => {
        await loadMessages();
        scrollToBottom();
        setIsSending(false);
      }, 500);
    } catch (error) {
      console.error("Error sending message:", error);
      showError("Ошибка отправки сообщения");
      setNewMessage(messageText);
      setIsSending(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const isMyMessage = (message) => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return false;
    try {
      const user = JSON.parse(userStr);
      return message.sender_id === user.id;
    } catch {
      return false;
    }
  };

  const handleDeleteChat = async () => {
    const confirmed = await showConfirm("Вы уверены, что хотите удалить этот чат? Все сообщения будут удалены.", "Удалить чат");
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
        showSuccess("Чат успешно удален");
        router.push("/chat");
      } else {
        const error = await res.json();
        showError(error.error || "Ошибка удаления чата");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      showError("Ошибка удаления чата");
    }
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

  if (!isAuthenticated || !chat) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <p>Чат не найден</p>
            <Link href="/chat" className={styles.backLink}>
              Вернуться к списку чатов
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fullImageUrl = chat.ad_image && chat.ad_id
    ? chat.ad_image.startsWith("http")
      ? chat.ad_image
      : `${API_BASE}${chat.ad_image}`
    : null;

  const userName = chat.other_user_name || '';
  const avatarLetter = userName && userName.trim() ? userName.trim().charAt(0).toUpperCase() : '?';
  const hasAdImage = fullImageUrl && fullImageUrl !== "/example.jpg" && chat.ad_id;

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/chat" className={styles.backButton}>← Назад</Link>
          {chat.other_user_id && (
            <Link 
              href={`/seller/${chat.other_user_id}`}
              className={styles.chatHeaderAvatar}
            >
              <div className={styles.chatAvatar}>
                {avatarLetter}
              </div>
            </Link>
          )}
          {!chat.other_user_id && (
            <div className={styles.chatHeaderAvatar}>
              <div className={styles.chatAvatar}>
                {avatarLetter}
              </div>
            </div>
          )}
          <div className={styles.chatHeaderInfo}>
            {chat.other_user_id ? (
              <Link 
                href={`/seller/${chat.other_user_id}`}
                className={styles.titleLink}
              >
                <h1 className={styles.title}>{chat.other_user_name || 'Неизвестный пользователь'}</h1>
              </Link>
            ) : (
              <h1 className={styles.title}>{chat.other_user_name || 'Неизвестный пользователь'}</h1>
            )}
            {chat.ad_id && <p className={styles.adTitle}>{chat.ad_title}</p>}
            {!chat.ad_id && <p className={styles.adTitle}>Общий чат</p>}
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
                    toggleBlockUser(chat.other_user_id, chat.other_user_name);
                    setShowChatMenu(false);
                  }}
                  type="button"
                >
                  {isUserBlocked(chat.other_user_id) ? "Разблокировать" : "Заблокировать"}
                </button>
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    handleDeleteChat();
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

        {chat.ad_id && chat.ad_title && !chat.ad_title.toLowerCase().includes('поддержка') && (
          <div className={styles.adPreview}>
            <div className={styles.adImageWrapper}>
              {hasAdImage ? (
                <img src={fullImageUrl} alt={chat.ad_title} className={styles.adImage} />
              ) : (
                <div className={styles.adPlaceholder}>
                  ?
                </div>
              )}
            </div>
            <div className={styles.adDetails}>
              <h3>{chat.ad_title}</h3>
              {chat.ad_price && <p className={styles.adPrice}>₸{String(chat.ad_price).replace(/\.00$/, '')}</p>}
            </div>
          </div>
        )}

        <div className={styles.messagesContainer} ref={messagesContainerRef}>
          {messages.map((message) => {
            const myMessage = isMyMessage(message);
            return (
              <div
                key={message.id}
                className={`${styles.message} ${myMessage ? styles.myMessage : styles.otherMessage}`}
              >
                <div className={styles.messageContent}>
                  {(message.reply_to !== null && message.reply_to !== undefined) && (
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
                  <span className={styles.messageTime}>{formatTime(message.created_at)}</span>
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
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className={styles.inputForm}>
          {chat?.other_user_id && isUserBlocked(chat.other_user_id) && (
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
              id="imageInputChat"
              disabled={chat?.other_user_id && isUserBlocked(chat.other_user_id)}
            />
            <label htmlFor="imageInputChat" className={`${styles.imageButton} ${chat?.other_user_id && isUserBlocked(chat.other_user_id) ? styles.imageButtonDisabled : ''}`}>
              📷
            </label>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Введите сообщение..."
              className={styles.messageInput}
              disabled={chat?.other_user_id && isUserBlocked(chat.other_user_id)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={isSending || (!newMessage.trim() && !selectedImage) || (chat?.other_user_id && isUserBlocked(chat.other_user_id))}
              className={styles.sendButton}
              title="Отправить"
            >
              {isSending ? (
                <>
                  <span className={styles.loader}></span>
                  <span className={styles.sendText}>Отправка...</span>
                </>
              ) : (
                <>
                  <svg className={styles.sendIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className={styles.sendText}>Отправить</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
