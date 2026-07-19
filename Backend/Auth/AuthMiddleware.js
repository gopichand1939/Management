const jwt = require("jsonwebtoken");

const protectAuth = (allowedRoles = []) => {
    return async (req, res, next) => {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Token not found",
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token not found",
            });
        }

        try {
            const user = jwt.verify(token, process.env.JWT_SECRET);

            if (
                allowedRoles.length > 0 &&
                !allowedRoles.includes(user.role)
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied",
                });
            }

            // Remote session termination check
            if (user.activity_log_id) {
                const pool = require("../Config/Database");
                const sessionRes = await pool.query(
                    "SELECT logout_time FROM user_activity_logs WHERE id = $1",
                    [user.activity_log_id]
                );
                if (sessionRes.rows.length > 0 && sessionRes.rows[0].logout_time !== null) {
                    return res.status(401).json({
                        success: false,
                        message: "Session terminated from admin panel"
                    });
                }
            }

            req.user = user;
            req.pgAdmin = user;

            return next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid token",
            });
        }
    };
};

module.exports = {
    protectAuth,
};
