const express = require("express");
const router = express.Router();

const { protectAuth } = require("../Auth/AuthMiddleware");
const { listUserActivity, logoutUserActivity, terminateSession } = require("./UserActivityController");

/**
 * Route config for User Activity list.
 * Only accessible to authenticated admins (super_admin, pg_admin).
 * Handled via POST as requested.
 */
router.post(
    "/list",
    protectAuth(["super_admin", "pg_admin"]),
    listUserActivity
);

/**
 * Route config for logging out.
 * Triggers database timestamp updates.
 */
router.post(
    "/logout",
    protectAuth(["super_admin", "pg_admin"]),
    logoutUserActivity
);

/**
 * Route config for terminating user active session.
 */
router.post(
    "/terminate",
    protectAuth(["super_admin", "pg_admin"]),
    terminateSession
);

module.exports = router;
