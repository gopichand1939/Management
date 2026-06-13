const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { findUserCredentialByEmail } = require("./AuthModel");
const { findSuperAdminById } = require("../SuperAdmin/SuperAdminModel");
const { findPgAdminById } = require("../PGAdmin/PGAdminModel");
const { getMenusByRole } = require("../Menu/MenuModel");

const createToken = (credential) => {
    const payload = {
        id: credential.role === "pg_admin"
            ? credential.pg_admin_id
            : credential.super_admin_id,
        email: credential.email,
        role: credential.role,
        institution_id: credential.institution_id,
        credential_id: credential.id,
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });
};

const login = async (req, res) => {
    try {
        const normalizedEmail = req.body.email?.trim().toLowerCase();
        const { password } = req.body;

        if (!normalizedEmail || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const credential = await findUserCredentialByEmail(normalizedEmail);

        if (!credential) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            credential.password || ""
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        let user;
        const menus = await getMenusByRole(credential.role);

        if (credential.role === "pg_admin") {
            const pgAdmin = await findPgAdminById(credential.pg_admin_id);

            if (!pgAdmin) {
                return res.status(404).json({
                    success: false,
                    message: "PG admin not found",
                });
            }

            user = {
                id: pgAdmin.id,
                institution_id: pgAdmin.institution_id,
                institution_name: pgAdmin.institution_name,
                name: pgAdmin.pg_admin_name,
                email: pgAdmin.email,
                phone: pgAdmin.phone,
                role: "pg_admin",
                status: pgAdmin.status,
                created_at: pgAdmin.created_at,
                menus,
            };
        } else {
            const superAdmin = await findSuperAdminById(
                credential.super_admin_id
            );

            if (!superAdmin) {
                return res.status(404).json({
                    success: false,
                    message: "Super admin not found",
                });
            }

            user = {
                id: superAdmin.id,
                institution_id: superAdmin.institution_id,
                pg_admin_id: superAdmin.pg_admin_id,
                name: superAdmin.name,
                email: superAdmin.email,
                phone: superAdmin.phone,
                role: "super_admin",
                created_at: superAdmin.created_at,
                menus,
            };
        }

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token: createToken(credential),
            user,
        });
    } catch (error) {
        console.error("Shared login failed:", error);

        return res.status(500).json({
            success: false,
            message: "Login failed",
        });
    }
};

module.exports = {
    login,
};
