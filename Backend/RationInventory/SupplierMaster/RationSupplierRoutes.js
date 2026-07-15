const express = require("express");
const { protectAuth } = require("../../Auth/AuthMiddleware");
const {
    createRationSupplier,
    getRationSupplierList,
    getRationSupplierById,
    updateRationSupplier,
    deleteRationSupplier,
    getRationSupplierDropdownList,
} = require("./RationSupplierController");

const router = express.Router();
const protectRationAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/create", protectRationAccess, createRationSupplier);
router.post("/list", protectRationAccess, getRationSupplierList);
router.post("/view", protectRationAccess, getRationSupplierById);
router.post("/edit", protectRationAccess, updateRationSupplier);
router.post("/delete", protectRationAccess, deleteRationSupplier);
router.post("/dropdown", protectRationAccess, getRationSupplierDropdownList);

module.exports = router;
