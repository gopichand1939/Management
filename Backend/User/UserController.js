const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    createUser,
    findUserByEmail,
    findUserById,
    getRegisteredUserList,
} = require("./UserModel");

const createToken = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });

    return token;
};

const registerUser = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const oldUser = await findUserByEmail(email);

        if (oldUser) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await createUser(name, email, phone, hashedPassword);

        const token = createToken(user);

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Registration failed",
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const token = createToken(user);

        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            created_at: user.created_at,
        };

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: userData,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Login failed",
        });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = await findUserById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            user,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Profile failed",
        });
    }
};

const getUserList = async (req, res) => {
    try {
        const users = await getRegisteredUserList();

        return res.status(200).json({
            success: true,
            message: "User list fetched successfully",
            users,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "User list failed",
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    getUserList,
};
