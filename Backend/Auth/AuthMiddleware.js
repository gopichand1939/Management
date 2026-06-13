const jwt = require("jsonwebtoken");

const protectAuth = (allowedRoles = []) => {
    return (req, res, next) => {
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
