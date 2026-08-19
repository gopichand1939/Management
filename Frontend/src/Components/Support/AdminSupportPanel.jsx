import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MessageSquare, Send, Paperclip, Check, CheckCheck, Loader2,
  Building, ArrowLeft, Phone, Mail, MailOpen, Trash2, Palette
} from "lucide-react";
import {
  SUPPORT_ADMIN_CHAT_USERS, SUPPORT_ADMIN_CHAT_USER_MESSAGES, SUPPORT_ADMIN_CHAT_USER_REPLY
} from "../../Utils/Constants";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";

const AdminSupportPanel = () => {
  const { authUser, token } = useSelector((state) => state.user);

  // Active support user chats list
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [listLoading, setListLoading] = useState(true);

  // Selected chat state
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [sending, setSending] = useState(false);

  // Local theme state for Chat Panel
  const [chatTheme, setChatTheme] = useState(() => localStorage.getItem("admin_chat_theme") || "light");

  const toggleChatTheme = () => {
    const nextTheme = chatTheme === "light" ? "dark" : "light";
    setChatTheme(nextTheme);
    localStorage.setItem("admin_chat_theme", nextTheme);
  };

  // Local gradient background choice for Right Chat panel
  const [chatGradient, setChatGradient] = useState(() => localStorage.getItem("admin_chat_gradient") || "none");
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);
  const [customStartColor, setCustomStartColor] = useState(() => localStorage.getItem("admin_chat_custom_start") || "#f97316");
  const [customEndColor, setCustomEndColor] = useState(() => localStorage.getItem("admin_chat_custom_end") || "#0f172a");

  const paletteMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (paletteMenuRef.current && !paletteMenuRef.current.contains(event.target)) {
        setShowPaletteMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCustomColorChange = (e, type) => {
    const color = e.target.value;
    if (type === "start") {
      setCustomStartColor(color);
      localStorage.setItem("admin_chat_custom_start", color);
    } else {
      setCustomEndColor(color);
      localStorage.setItem("admin_chat_custom_end", color);
    }
    setChatGradient("custom");
    localStorage.setItem("admin_chat_gradient", "custom");
  };

  const handlePresetSelect = (preset) => {
    setChatGradient(preset);
    localStorage.setItem("admin_chat_gradient", preset);
  };

  const handleResetGradient = () => {
    setChatGradient("none");
    localStorage.setItem("admin_chat_gradient", "none");
    setCustomStartColor("#f97316");
    setCustomEndColor("#0f172a");
    localStorage.removeItem("admin_chat_custom_start");
    localStorage.removeItem("admin_chat_custom_end");
  };

  const getFeedBackgroundClass = () => {
    if (chatGradient === "custom") return "";
    if (chatTheme === "dark") {
      switch (chatGradient) {
        case "sunset":
          return "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-slate-950/90 to-slate-950";
        case "cosmic":
          return "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-purple-950/90 to-slate-950";
        case "emerald":
          return "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/8 via-teal-950/90 to-slate-950";
        default:
          return "bg-slate-950/40";
      }
    } else {
      switch (chatGradient) {
        case "sunset":
          return "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-100/40 via-slate-50/90 to-slate-100/50";
        case "cosmic":
          return "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-purple-50/90 to-slate-50/80";
        case "emerald":
          return "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/40 via-teal-50/90 to-slate-50/80";
        default:
          return "bg-slate-50/30";
      }
    }
  };

  const getMessageDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], {
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    }
  };

  // Socket states
  const [isUserOnline, setIsUserOnline] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);

  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const getHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  }), [token]);

  // Load chat threads based on search
  const fetchChats = useCallback(async (showLoading = false) => {
    if (showLoading) setListLoading(true);
    try {
      const payload = {
        search: searchQuery,
      };

      const res = await fetch(SUPPORT_ADMIN_CHAT_USERS, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setChats(data.data);
      }
    } catch (err) {
      console.error("Error loading support chats:", err);
    } finally {
      if (showLoading) setListLoading(false);
    }
  }, [searchQuery, getHeaders]);

  useEffect(() => {
    fetchChats(true);
  }, [fetchChats]);

  // Load message logs for clicked chat user
  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    setMessagesLoading(true);
    setIsUserOnline(false);
    setIsUserTyping(false);

    try {
      const res = await fetch(`${SUPPORT_ADMIN_CHAT_USER_MESSAGES}/${chat.id}/messages`, {
        method: "GET",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
        // Clear unread badge in list immediately
        setChats((prev) =>
          prev.map((c) => (c.id === chat.id ? { ...c, unread_count: 0 } : c))
        );
      }
    } catch (err) {
      console.error("Error loading chat messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Socket Connection management
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
      : "http://localhost:5000");

    const socket = io(socketUrl);
    socketRef.current = socket;

    // Handle updates in real time
    socket.on("new_ticket", (data) => {
      fetchChats();
      if (Notification.permission === "granted") {
        new Notification(`New message from ${data.name}`, { body: data.subject });
      }
    });

    socket.on("ticket_updated", () => {
      fetchChats();
    });

    socket.on("ticket_list_changed", () => {
      fetchChats();
    });

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      socket.disconnect();
    };
  }, [fetchChats]);

  // Selected chat specific socket handlers
  useEffect(() => {
    if (!selectedChat || !socketRef.current) return;

    const socket = socketRef.current;

    // Join room
    socket.emit("join_ticket", {
      ticketId: selectedChat.id,
      userId: authUser.id,
      role: "admin",
    });

    socket.on("receive_message", (message) => {
      if (Number(message.support_user_id) === Number(selectedChat.id)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;

          // Replace any matching optimistic message
          const optIndex = prev.findIndex(
            (m) => m.isOptimistic && m.message === message.message
          );
          if (optIndex !== -1) {
            const updated = [...prev];
            updated[optIndex] = message;
            return updated;
          }

          return [...prev, message];
        });
        socket.emit("read_receipt", { ticketId: selectedChat.id, role: "admin" });
        fetch(`${SUPPORT_ADMIN_CHAT_USER_MESSAGES}/${selectedChat.id}/messages`, {
          method: "GET",
          headers: getHeaders(),
        }).catch(err => console.error(err));
      }
    });

    socket.on("typing_status", ({ name, isTyping }) => {
      setIsUserTyping(isTyping);
    });

    socket.on("user_status", ({ role, online }) => {
      if (role === "user") {
        setIsUserOnline(online);
      }
    });

    socket.on("messages_read", ({ readBy }) => {
      if (readBy === "user") {
        setMessages((prev) =>
          prev.map((msg) => (msg.sender_type === "admin" ? { ...msg, is_read: true } : msg))
        );
      }
    });

    socket.emit("read_receipt", { ticketId: selectedChat.id, role: "admin" });

    return () => {
      socket.off("receive_message");
      socket.off("typing_status");
      socket.off("user_status");
      socket.off("messages_read");
    };
  }, [selectedChat, authUser.id, getHeaders]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isUserTyping]);

  // Typing event emits
  const handleReplyChange = (e) => {
    setReplyText(e.target.value);

    if (socketRef.current && selectedChat) {
      socketRef.current.emit("typing", {
        ticketId: selectedChat.id,
        name: authUser.name || "Admin",
        isTyping: true,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit("typing", {
          ticketId: selectedChat.id,
          name: authUser.name || "Admin",
          isTyping: false,
        });
      }, 2000);
    }
  };

  const handleMarkRead = async (e, chatId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${SUPPORT_ADMIN_CHAT_USER_MESSAGES}/${chatId}/mark-read`, {
        method: "PUT",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        fetchChats();
      }
    } catch (err) {
      console.error("Error marking chat as read:", err);
    }
  };

  const handleMarkUnread = async (e, chatId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${SUPPORT_ADMIN_CHAT_USER_MESSAGES}/${chatId}/mark-unread`, {
        method: "PUT",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        fetchChats();
        if (selectedChat?.id === chatId) {
          setSelectedChat(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Error marking chat as unread:", err);
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation permanently? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`${SUPPORT_ADMIN_CHAT_USER_MESSAGES}/${chatId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        fetchChats();
        if (selectedChat?.id === chatId) {
          setSelectedChat(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  // Upload/Preview file replies
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be under 10MB");
        return;
      }
      setAttachment(file);
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
        setAttachmentPreview(URL.createObjectURL(file));
      } else {
        setAttachmentPreview("pdf");
      }
    }
  };

  // Send Admin Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && !attachment) return;

    const typedText = replyText.trim();
    const hasAttachment = !!attachment;

    // Clear input instantly if no attachment
    if (!hasAttachment) {
      setReplyText("");
    }

    const tempId = `opt-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      support_user_id: selectedChat.id,
      sender_type: "admin",
      sender_id: authUser.id,
      message: typedText,
      attachment: attachmentPreview,
      is_read: false,
      created_at: new Date().toISOString(),
      isOptimistic: true
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    if (hasAttachment) {
      setSending(true);
    }

    try {
      const payload = new FormData();
      payload.append("support_user_id", selectedChat.id);
      payload.append("message", typedText);
      if (attachment) {
        payload.append("attachment", attachment);
      }

      const res = await fetch(SUPPORT_ADMIN_CHAT_USER_REPLY, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: payload,
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.data.id)) {
            return prev.filter((msg) => msg.id !== tempId);
          }
          return prev.map((msg) => (msg.id === tempId ? data.data : msg));
        });

        if (socketRef.current) {
          socketRef.current.emit("typing", {
            ticketId: selectedChat.id,
            name: authUser.name || "Admin",
            isTyping: false,
          });
        }
      } else {
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        if (!hasAttachment) setReplyText(typedText);
        alert(data.message || "Failed to send message");
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      if (!hasAttachment) setReplyText(typedText);
      alert("Failed to send message");
    } finally {
      if (hasAttachment) {
        setSending(false);
        setAttachment(null);
        setAttachmentPreview(null);
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar title="Live Support Center" />
        <main className="flex-1 overflow-hidden p-2 md:p-3 flex flex-col relative min-h-0 bg-[#F8FAFC]">

          {/* Main WhatsApp/Intercom Chat Panel Widget */}
          <div className={`flex-1 flex flex-col md:flex-row rounded-2xl border overflow-hidden shadow-sm relative min-h-0 transition-colors duration-200 ${
            chatTheme === "dark" 
              ? "bg-slate-900 border-slate-800 text-slate-100" 
              : "bg-white border-slate-200/80 text-slate-800"
          }`}>
            
            {/* Left panel: chats list */}
            <div className={`w-full md:w-[350px] border-r flex flex-col h-full relative z-10 shrink-0 overflow-hidden min-h-0 transition-colors duration-200 ${
              chatTheme === "dark" 
                ? "border-slate-800 bg-slate-950/80" 
                : "border-slate-200 bg-slate-50/50"
            }`}>
              {/* Search */}
              <div className={`p-3 border-b space-y-2 shrink-0 transition-colors duration-200 ${
                chatTheme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}>
                <h2 className={`text-xs font-black tracking-wider uppercase ${
                  chatTheme === "dark" ? "text-slate-200" : "text-slate-800"
                }`}>
                  Live Support
                </h2>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, phone, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full h-8 border rounded-xl pl-9 pr-4 text-xs transition-colors duration-200 focus:outline-none ${
                      chatTheme === "dark"
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-650 focus:border-orange-500/50"
                        : "bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-orange-500/40 focus:bg-white"
                    }`}
                  />
                  <Search size={12} className="absolute left-3 top-2.5 text-slate-400" />
                </div>
              </div>

              {/* Chat Users List */}
              <div className={`flex-1 overflow-y-auto min-h-0 transition-colors duration-200 ${
                chatTheme === "dark" ? "bg-slate-950/20" : "bg-slate-50/20"
              }`} ref={listRef}>
                {listLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-2">
                    <Loader2 className="animate-spin text-orange-500" size={20} />
                    <span className={`text-[11px] font-medium ${chatTheme === "dark" ? "text-slate-500" : "text-slate-400"}`}>Syncing chats...</span>
                  </div>
                ) : chats.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-16 space-y-2 ${chatTheme === "dark" ? "text-slate-550" : "text-slate-400"}`}>
                    <MessageSquare size={24} />
                    <span className="text-[11px] font-semibold">No active conversations</span>
                  </div>
                ) : (
                  chats.map((c) => {
                    const isActive = selectedChat?.id === c.id;
                    const hasUnread = c.unread_count > 0;
                    const lastMsgTime = c.last_message_time
                      ? new Date(c.last_message_time).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })
                      : "";

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectChat(c)}
                        className={`p-3 border-b transition cursor-pointer flex items-center justify-between group relative ${
                          chatTheme === "dark" ? "border-slate-900/50" : "border-slate-100"
                        } ${
                          isActive 
                            ? chatTheme === "dark" 
                              ? "bg-orange-500/10 border-l-2 border-l-orange-500" 
                              : "bg-orange-500/5 border-l-2 border-l-orange-500" 
                            : chatTheme === "dark"
                              ? "hover:bg-slate-900/40"
                              : "hover:bg-slate-100/50"
                        }`}
                      >
                        <div className="space-y-1 truncate flex-1 pr-3">
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs font-bold truncate ${
                              chatTheme === "dark" ? "text-slate-200" : "text-slate-800"
                            }`}>{c.name}</span>
                            {/* <span className="text-[9px] text-slate-400 font-bold">{c.id}</span> */}
                          </div>
                          {/* <div className={`text-[10px] font-medium truncate ${
                            chatTheme === "dark" ? "text-slate-400" : "text-slate-500"
                          }`}>
                            {c.phone}
                          </div> */}
                          <div className={`text-[10px] truncate italic ${
                            chatTheme === "dark" ? "text-slate-500" : "text-slate-400"
                          }`}>
                            {c.last_message || "No messages yet"}
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 space-y-1 relative min-w-[50px]">
                          <span className="text-[9px] text-slate-400 font-medium group-hover:opacity-0 transition-opacity duration-150">{lastMsgTime}</span>
                          <div className="flex items-center space-x-1.5 group-hover:opacity-0 transition-opacity duration-150">
                            {hasUnread && (
                              <span className="bg-orange-500 text-white font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center">
                                {c.unread_count}
                              </span>
                            )}
                          </div>
                          
                          {/* Hover Action Panel - Mark Unread/Read & Delete */}
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center space-x-1 transition-all duration-150">
                            {c.unread_count > 0 ? (
                              <button
                                onClick={(e) => handleMarkRead(e, c.id)}
                                className={`p-1 rounded transition ${
                                  chatTheme === "dark" 
                                    ? "text-slate-450 hover:text-orange-400 hover:bg-slate-800" 
                                    : "text-slate-400 hover:text-orange-500 hover:bg-slate-200/50"
                                }`}
                                title="Mark as Read"
                              >
                                <MailOpen size={12} className="shrink-0" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => handleMarkUnread(e, c.id)}
                                className={`p-1 rounded transition ${
                                  chatTheme === "dark" 
                                    ? "text-slate-455 hover:text-orange-400 hover:bg-slate-800" 
                                    : "text-slate-400 hover:text-orange-500 hover:bg-slate-200/50"
                                }`}
                                title="Mark as Unread"
                              >
                                <Mail size={12} className="shrink-0" />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDeleteChat(e, c.id)}
                              className={`p-1 rounded transition ${
                                chatTheme === "dark" 
                                  ? "text-slate-450 hover:text-red-400 hover:bg-red-500/10" 
                                  : "text-slate-450 hover:text-red-500 hover:bg-red-50"
                              }`}
                              title="Delete Conversation"
                            >
                              <Trash2 size={12} className="shrink-0" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel: Chat Log */}
            {selectedChat ? (
              <div className={`flex-1 flex flex-col h-full min-w-0 transition-colors duration-200 ${
                chatTheme === "dark" ? "bg-slate-950 text-slate-100 border-l border-slate-800" : "bg-white text-slate-800"
              }`}>
                {/* Header info */}
                <div className={`py-2 px-4 border-b flex justify-between items-center shrink-0 transition-colors duration-200 ${
                  chatTheme === "dark" ? "bg-slate-900 border-slate-800" : "bg-slate-50/50 border-slate-200"
                }`}>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className={`text-xs font-bold ${
                        chatTheme === "dark" ? "text-slate-100" : "text-slate-800"
                      }`}>{selectedChat.name}</h3>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isUserOnline ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      <span className={`text-[9px] font-bold ${
                        chatTheme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}>
                        {isUserOnline ? "Active Now" : "Offline"}
                      </span>
                    </div>
                    <div className={`text-[10px] truncate mt-0.5 flex items-center space-x-2 ${
                      chatTheme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}>
                      <span className="flex items-center"><Building size={11} className="mr-1 text-slate-400" />{selectedChat.institution_name}</span>
                      <span>•</span>
                      <span className="flex items-center"><Phone size={11} className="mr-1 text-slate-400" />{selectedChat.phone}</span>
                      <span>•</span>
                      <span className="flex items-center"><Mail size={11} className="mr-1 text-slate-400" />{selectedChat.email}</span>
                    </div>
                  </div>

                  {/* Dark/Light local Theme Toggler & Gradient Toggler */}
                  <div className="flex items-center space-x-2 relative" ref={paletteMenuRef}>
                    <button
                      onClick={() => setShowPaletteMenu(!showPaletteMenu)}
                      className={`p-2 rounded-xl border transition-all duration-200 shadow-sm cursor-pointer ${
                        chatTheme === "dark"
                          ? "bg-slate-950 border-slate-800 text-orange-400 hover:bg-slate-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      title="Custom Gradient Palette"
                    >
                      <Palette size={16} />
                    </button>

                    {showPaletteMenu && (
                      <div className={`absolute right-0 top-11 z-50 w-64 rounded-2xl shadow-xl p-4 flex flex-col space-y-3.5 border transition-all duration-150 ${
                        chatTheme === "dark"
                          ? "bg-slate-950 border-slate-800 text-slate-100 shadow-slate-950/80"
                          : "bg-white border-slate-200 text-slate-800 shadow-slate-200/50"
                      }`}>
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Preset Themes
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => handlePresetSelect("none")}
                            className={`h-8 rounded-xl border text-[9px] font-bold cursor-pointer ${
                              chatGradient === "none"
                                ? "border-orange-500 bg-orange-500/10 text-orange-500"
                                : chatTheme === "dark"
                                  ? "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            Classic
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePresetSelect("sunset")}
                            className={`h-8 rounded-xl border text-[9px] font-bold cursor-pointer bg-gradient-to-tr from-amber-500/20 to-orange-500/20 ${
                              chatGradient === "sunset"
                                ? "border-orange-500 text-orange-500"
                                : chatTheme === "dark"
                                  ? "border-slate-800 text-slate-300 hover:border-slate-700"
                                  : "border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            Sunset
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePresetSelect("cosmic")}
                            className={`h-8 rounded-xl border text-[9px] font-bold cursor-pointer bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 ${
                              chatGradient === "cosmic"
                                ? "border-orange-500 text-orange-500"
                                : chatTheme === "dark"
                                  ? "border-slate-800 text-slate-300 hover:border-slate-700"
                                  : "border-slate-200 text-slate-650 hover:border-slate-300"
                            }`}
                          >
                            Cosmic
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePresetSelect("emerald")}
                            className={`h-8 rounded-xl border text-[9px] font-bold cursor-pointer bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 ${
                              chatGradient === "emerald"
                                ? "border-orange-500 text-orange-500"
                                : chatTheme === "dark"
                                  ? "border-slate-800 text-slate-300 hover:border-slate-700"
                                  : "border-slate-200 text-slate-650 hover:border-slate-300"
                            }`}
                          >
                            Zen
                          </button>
                        </div>

                        <div className="border-t border-slate-200/50 dark:border-slate-800/50 my-1" />

                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Custom Gradient (RGB)
                        </div>
                        <div className="flex items-center justify-between space-x-3">
                          <div className="flex-1 flex flex-col space-y-1">
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Start</span>
                            <div className={`flex items-center space-x-1.5 border p-1 rounded-xl ${
                              chatTheme === "dark" ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                            }`}>
                              <input
                                type="color"
                                value={customStartColor}
                                onChange={(e) => handleCustomColorChange(e, "start")}
                                className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                              />
                              <span className="text-[8px] font-mono tracking-tighter uppercase">{customStartColor}</span>
                            </div>
                          </div>
                          <div className="flex-1 flex flex-col space-y-1">
                            <span className="text-[8px] font-bold text-slate-400 uppercase">End</span>
                            <div className={`flex items-center space-x-1.5 border p-1 rounded-xl ${
                              chatTheme === "dark" ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                            }`}>
                              <input
                                type="color"
                                value={customEndColor}
                                onChange={(e) => handleCustomColorChange(e, "end")}
                                className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                              />
                              <span className="text-[8px] font-mono tracking-tighter uppercase">{customEndColor}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleResetGradient}
                          className={`w-full py-1.5 mt-1 border rounded-xl text-[10px] font-bold cursor-pointer transition-all duration-200 ${
                            chatTheme === "dark"
                              ? "border-slate-850 text-slate-400 bg-slate-900 hover:bg-slate-800 hover:text-slate-200"
                              : "border-slate-200 text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-750"
                          }`}
                        >
                          Reset to Default
                        </button>
                      </div>
                    )}

                    <button
                      onClick={toggleChatTheme}
                      className={`p-2 rounded-xl border transition-all duration-200 shadow-sm cursor-pointer ${
                        chatTheme === "dark"
                          ? "bg-slate-950 border-slate-800 text-amber-400 hover:bg-slate-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      title={chatTheme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
                    >
                      {chatTheme === "dark" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Messages Feed */}
                <div
                  className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-h-0 transition-all duration-300 ${
                    getFeedBackgroundClass()
                  }`}
                  style={
                    chatGradient === "custom"
                      ? {
                          background: chatTheme === "dark"
                            ? `linear-gradient(135deg, ${customStartColor}20 0%, ${customEndColor}f2 100%)`
                            : `linear-gradient(135deg, ${customStartColor}15 0%, ${customEndColor}25 100%)`
                        }
                      : {}
                  }
                >
                  {messagesLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-2">
                      <Loader2 className="animate-spin text-orange-500" size={24} />
                      <span className={`text-xs ${chatTheme === "dark" ? "text-slate-500" : "text-slate-400"}`}>Loading conversation...</span>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isMe = msg.sender_type === "admin";
                      const messageTime = new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      const currentDateLabel = getMessageDateLabel(msg.created_at);
                      const prevMessage = index > 0 ? messages[index - 1] : null;
                      const prevDateLabel = prevMessage ? getMessageDateLabel(prevMessage.created_at) : null;
                      const showDateSeparator = currentDateLabel !== prevDateLabel;

                      return (
                        <React.Fragment key={msg.id}>
                          {showDateSeparator && (
                            <div className="flex justify-center my-3 select-none">
                              <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border transition-all duration-250 ${
                                chatTheme === "dark" 
                                  ? "bg-slate-950/85 border-slate-800 text-slate-400" 
                                  : "bg-slate-100 border-slate-200 text-slate-500"
                              }`}>
                                {currentDateLabel}
                              </span>
                            </div>
                          )}

                          <div
                            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl py-1.5 px-3 text-xs leading-relaxed relative border transition-all duration-200 ${
                                isMe
                                  ? chatTheme === "dark"
                                    ? "bg-slate-900 text-slate-200 rounded-tr-none border-slate-800/80"
                                    : "bg-slate-100 text-slate-800 rounded-tr-none border-slate-200/80"
                                  : chatTheme === "dark"
                                    ? "bg-orange-600 text-slate-950 font-black rounded-tl-none border-orange-650"
                                    : "bg-orange-500 text-white font-medium rounded-tl-none border-orange-500"
                              }`}
                            >
                              <div
                                className={`text-[8px] font-black uppercase tracking-wider mb-0.5 ${
                                  isMe 
                                    ? "text-orange-500" 
                                    : chatTheme === "dark"
                                      ? "text-slate-950/60"
                                      : "text-white/70"
                                }`}
                              >
                                {isMe ? "Agent Reply" : "Support User"}
                              </div>

                              <div className="whitespace-pre-wrap">{msg.message}</div>

                              {msg.attachment && (
                                <div className="mt-2 pt-2 border-t border-slate-200/60">
                                  {msg.attachment.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                    <a href={msg.attachment} target="_blank" rel="noreferrer">
                                      <img
                                        src={msg.attachment}
                                        alt="Attachment"
                                        className="max-h-48 rounded-lg object-cover cursor-zoom-in hover:brightness-95 transition"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      href={msg.attachment}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`flex items-center space-x-2 p-2 rounded-xl text-[10px] font-bold transition w-fit ${
                                        isMe
                                          ? chatTheme === "dark"
                                            ? "bg-slate-950/80 text-slate-400 hover:bg-slate-950"
                                            : "bg-slate-200/60 text-slate-700 hover:bg-slate-200"
                                          : chatTheme === "dark"
                                            ? "bg-orange-700/60 text-slate-950 hover:bg-orange-750"
                                            : "bg-orange-600 text-white hover:bg-orange-700"
                                      }`}
                                    >
                                      <Paperclip size={12} />
                                      <span className="truncate max-w-[120px]">View Attachment</span>
                                    </a>
                                  )}
                                </div>
                              )}

                              <div
                                className={`flex items-center justify-end space-x-1 mt-0.5 text-[8px] ${
                                  isMe 
                                    ? chatTheme === "dark"
                                      ? "text-slate-500"
                                      : "text-slate-400" 
                                    : chatTheme === "dark"
                                      ? "text-slate-950/50"
                                      : "text-white/60"
                                }`}
                              >
                                <span>{messageTime}</span>
                                {isMe && (
                                  <span>
                                    {msg.is_read ? (
                                      <CheckCheck size={12} className="text-orange-500" />
                                    ) : (
                                      <Check size={12} className="text-slate-400" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}

                  {/* Typing indicator */}
                  <AnimatePresence>
                    {isUserTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex items-center space-x-2 border px-3 py-2 rounded-2xl w-fit text-[11px] font-bold shadow-sm transition-all duration-200 ${
                          chatTheme === "dark"
                            ? "bg-slate-900 border-slate-800 text-slate-400"
                            : "bg-white border-slate-200/80 text-slate-500"
                        }`}
                      >
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce delay-0" />
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                        <span>User is typing...</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div ref={chatEndRef} />
                </div>

                {/* Input Box */}
                <div className={`p-4 border-t shrink-0 transition-colors duration-200 ${
                  chatTheme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                }`}>
                  <form onSubmit={handleSendReply} className="space-y-3">
                    {attachment && (
                      <div className={`flex items-center justify-between border p-2 rounded-2xl max-w-sm transition-colors duration-200 ${
                        chatTheme === "dark"
                          ? "bg-slate-950 border-slate-850"
                          : "bg-slate-50 border-slate-200"
                      }`}>
                        <div className="flex items-center space-x-2">
                          {attachmentPreview === "pdf" ? (
                            <div className="bg-red-500/10 text-red-500 text-[10px] px-2 py-1 rounded-md font-bold uppercase">
                              PDF
                            </div>
                          ) : attachmentPreview ? (
                            <img
                              src={attachmentPreview}
                              alt="Attachment Preview"
                              className={`w-8 h-8 rounded-lg object-cover border ${
                                chatTheme === "dark" ? "border-slate-800" : "border-slate-200"
                              }`}
                            />
                          ) : null}
                          <span className={`text-[11px] truncate max-w-[200px] ${
                            chatTheme === "dark" ? "text-slate-400" : "text-slate-500"
                          }`}>
                            {attachment.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachment(null);
                            setAttachmentPreview(null);
                          }}
                          className="text-slate-400 hover:text-slate-650 text-xs px-2 cursor-pointer font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <div className="flex items-center space-x-3">
                      <label className={`p-3 border rounded-2xl cursor-pointer transition duration-200 shrink-0 ${
                        chatTheme === "dark"
                          ? "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          : "bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-505 hover:text-slate-800"
                      }`}>
                        <Paperclip size={16} />
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>

                      <input
                        type="text"
                        value={replyText}
                        onChange={handleReplyChange}
                        placeholder="Type your reply to user..."
                        className={`flex-1 border rounded-2xl px-4 py-3 text-xs transition duration-200 focus:outline-none ${
                          chatTheme === "dark"
                            ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-orange-500/50"
                            : "bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-orange-500/40 focus:bg-white"
                        }`}
                      />

                      <button
                        type="submit"
                        disabled={sending || (!replyText.trim() && !attachment)}
                        className="p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl hover:brightness-105 transition disabled:opacity-50 shrink-0 cursor-pointer shadow-sm shadow-orange-500/10"
                      >
                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className={`flex-1 flex flex-col items-center justify-center p-8 relative z-10 transition-colors duration-200 ${
                chatTheme === "dark" 
                  ? "bg-slate-950/40 text-slate-500 border-l border-slate-800" 
                  : "bg-slate-50/10 text-slate-400"
              }`}>
                <div className={`p-6 rounded-3xl mb-4 border transition-all duration-200 shadow-sm ${
                  chatTheme === "dark" 
                    ? "bg-slate-900 border-slate-800 text-slate-400" 
                    : "bg-slate-50 border border-slate-200 text-slate-400"
                }`}>
                  <MessageSquare size={36} className={chatTheme === "dark" ? "text-slate-500" : "text-slate-400"} />
                </div>
                <h3 className={`text-sm font-bold ${
                  chatTheme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}>Select a Conversation</h3>
                <p className={`text-[11px] mt-1 max-w-xs text-center font-medium ${
                  chatTheme === "dark" ? "text-slate-550" : "text-slate-400"
                }`}>
                  Click on a live conversation in the left sidebar to view message history and reply in real-time.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminSupportPanel;
