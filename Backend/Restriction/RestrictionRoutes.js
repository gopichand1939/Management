const express = require("express");
const router = express.Router();
const ctrl = require("./RestrictionController");

router.get(
    "/pg-admins",
    ctrl.getAdmins
);

router.get(
    "/rules/:userId",
    ctrl.getRules
);

router.post(
    "/rules/:userId",
    ctrl.saveRules
);

module.exports = router;
