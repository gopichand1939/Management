const express = require("express");
const {
  registerSuperAdmin,
  loginSuperAdmin,
  getSuperAdminProfile,
  getSuperAdminList,
} = require("./SuperAdminController");
const {
  protectSuperAdmin,
} = require("./SuperAdminMiddleware");

const router = express.Router();

router.post("/register", registerSuperAdmin);
router.post("/login", loginSuperAdmin);
router.post("/profile", protectSuperAdmin, getSuperAdminProfile);
router.post("/list", protectSuperAdmin, getSuperAdminList);

module.exports = router;
