const express = require("express");
const { protectAuth } = require("../../Auth/AuthMiddleware");

const {
    addDailyExpense,
    deleteDailyExpense,
    editDailyExpense,
    listDailyExpenses,
    viewDailyExpense,
} = require("./DailyexpensesController");
const { handleDailyExpenseUpload } = require("./DailyExpenseUploadMiddleware");

const router = express.Router();

const protectAdminAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/create", protectAdminAccess, handleDailyExpenseUpload, addDailyExpense);
router.post("/list", protectAdminAccess, listDailyExpenses);
router.post("/view", protectAdminAccess, viewDailyExpense);
router.post("/edit", protectAdminAccess, handleDailyExpenseUpload, editDailyExpense);
router.post("/delete", protectAdminAccess, deleteDailyExpense);

module.exports = router;
