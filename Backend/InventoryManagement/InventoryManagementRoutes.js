const express = require("express");
const { protectAuth } = require("../Auth/AuthMiddleware");
const {
    addInventory,
    deleteInventory,
    editInventory,
    getInventoryFloors,
    getInventoryInstitutions,
    getInventoryRooms,
    listInventory,
    viewInventory,
} = require("./InventoryManagementController");
const { handleInventoryUpload } = require("./InventoryUploadMiddleware");

const router = express.Router();
const protectAdminAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/create", protectAdminAccess, handleInventoryUpload, addInventory);
router.post("/list", protectAdminAccess, listInventory);
router.post("/view", protectAdminAccess, viewInventory);
router.post("/update", protectAdminAccess, handleInventoryUpload, editInventory);
router.post("/delete", protectAdminAccess, deleteInventory);
router.post("/institution/list", protectAdminAccess, getInventoryInstitutions);
router.post("/floor/list", protectAdminAccess, getInventoryFloors);
router.post("/room/list", protectAdminAccess, getInventoryRooms);

module.exports = router;
