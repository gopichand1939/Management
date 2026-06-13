const jwt = require("jsonwebtoken");

const protectUser = (req, res, next) => {
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

        req.user = user;

        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid token",
        });
    }
};

module.exports = {
    protectUser,
};
