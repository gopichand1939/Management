const express = require("express");
const { protectAuth } = require("../Auth/AuthMiddleware");
const {
    addPgAdmin,
    deletePgAdmin,
    editPgAdmin,
    getMyInstitution,
    getPgAdminProfile,
    listMyInstitutionPgAdmins,
    listPgAdmin,
    loginPgAdmin,
    viewPgAdmin,
    getInstitutionList,
} = require("./PGAdminController");
const {
    protectPgAdmin,
} = require("./PGAdminMiddleware");

const router = express.Router();
const protectAdminAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/create", protectAdminAccess, addPgAdmin);
router.post("/login", loginPgAdmin);
router.post("/profile", protectPgAdmin, getPgAdminProfile);
router.post("/my-list", protectPgAdmin, listMyInstitutionPgAdmins);
router.post("/list", protectAdminAccess, listPgAdmin);
router.post("/view", protectAdminAccess, viewPgAdmin);
router.post("/edit", protectAdminAccess, editPgAdmin);
router.post("/delete", protectAdminAccess, deletePgAdmin);
router.post("/institution/dropdown/getInstitutionList",protectAdminAccess,getInstitutionList
);
router.post("/my-institution", protectPgAdmin, getMyInstitution);

module.exports = router;
