const express = require("express");
const { protectAuth } = require("../Auth/AuthMiddleware");
const { handleSupportUpload } = require("./SupportUploadMiddleware");
const {
    listPublicInstitutions,
    createPublicTicket,
    getPublicTicket,
    listTickets,
    getTicketMessages,
    replyTicket,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    saveInternalNote,
    listPGAdmins,
    getPublicChatUser,
    registerPublicChatUser,
    getPublicChatUserMessages,
    replyPublicChatUser,
    listAdminChatUsers,
    getAdminChatUserMessages,
    replyAdminChatUser,
    getAdminUnreadCount,
    markAdminChatUserUnread,
    deleteAdminChatUser,
    markAdminChatUserRead
} = require("./SupportController");

const router = express.Router();
const protectAdmin = protectAuth(["super_admin", "pg_admin"]);

// Public endpoints
router.get("/public/institutions", listPublicInstitutions);
router.post("/create", handleSupportUpload, createPublicTicket);
router.get("/public/view/:ticketId", getPublicTicket);
router.post("/public/reply", handleSupportUpload, replyTicket);

// Public continuous support chat endpoints
router.get("/public/chat-user", getPublicChatUser);
router.post("/public/chat-user/register", handleSupportUpload, registerPublicChatUser);
router.get("/public/chat-user/:userId/messages", getPublicChatUserMessages);
router.post("/public/chat-user/reply", handleSupportUpload, replyPublicChatUser);

// Admin authenticated endpoints
router.post("/list", protectAdmin, listTickets);
router.get("/messages/:ticketId", protectAdmin, getTicketMessages);
router.post("/reply", protectAdmin, handleSupportUpload, replyTicket);
router.put("/status/:ticketId", protectAdmin, updateTicketStatus);
router.put("/priority/:ticketId", protectAdmin, updateTicketPriority);
router.put("/assign/:ticketId", protectAdmin, assignTicket);
router.put("/internal-note/:ticketId", protectAdmin, saveInternalNote);
router.get("/admins", protectAdmin, listPGAdmins);

// Admin continuous support chat endpoints
router.post("/admin/chat-users", protectAdmin, listAdminChatUsers);
router.get("/admin/chat-user/:userId/messages", protectAdmin, getAdminChatUserMessages);
router.post("/admin/chat-user/reply", protectAdmin, handleSupportUpload, replyAdminChatUser);
router.get("/admin/unread-count", protectAdmin, getAdminUnreadCount);
router.put("/admin/chat-user/:userId/mark-unread", protectAdmin, markAdminChatUserUnread);
router.put("/admin/chat-user/:userId/mark-read", protectAdmin, markAdminChatUserRead);
router.delete("/admin/chat-user/:userId", protectAdmin, deleteAdminChatUser);

module.exports = router;
