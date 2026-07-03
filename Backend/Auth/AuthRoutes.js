const express = require("express");

const router = express.Router();
const lazyHandler = (loader, exportName) => {
    return async (req, res, next) => {
        try {
            const module = loader();
            return await module[exportName](req, res, next);
        } catch (error) {
            return next(error);
        }
    };
};

router.post("/login", lazyHandler(() => require("./AuthController"), "login"));

module.exports = router;
