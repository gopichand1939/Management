import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MessageSquare, Send, Paperclip, Check, CheckCheck, Loader2,
  Building, ArrowLeft
} from "lucide-react";
import {
  SUPPORT_TICKET_LIST, SUPPORT_TICKET_MESSAGES, SUPPORT_TICKET_REPLY
} from "../../Utils/Constants";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";

const AdminSupportPanel = () => {
  const { authUser, token } = useSelector((state) => state.user);

  // Ticket list state
  const [tickets, setTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [listLoading, setListLoading] = useState(true);

  // Selected ticket and chat state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [sending, setSending] = useState(false);

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

  // Load ticket list based on search
  const fetchTickets = useCallback(async () => {
    setListLoading(true);
    try {
      const payload = {
        search: searchQuery,
      };

      const res = await fetch(SUPPORT_TICKET_LIST, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
      }
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setListLoading(false);
    }
  }, [searchQuery, getHeaders]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Load message logs for clicked ticket
  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setMessagesLoading(true);
    setIsUserOnline(false);
    setIsUserTyping(false);

    try {
      const res = await fetch(`${SUPPORT_TICKET_MESSAGES}/${ticket.id}`, {
        method: "GET",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
        // Clear unread badge in list immediately
        setTickets((prev) =>
          prev.map((t) => (t.id === ticket.id ? { ...t, unread_count: 0 } : t))
        );
      }
    } catch (err) {
      console.error("Error loading ticket messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Socket Connection management
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace("/api", "")
      : "http://localhost:5000";

    const socket = io(socketUrl);
    socketRef.current = socket;

    // Handle new tickets raised by users in real time
    socket.on("new_ticket", (data) => {
      fetchTickets();
      if (Notification.permission === "granted") {
        new Notification(`New Ticket from ${data.name}`, { body: data.subject });
      }
    });

    socket.on("ticket_updated", () => {
      fetchTickets();
    });

    socket.on("ticket_list_changed", () => {
      fetchTickets();
    });

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      socket.disconnect();
    };
  }, [fetchTickets]);

  // Selected Ticket specific socket handlers
  useEffect(() => {
    if (!selectedTicket || !socketRef.current) return;

    const socket = socketRef.current;

    // Join ticket room
    socket.emit("join_ticket", {
      ticketId: selectedTicket.id,
      userId: authUser.id,
      role: "admin",
    });

    socket.on("receive_message", (message) => {
      if (Number(message.ticket_id) === Number(selectedTicket.id)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        socket.emit("read_receipt", { ticketId: selectedTicket.id, role: "admin" });
        fetch(`${SUPPORT_TICKET_MESSAGES}/${selectedTicket.id}`, {
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

    socket.emit("read_receipt", { ticketId: selectedTicket.id, role: "admin" });

    return () => {
      socket.off("receive_message");
      socket.off("typing_status");
      socket.off("user_status");
      socket.off("messages_read");
    };
  }, [selectedTicket, authUser.id, getHeaders]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isUserTyping]);

  // Typing event emits
  const handleReplyChange = (e) => {
    setReplyText(e.target.value);

    if (socketRef.current && selectedTicket) {
      socketRef.current.emit("typing", {
        ticketId: selectedTicket.id,
        name: authUser.name || "Admin",
        isTyping: true,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit("typing", {
          ticketId: selectedTicket.id,
          name: authUser.name || "Admin",
          isTyping: false,
        });
      }, 2000);
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

    setSending(true);
    try {
      const payload = new FormData();
      payload.append("ticket_id", selectedTicket.id);
      payload.append("sender_type", "admin");
      payload.append("sender_id", authUser.credential_id || authUser.id || "");
      payload.append("message", replyText.trim());
      if (attachment) {
        payload.append("attachment", attachment);
      }

      const res = await fetch(SUPPORT_TICKET_REPLY, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: payload,
      });

      const data = await res.json();
      if (data.success) {
        setReplyText("");
        setAttachment(null);
        setAttachmentPreview(null);
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.data.id)) return prev;
          return [...prev, data.data];
        });

        if (socketRef.current) {
          socketRef.current.emit("typing", {
            ticketId: selectedTicket.id,
            name: authUser.name || "Admin",
            isTyping: false,
          });
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar title="Support Ticket Center" />
        <main className="flex-1 overflow-y-auto p-6 flex flex-col relative min-h-0 bg-[#F8FAFC]">
          
          {/* Header Row with Back Button */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition duration-200 shadow-sm"
            >
              <ArrowLeft size={14} />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          {/* Main WhatsApp/Intercom Chat Panel Widget in Light Theme */}
          <div className="flex-1 bg-white text-slate-800 flex flex-col md:flex-row rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm relative min-h-0">
            
            {/* Left panel: chats & filters */}
            <div className="w-full md:w-[350px] border-r border-slate-200 flex flex-col h-full bg-slate-50/50 relative z-10 shrink-0">
              {/* Search */}
              <div className="p-4 border-b border-slate-200 space-y-3 bg-white shrink-0">
                <h2 className="text-sm font-black tracking-wider uppercase text-slate-800">
                  Support Desk
                </h2>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, email, issue ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-orange-500/40 focus:bg-white focus:outline-none transition"
                  />
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                </div>
              </div>

              {/* Tickets List */}
              <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/20" ref={listRef}>
                {listLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-2">
                    <Loader2 className="animate-spin text-orange-500" size={20} />
                    <span className="text-[11px] text-slate-400 font-medium">Syncing tickets...</span>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-2 text-slate-400">
                    <MessageSquare size={24} />
                    <span className="text-[11px] font-semibold">No active conversations</span>
                  </div>
                ) : (
                  tickets.map((t) => {
                    const isActive = selectedTicket?.id === t.id;
                    const hasUnread = t.unread_count > 0;
                    const lastMsgTime = t.last_message_time
                      ? new Date(t.last_message_time).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })
                      : "";

                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTicket(t)}
                        className={`p-3 border-b border-slate-100 hover:bg-slate-100/50 transition cursor-pointer flex items-center justify-between ${
                          isActive ? "bg-orange-500/5 border-l-2 border-l-orange-500" : ""
                        }`}
                      >
                        <div className="space-y-1 truncate flex-1 pr-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-800 truncate">{t.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold">#{t.id}</span>
                            {t.status === "Open" && (
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium truncate">
                            {t.subject}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate italic">
                            {t.last_message || "No messages yet"}
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 space-y-1">
                          <span className="text-[9px] text-slate-400 font-medium">{lastMsgTime}</span>
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`text-[8px] font-black uppercase px-1 rounded ${
                                t.priority === "High"
                                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                  : t.priority === "Medium"
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                              }`}
                            >
                              {t.priority}
                            </span>
                            {hasUnread && (
                              <span className="bg-orange-500 text-white font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center">
                                {t.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel: Chat Log */}
            {selectedTicket ? (
              <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
                {/* Header info */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xs font-bold text-slate-800">{selectedTicket.name}</h3>
                      <span className="text-[10px] text-slate-500">({selectedTicket.email} • {selectedTicket.phone})</span>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isUserOnline ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      <span className="text-[9px] text-slate-400 font-bold">
                        {isUserOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-1 flex items-center space-x-2">
                      <span className="flex items-center"><Building size={11} className="mr-1 text-slate-400" />{selectedTicket.institution_name}</span>
                      <span>•</span>
                      <span>Category: {selectedTicket.category}</span>
                      <span>•</span>
                      <span>Topic: {selectedTicket.subject}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        selectedTicket.status === "Open"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : selectedTicket.status === "Closed"
                          ? "bg-slate-100 text-slate-500 border-slate-200"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}
                    >
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-h-0 bg-slate-50/30">
                  {messagesLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-2">
                      <Loader2 className="animate-spin text-orange-500" size={24} />
                      <span className="text-xs text-slate-400">Loading conversation...</span>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_type === "admin";
                      const messageTime = new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl p-3 text-xs leading-relaxed relative ${
                              isMe
                                ? "bg-slate-100 text-slate-800 rounded-tr-none border border-slate-200/80"
                                : "bg-orange-500 text-white font-medium rounded-tl-none"
                            }`}
                          >
                            <div
                              className={`text-[8px] font-black uppercase tracking-wider mb-1 ${
                                isMe ? "text-orange-500" : "text-white/70"
                              }`}
                            >
                              {isMe ? "Agent Reply" : "Tenant / Guest"}
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
                                        ? "bg-slate-200/60 text-slate-700 hover:bg-slate-200"
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
                              className={`flex items-center justify-end space-x-1 mt-1 text-[8px] ${
                                isMe ? "text-slate-400" : "text-white/60"
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
                        className="flex items-center space-x-2 bg-white border border-slate-200/80 px-3 py-2 rounded-2xl w-fit text-[11px] text-slate-500 font-bold shadow-sm"
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
                <div className="p-4 border-t border-slate-200 bg-white shrink-0">
                  <form onSubmit={handleSendReply} className="space-y-3">
                    {attachment && (
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-2xl max-w-sm animate-fade-in">
                        <div className="flex items-center space-x-2">
                          {attachmentPreview === "pdf" ? (
                            <div className="bg-red-500/10 text-red-500 text-[10px] px-2 py-1 rounded-md font-bold uppercase">
                              PDF
                            </div>
                          ) : attachmentPreview ? (
                            <img
                              src={attachmentPreview}
                              alt="Attachment Preview"
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                            />
                          ) : null}
                          <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {attachment.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachment(null);
                            setAttachmentPreview(null);
                          }}
                          className="text-slate-400 hover:text-slate-600 text-xs px-2 cursor-pointer font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <div className="flex items-center space-x-3">
                      <label className="p-3 bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-500 hover:text-slate-800 rounded-2xl cursor-pointer transition shrink-0">
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
                        placeholder="Type your reply to tenant..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-orange-500/40 focus:bg-white focus:outline-none transition"
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
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-50/10 relative z-10">
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl mb-4 shadow-sm">
                  <MessageSquare size={36} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">Select a Conversation</h3>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs text-center font-medium">
                  Click on a support ticket in the left sidebar to view message history and reply in real-time.
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
