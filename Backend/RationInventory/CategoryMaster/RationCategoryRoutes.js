const express = require("express");
const { protectAuth } = require("../../Auth/AuthMiddleware");
const {
    createRationCategory,
    getRationCategoryList,
    getRationCategoryById,
    updateRationCategory,
    deleteRationCategory,
    getCategoryDropdownList,
} = require("./RationCategoryController");

const router = express.Router();
const protectRationAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/create", protectRationAccess, createRationCategory);
router.post("/list", protectRationAccess, getRationCategoryList);
router.post("/view", protectRationAccess, getRationCategoryById);
router.post("/edit", protectRationAccess, updateRationCategory);
router.post("/delete", protectRationAccess, deleteRationCategory);
router.post("/dropdown", protectRationAccess, getCategoryDropdownList);

module.exports = router;