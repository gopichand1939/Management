const express = require("express");
const { protectAuth } = require("../../Auth/AuthMiddleware");
const { handleRationItemUpload } = require("./RationItemUploadMiddleware");
const {
    createRationItem,
    getRationItemList,
    getRationItemById,
    updateRationItem,
    deleteRationItem,
    getNextRationBarcode,
    getRationItemByBarcode,
} = require("./RationItemController");

const router = express.Router();
const protectRationAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/create", protectRationAccess, handleRationItemUpload, createRationItem);
router.post("/list", protectRationAccess, getRationItemList);
router.post("/view", protectRationAccess, getRationItemById);
router.post("/edit", protectRationAccess, handleRationItemUpload, updateRationItem);
router.post("/delete", protectRationAccess, deleteRationItem);
router.post("/next-barcode", protectRationAccess, getNextRationBarcode);
router.post("/scan", protectRationAccess, getRationItemByBarcode);

module.exports = router;
