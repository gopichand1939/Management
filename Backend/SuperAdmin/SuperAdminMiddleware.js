const { protectAuth } = require("../Auth/AuthMiddleware");

const protectSuperAdmin = protectAuth(["super_admin"]);

module.exports = {
    protectSuperAdmin,
};
