const { protectAuth } = require("../Auth/AuthMiddleware");

const protectPgAdmin = protectAuth(["pg_admin"]);

module.exports = {
    protectPgAdmin,
};
