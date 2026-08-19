const express = require("express");
const { protectAuth } = require("../Auth/AuthMiddleware");
const {
    createCategory,
    getCategoryList,
    getCategoryById,
    updateCategory,
    deleteCategory,
    getCategoryDropdownList,
} = require("./CatalogCategoryController");

const router = express.Router();
const protectCatalogAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/create", protectCatalogAccess, createCategory);
router.post("/list", protectCatalogAccess, getCategoryList);
router.post("/view", protectCatalogAccess, getCategoryById);
router.post("/edit", protectCatalogAccess, updateCategory);
router.post("/delete", protectCatalogAccess, deleteCategory);
router.post("/dropdown", protectCatalogAccess, getCategoryDropdownList);

module.exports = router;
