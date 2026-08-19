const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../Config/Database");

const {
    createSuperAdmin,
    findSuperAdminByEmail,
    findSuperAdminById,
    getRegisteredSuperAdminList,
    deleteSuperAdminById,
} = require("./SuperAdminModel");
const {
    createUserCredential,
    findUserCredentialByEmail,
    deleteUserCredentialBySuperAdminId,
    reuseOrphanedCredential,
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

        let isOrphaned = false;
        if (existingCredential) {
            if (existingCredential.role === "super_admin") {
                if (existingCredential.super_admin_id) {
                    const checkSa = await pool.query("SELECT id FROM super_admins WHERE id = $1", [existingCredential.super_admin_id]);
                    if (checkSa.rows.length === 0) {
                        isOrphaned = true;
                    }
                } else {
                    isOrphaned = true;
                }
            } else if (existingCredential.role === "pg_admin") {
                if (existingCredential.pg_admin_id) {
                    const checkPg = await pool.query("SELECT id FROM pg_admin WHERE id = $1", [existingCredential.pg_admin_id]);
                    if (checkPg.rows.length === 0) {
                        isOrphaned = true;
                    }
                } else {
                    isOrphaned = true;
                }
            }
        }

        if (existingCredential && !isOrphaned) {
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

        if (isOrphaned) {
            await reuseOrphanedCredential(
                normalizedEmail,
                hashedPassword,
                "super_admin",
                institution_id,
                superAdmin.id,
                null
            );
        } else {
            await createUserCredential({
                email: normalizedEmail,
                password: hashedPassword,
                role: "super_admin",
                institution_id,
                super_admin_id: superAdmin.id,
            });
        }

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
        console.error("Registration failed error:", error);
        return res.status(500).json({
            success: false,
            message: "Registration failed",
            error: error.message,
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
        console.error("Login failed error:", error);
        return res.status(500).json({
            success: false,
            message: "Login failed",
            error: error.message,
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
        console.error("Profile fetch failed error:", error);
        return res.status(500).json({
            success: false,
            message: "Profile failed",
            error: error.message,
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
        console.error("Super admin list fetch failed error:", error);
        return res.status(500).json({
            success: false,
            message: "Super admin list failed",
            error: error.message,
        });
    }
};

const deleteSuperAdmin = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Super admin id is required",
            });
        }

        const existingSuperAdmin = await findSuperAdminById(id);

        if (!existingSuperAdmin) {
            return res.status(404).json({
                success: false,
                message: "Super admin not found",
            });
        }

        // Prevent self-deletion
        if (Number(existingSuperAdmin.id) === Number(req.user.id)) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account",
            });
        }

        const superAdmin = await deleteSuperAdminById(id);

        await deleteUserCredentialBySuperAdminId(id);

        return res.status(200).json({
            success: true,
            message: "Super admin deleted successfully",
            superAdmin,
        });
    } catch (error) {
        console.error("Super admin delete failed error:", error);
        return res.status(500).json({
            success: false,
            message: "Super admin delete failed",
            error: error.message,
        });
    }
};

module.exports = {
    registerSuperAdmin,
    loginSuperAdmin,
    getSuperAdminProfile,
    getSuperAdminList,
    deleteSuperAdmin,
};
