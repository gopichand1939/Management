const express = require("express");
const { protectAuth } = require("../../Auth/AuthMiddleware");
const {
    createRationUnit,
    getRationUnitList,
    getRationUnitById,
    updateRationUnit,
    deleteRationUnit,
    getUnitDropdownList,
} = require("./RationUnitController");

const router = express.Router();
const protectRationAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/create", protectRationAccess, createRationUnit);
router.post("/list", protectRationAccess, getRationUnitList);
router.post("/view", protectRationAccess, getRationUnitById);
router.post("/edit", protectRationAccess, updateRationUnit);
router.post("/delete", protectRationAccess, deleteRationUnit);
router.post("/dropdown", protectRationAccess, getUnitDropdownList);

module.exports = router;
