const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    createSuperAdmin,
    findSuperAdminByEmail,
    findSuperAdminById,
    getRegisteredSuperAdminList,
} = require("./SuperAdminModel");
const {
    createUserCredential,
    findUserCredentialByEmail,
} = require("../Auth/AuthModel");

const createToken = (superAdmin) => {
    const payload = {
        id: superAdmin.id,
        email: superAdmin.email,
        role: "super_admin",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });

    return token;
};

const registerSuperAdmin = async (req, res) => {
    try {
        const {
            institution_id,
            pg_admin_id,
            name,
            email,
            phone,
            password,
        } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();

        if (!name || !normalizedEmail || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const existingCredential = await findUserCredentialByEmail(
            normalizedEmail
        );

        if (existingCredential) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }

        const oldSuperAdmin = await findSuperAdminByEmail(normalizedEmail);

        if (oldSuperAdmin) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const superAdmin = await createSuperAdmin(
            name,
            normalizedEmail,
            phone,
            hashedPassword,
            institution_id,
            pg_admin_id
        );

        await createUserCredential({
            email: normalizedEmail,
            password: hashedPassword,
            role: "super_admin",
            institution_id,
            super_admin_id: superAdmin.id,
        });

        const token = createToken(superAdmin);

        return res.status(201).json({
            success: true,
            message: "Super admin registered successfully",
            token,
            user: {
                ...superAdmin,
                role: "super_admin",
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Registration failed",
        });
    }
};

const loginSuperAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const superAdmin = await findSuperAdminByEmail(email);

        if (!superAdmin) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            superAdmin.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const token = createToken(superAdmin);

        const userData = {
            id: superAdmin.id,
            institution_id: superAdmin.institution_id,
            pg_admin_id: superAdmin.pg_admin_id,
            name: superAdmin.name,
            email: superAdmin.email,
            phone: superAdmin.phone,
            role: "super_admin",
            created_at: superAdmin.created_at,
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

const getSuperAdminProfile = async (req, res) => {
    try {
        const superAdmin = await findSuperAdminById(req.user.id);

        if (!superAdmin) {
            return res.status(404).json({
                success: false,
            message: "Super admin not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            user: {
                ...superAdmin,
                role: "super_admin",
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Profile failed",
        });
    }
};

const getSuperAdminList = async (req, res) => {
    try {
        const users = await getRegisteredSuperAdminList();

        return res.status(200).json({
            success: true,
            message: "Super admin list fetched successfully",
            users,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Super admin list failed",
        });
    }
};

module.exports = {
    registerSuperAdmin,
    loginSuperAdmin,
    getSuperAdminProfile,
    getSuperAdminList,
};
