const express = require("express");
const { protectAuth } = require("../Auth/AuthMiddleware");
const {
    addPaymentReminderAction,
    collectPaymentReminder,
    listPaymentReminders,
} = require("./PaymnetReminderControler");

const router = express.Router();
const protectAdminAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/list", protectAdminAccess, listPaymentReminders);
router.post("/action", protectAdminAccess, addPaymentReminderAction);
router.post("/collect", protectAdminAccess, collectPaymentReminder);

module.exports = router;
