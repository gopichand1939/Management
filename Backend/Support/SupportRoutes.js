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
    listPGAdmins
} = require("./SupportController");

const router = express.Router();
const protectAdmin = protectAuth(["super_admin", "pg_admin"]);

// Public endpoints
router.get("/public/institutions", listPublicInstitutions);
router.post("/create", handleSupportUpload, createPublicTicket);
router.get("/public/view/:ticketId", getPublicTicket);
router.post("/public/reply", handleSupportUpload, replyTicket);

// Admin authenticated endpoints
router.post("/list", protectAdmin, listTickets);
router.get("/messages/:ticketId", protectAdmin, getTicketMessages);
router.post("/reply", protectAdmin, handleSupportUpload, replyTicket);
router.put("/status/:ticketId", protectAdmin, updateTicketStatus);
router.put("/priority/:ticketId", protectAdmin, updateTicketPriority);
router.put("/assign/:ticketId", protectAdmin, assignTicket);
router.put("/internal-note/:ticketId", protectAdmin, saveInternalNote);
router.get("/admins", protectAdmin, listPGAdmins);

module.exports = router;
