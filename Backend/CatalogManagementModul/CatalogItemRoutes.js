const express = require("express");
const multer = require("multer");
const { protectAuth } = require("../Auth/AuthMiddleware");
const {
    createItem,
    getItemList,
    getItemById,
    updateItem,
    deleteItem,
    generateSku,
    exportItems,
    importItems,
    downloadTemplate,
} = require("./CatalogItemController");

const router = express.Router();
const protectCatalogAccess = protectAuth(["super_admin", "pg_admin"]);
const upload = multer({ storage: multer.memoryStorage() });

router.post("/create", protectCatalogAccess, createItem);
router.post("/list", protectCatalogAccess, getItemList);
router.post("/view", protectCatalogAccess, getItemById);
router.post("/edit", protectCatalogAccess, updateItem);
router.post("/delete", protectCatalogAccess, deleteItem);
router.post("/generate-sku", protectCatalogAccess, generateSku);
router.post("/import", protectCatalogAccess, upload.single("file"), importItems);
router.post("/export", protectCatalogAccess, exportItems);
router.get("/template", protectCatalogAccess, downloadTemplate);

module.exports = router;
