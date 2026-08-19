import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, Paperclip, ChevronLeft, Building2, Check, CheckCheck, Loader2
} from "lucide-react";
import { SUPPORT_PUBLIC_CHAT_USER, SUPPORT_PUBLIC_CHAT_USER_REPLY } from "../../Utils/Constants";

const PublicSupportChat = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [isAdminTyping, setIsAdminTyping] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const getMessageDateLabel = (dateStr) => {
    if (!dateStr) return "Today";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Today";
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

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isAdminTyping]);

  // Load support user details and message history
  useEffect(() => {
    const fetchChatDetails = async () => {
      try {
        const res = await fetch(`${SUPPORT_PUBLIC_CHAT_USER}/${userId}/messages`);
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setMessages(data.messages);
        } else {
          setError(data.message || "Failed to load chat session");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchChatDetails();
  }, [userId]);

  // Connect to Socket.io
  useEffect(() => {
    if (loading || error || !user) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
      : "http://localhost:5000");

    console.log("[PublicSupportChat] Connecting to socket URL:", socketUrl);
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[PublicSupportChat] Socket connected! ID:", socket.id);
      console.log("[PublicSupportChat] Emitting join_ticket for ticketId:", userId);
      socket.emit("join_ticket", { ticketId: userId, userId: user.id, role: "user" });
      socket.emit("read_receipt", { ticketId: userId, role: "user" });
    });

    socket.on("connect_error", (err) => {
      console.error("[PublicSupportChat] Socket connection error:", err);
    });

    // Handle events
    socket.on("receive_message", (message) => {
      console.log("[PublicSupportChat] Received message on socket:", message);
      setMessages((prev) => {
        // Prevent duplicate append
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

      // Send read receipt if we received an admin message
      if (message.sender_type === "admin") {
        socket.emit("read_receipt", { ticketId: userId, role: "user" });
      }
    });

    socket.on("typing_status", ({ name, isTyping }) => {
      console.log("[PublicSupportChat] Typing status changed:", { name, isTyping });
      setIsAdminTyping(isTyping);
    });

    socket.on("user_status", ({ role, online }) => {
      console.log("[PublicSupportChat] User status changed:", { role, online });
      if (role === "admin" || role === "pg_admin" || role === "super_admin") {
        setIsAdminOnline(online);
      }
    });

    socket.on("messages_read", ({ readBy }) => {
      console.log("[PublicSupportChat] Messages read by:", readBy);
      if (readBy === "admin") {
        setMessages((prev) =>
          prev.map((msg) => (msg.sender_type === "user" ? { ...msg, is_read: true } : msg))
        );
      }
    });

    return () => {
      console.log("[PublicSupportChat] Disconnecting socket.");
      socket.disconnect();
    };
  }, [loading, error, userId, user]);

  // Handle typing triggers
  const handleTextChange = (e) => {
    setNewMessageText(e.target.value);

    if (socketRef.current) {
      socketRef.current.emit("typing", { ticketId: userId, name: user?.name, isTyping: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit("typing", { ticketId: userId, name: user?.name, isTyping: false });
      }, 2000);
    }
  };

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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() && !attachment) return;

    const typedText = newMessageText.trim();
    const hasAttachment = !!attachment;

    // Clear input instantly if no attachment
    if (!hasAttachment) {
      setNewMessageText("");
    }

    const tempId = `opt-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      support_user_id: Number(userId),
      sender_type: "user",
      sender_id: null,
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
      payload.append("support_user_id", userId);
      payload.append("message", typedText);
      if (attachment) {
        payload.append("attachment", attachment);
      }

      const res = await fetch(SUPPORT_PUBLIC_CHAT_USER_REPLY, {
        method: "POST",
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

        // Trigger typing off
        if (socketRef.current) {
          socketRef.current.emit("typing", { ticketId: userId, name: user?.name, isTyping: false });
        }
      } else {
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        if (!hasAttachment) setNewMessageText(typedText);
        alert(data.message || "Failed to send message.");
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      if (!hasAttachment) setNewMessageText(typedText);
      alert("Failed to send message.");
    } finally {
      if (hasAttachment) {
        setSending(false);
        setAttachment(null);
        setAttachmentPreview(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
        <Loader2 className="animate-spin text-orange-500 mb-2" size={32} />
        <span className="text-xs text-slate-400">Connecting to Support Chat...</span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
        <div className="bg-red-500/10 p-5 rounded-full border border-red-500/20 text-red-400 mb-4">
          <MessageSquare size={36} />
        </div>
        <h2 className="text-lg font-bold text-slate-200">Chat Session Error</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6 text-center max-w-xs">{error || "User session not found."}</p>
        <Link
          to="/support/new"
          className="bg-slate-900 border border-slate-800 text-xs px-4 py-2 rounded-xl text-slate-300 font-bold hover:bg-slate-800 transition"
        >
          Go Back
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col p-0 md:p-6 text-slate-100 font-sans selection:bg-orange-500/30 overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/5 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto flex flex-col h-full bg-slate-900/60 backdrop-blur-xl border-x-0 md:border border-slate-800/80 rounded-none md:rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <Link
              to="/support/new"
              className="p-2 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-100 rounded-xl transition"
            >
              <ChevronLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-black text-slate-100 truncate max-w-[200px] md:max-w-md">
                  Agent
                </h1>
                <span className="text-[10px] text-slate-500">#{user.id}</span>
              </div>
              <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-400">
                <span className="flex items-center text-slate-500 font-medium">
                  <Building2 size={12} className="mr-1" />
                  {user.institution_name}
                </span>
                <span className="text-slate-700">•</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Chat
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <div
              className={`w-2.5 h-2.5 rounded-full ${isAdminOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-700"
                }`}
            />
            <span className="text-[10px] font-bold text-slate-400">
              {isAdminOnline ? "Support Agent Active" : "Agent Offline"}
            </span>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-h-0 bg-slate-950/20">
          {messages.map((msg, index) => {
            const isMe = msg.sender_type === "user";
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
                    <span className="text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border bg-slate-900 border-slate-800 text-slate-400">
                      {currentDateLabel}
                    </span>
                  </div>
                )}

                <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed relative ${isMe
                      ? "bg-orange-600 text-slate-950 font-bold rounded-tr-none"
                      : "bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800/60"
                      }`}
                  >
                    {/* Sender Label */}
                    <div
                      className={`text-[9px] font-black uppercase tracking-wider mb-1 ${isMe ? "text-slate-900/60" : "text-orange-500"
                        }`}
                    >
                      {isMe ? "You" : "Agent"}
                    </div>

                    {/* Message Body */}
                    <div className="whitespace-pre-wrap">{msg.message}</div>

                    {/* Attachment */}
                    {msg.attachment && (
                      <div className="mt-2.5 pt-2 border-t border-slate-900/10">
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
                            className="flex items-center space-x-2 bg-slate-950/30 p-2 rounded-xl text-[11px] font-bold text-slate-950 hover:bg-slate-950/40 transition"
                          >
                            <Paperclip size={14} />
                            <span className="truncate max-w-[150px]">View Attachment</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Message Info (Time + Read Receipt) */}
                    <div
                      className={`flex items-center justify-end space-x-1 mt-1 text-[9px] ${isMe ? "text-slate-900/50" : "text-slate-500"
                        }`}
                    >
                      <span>{messageTime}</span>
                      {isMe && (
                        <span>
                          {msg.is_read ? (
                            <CheckCheck size={12} className="text-slate-900/80" />
                          ) : (
                            <Check size={12} className="text-slate-900/40" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Typing Indicator */}
          <AnimatePresence>
            {isAdminTyping && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center space-x-2 bg-slate-900/50 border border-slate-800/40 px-3 py-2 rounded-2xl w-fit text-[11px] text-slate-400 font-bold"
              >
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce delay-0" />
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span>PG Support Agent is typing...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/80 shrink-0">
          <form onSubmit={handleSend} className="space-y-3">
            {attachment && (
              <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 p-2 rounded-2xl max-w-sm">
                <div className="flex items-center space-x-2">
                  {attachmentPreview === "pdf" ? (
                    <div className="bg-red-500/20 text-red-400 text-[10px] px-2 py-1 rounded-md font-black uppercase">
                      PDF
                    </div>
                  ) : attachmentPreview ? (
                    <img
                      src={attachmentPreview}
                      alt="Attachment Preview"
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : null}
                  <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                    {attachment.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachment(null);
                    setAttachmentPreview(null);
                  }}
                  className="text-slate-500 hover:text-slate-200 text-xs px-2 cursor-pointer font-bold"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <label className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-100 rounded-2xl cursor-pointer transition shrink-0">
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
                value={newMessageText}
                onChange={handleTextChange}
                placeholder="Type your support reply..."
                className="flex-1 bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none transition"
              />

              <button
                type="submit"
                disabled={sending || (!newMessageText.trim() && !attachment)}
                className="p-3 bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 rounded-2xl hover:brightness-105 transition disabled:opacity-50 shrink-0 cursor-pointer shadow-lg shadow-orange-500/10"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PublicSupportChat;
