const express = require("express");
const {
  registerUser,
  loginUser,
  getUserProfile,
  getUserList,
} = require("./UserController");
const {
  protectUser,
} = require("./UserMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/profile", protectUser, getUserProfile);
router.post("/list", protectUser, getUserList);

module.exports = router;
