const express = require("express");
const { protectAuth } = require("../Auth/AuthMiddleware");
const {
    addInstitution,
    deleteInstitution,
    editInstitution,
    listInstitution,
    viewInstitution,
} = require("./InstitutionController");

const router = express.Router();
const protectAdminAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/create", protectAdminAccess, addInstitution);
router.post("/list", protectAdminAccess, listInstitution);
router.post("/view", protectAdminAccess, viewInstitution);
router.post("/edit", protectAdminAccess, editInstitution);
router.post("/delete", protectAdminAccess, deleteInstitution);

module.exports = router;
