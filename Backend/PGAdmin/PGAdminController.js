const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    createPgAdmin,
    deletePgAdminById,
    findPgAdminByEmail,
    findPgAdminById,
    getInstitutionById,
    getInstitutionDropdownList,
    getPgAdminByInstitution,
    getPgAdminList,
    updatePgAdmin,
} = require("./PGAdminModel");
const {
    createUserCredential,
    deleteUserCredentialByPgAdminId,
    findUserCredentialByEmail,
    updateUserCredentialByPgAdminId,
} = require("../Auth/AuthModel");

const isPgAdminRequest = (req) => {
    return req.user?.role === "pg_admin";
};

const createToken = (pgAdmin) => {
    const payload = {
        id: pgAdmin.id,
        email: pgAdmin.email,
        role: "pg_admin",
        institution_id: pgAdmin.institution_id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });

    return token;
};

const addPgAdmin = async (req, res) => {
    try {
        const {
            institution_id,
            pg_admin_name,
            email,
            phone,
            password,
        } = req.body;

        const normalizedInstitutionId = isPgAdminRequest(req)
            ? Number(req.pgAdmin.institution_id)
            : Number(institution_id);
        const normalizedName = pg_admin_name?.trim();
        const normalizedEmail = email?.trim().toLowerCase();
        const normalizedPhone = phone?.trim() || null;

        if (
            !normalizedInstitutionId ||
            !Number.isInteger(normalizedInstitutionId) ||
            !normalizedName ||
            !normalizedEmail ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Institution, admin name, email and password are required",
            });
        }

        const institution = await getInstitutionById(normalizedInstitutionId);

        if (!institution) {
            return res.status(400).json({
                success: false,
                message: "Selected institution does not exist",
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

        const oldPgAdmin = await findPgAdminByEmail(normalizedEmail);

        if (oldPgAdmin) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const data = {
            institution_id: normalizedInstitutionId,
            pg_admin_name: normalizedName,
            email: normalizedEmail,
            phone: normalizedPhone,
            password: hashedPassword,
            created_by: req.body.created_by || null,
        };

        const pgAdmin = await createPgAdmin(data);

        await createUserCredential({
            email: normalizedEmail,
            password: hashedPassword,
            role: "pg_admin",
            institution_id: normalizedInstitutionId,
            pg_admin_id: pgAdmin.id,
        });

        return res.status(201).json({
            success: true,
            message: "PG admin created successfully",
            pgAdmin,
        });
    } catch (error) {
        console.error("PG admin create failed:", error);

        if (error.code === "23505") {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }

        if (error.code === "23503") {
            return res.status(400).json({
                success: false,
                message: "Selected institution does not exist",
            });
        }

        return res.status(500).json({
            success: false,
            message: "PG admin create failed",
        });
    }
};

const loginPgAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const pgAdmin = await findPgAdminByEmail(email);

        if (!pgAdmin) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            pgAdmin.password || ""
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const token = createToken(pgAdmin);

        const user = {
            id: pgAdmin.id,
            institution_id: pgAdmin.institution_id,
            name: pgAdmin.pg_admin_name,
            email: pgAdmin.email,
            phone: pgAdmin.phone,
            role: "pg_admin",
            status: pgAdmin.status,
            created_at: pgAdmin.created_at,
        };

        return res.status(200).json({
            success: true,
            message: "PG admin login successful",
            token,
            user,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "PG admin login failed",
        });
    }
};

