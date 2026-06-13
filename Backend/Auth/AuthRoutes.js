const express = require("express");

const { login } = require("./AuthController");

const router = express.Router();

router.post("/login", login);

module.exports = router;