const getPgAdminProfile = async (req, res) => {
    try {
        const pgAdmin = await findPgAdminById(req.pgAdmin.id);

        if (!pgAdmin) {
            return res.status(404).json({
                success: false,
                message: "PG admin not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "PG admin profile fetched successfully",
            user: {
                id: pgAdmin.id,
                institution_id: pgAdmin.institution_id,
                institution_name: pgAdmin.institution_name,
                name: pgAdmin.pg_admin_name,
                email: pgAdmin.email,
                phone: pgAdmin.phone,
                role: "pg_admin",
                status: pgAdmin.status,
                created_at: pgAdmin.created_at,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "PG admin profile failed",
        });
    }
};

const getMyInstitution = async (req, res) => {
    try {
        const institution = await getInstitutionById(req.pgAdmin.institution_id);

        if (!institution) {
            return res.status(404).json({
                success: false,
                message: "Institution not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "PG admin institution fetched successfully",
            institutions: [institution],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "PG admin institution failed",
        });
    }
};

const listPgAdmin = async (req, res) => {
    try {
        const pgAdmins = isPgAdminRequest(req)
            ? await getPgAdminByInstitution(req.pgAdmin.institution_id)
            : await getPgAdminList();

        return res.status(200).json({
            success: true,
            message: "PG admin list fetched successfully",
            pgAdmins,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "PG admin list failed",
        });
    }
};

const listMyInstitutionPgAdmins = async (req, res) => {
    try {
        const pgAdmins = await getPgAdminByInstitution(req.pgAdmin.institution_id);

        return res.status(200).json({
            success: true,
            message: "Institution PG admin list fetched successfully",
            pgAdmins,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Institution PG admin list failed",
        });
    }
};



const getInstitutionList = async (req, res) => {
    try {
        const institutions = isPgAdminRequest(req)
            ? [await getInstitutionById(req.pgAdmin.institution_id)].filter(Boolean)
            : await getInstitutionDropdownList();

        return res.status(200).json({
            success: true,
            message: "Institution dropdown list fetched successfully",
            institutions,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Institution dropdown list failed",
        });
    }
};

const viewPgAdmin = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "PG admin id is required",
            });
        }

        const pgAdmin = await findPgAdminById(id);

        if (!pgAdmin) {
            return res.status(404).json({
                success: false,
                message: "PG admin not found",
            });
        }

        if (
            isPgAdminRequest(req) &&
            Number(pgAdmin.institution_id) !== Number(req.pgAdmin.institution_id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this PG admin",
            });
        }

        return res.status(200).json({
            success: true,
            message: "PG admin fetched successfully",
            pgAdmin,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "PG admin fetch failed",
        });
    }
};

const editPgAdmin = async (req, res) => {
    try {
        const {
            id,
            institution_id,
            pg_admin_name,
            email,
            phone,
            status,
        } = req.body;

        if (!id || !institution_id || !pg_admin_name || !email) {
            return res.status(400).json({
                success: false,
                message: "PG admin id, institution, name and email are required",
            });
        }

        const existingPgAdmin = await findPgAdminById(id);

        if (!existingPgAdmin) {
            return res.status(404).json({
                success: false,
                message: "PG admin not found",
            });
        }

        if (
            isPgAdminRequest(req) &&
            Number(existingPgAdmin.institution_id) !== Number(req.pgAdmin.institution_id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this PG admin",
            });
        }

        const normalizedInstitutionId = isPgAdminRequest(req)
            ? Number(req.pgAdmin.institution_id)
            : Number(institution_id);
        const normalizedEmail = email?.trim().toLowerCase();
        const credential = await findUserCredentialByEmail(normalizedEmail);

        if (credential && Number(credential.pg_admin_id) !== Number(id)) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }

        const pgAdmin = await updatePgAdmin({
            id,
            institution_id: normalizedInstitutionId,
            pg_admin_name,
            email: normalizedEmail,
            phone,
            status,
        });

        await updateUserCredentialByPgAdminId({
            pg_admin_id: id,
            email: normalizedEmail,
            institution_id: normalizedInstitutionId,
        });

        return res.status(200).json({
            success: true,
            message: "PG admin updated successfully",
            pgAdmin,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "PG admin update failed",
        });
    }
};

const deletePgAdmin = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "PG admin id is required",
            });
        }

        const existingPgAdmin = await findPgAdminById(id);

        if (!existingPgAdmin) {
            return res.status(404).json({
                success: false,
                message: "PG admin not found",
            });
        }

        if (
            isPgAdminRequest(req) &&
            Number(existingPgAdmin.institution_id) !== Number(req.pgAdmin.institution_id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this PG admin",
            });
        }

        if (
            isPgAdminRequest(req) &&
            Number(existingPgAdmin.id) === Number(req.pgAdmin.id)
        ) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account",
            });
        }

        const pgAdmin = await deletePgAdminById(id);

        await deleteUserCredentialByPgAdminId(id);

        return res.status(200).json({
            success: true,
            message: "PG admin deleted successfully",
            pgAdmin,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "PG admin delete failed",
        });
    }
};

module.exports = {
    addPgAdmin,
    deletePgAdmin,
    editPgAdmin,
    getMyInstitution,
    listMyInstitutionPgAdmins,
    getPgAdminProfile,
    listPgAdmin,
    loginPgAdmin,
    viewPgAdmin,
    getInstitutionList,
};
