const pool = require("../../Config/Database");

const RationSupplierModel = {
    createRationSupplier: async (
        institutionId,
        pgAdminId,
        supplierName,
        supplierCode,
        contactPerson,
        phone,
        alternatePhone,
        email,
        gstNumber,
        panNumber,
        address,
        city,
        state,
        pincode,
        paymentTerms,
        description,
        status,
        createdBy
    ) => {
        try {
            const query = `
                INSERT INTO ration_suppliers (
                    institution_id,
                    pg_admin_id,
                    supplier_name,
                    supplier_code,
                    contact_person,
                    phone,
                    alternate_phone,
                    email,
                    gst_number,
                    pan_number,
                    address,
                    city,
                    state,
                    pincode,
                    payment_terms,
                    description,
                    status,
                    created_by
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18
                )
                RETURNING
                    id,
                    institution_id,
                    pg_admin_id,
                    supplier_name,
                    supplier_code,
                    contact_person,
                    phone,
                    alternate_phone,
                    email,
                    gst_number,
                    pan_number,
                    address,
                    city,
                    state,
                    pincode,
                    payment_terms,
                    description,
                    status,
                    created_by,
                    created_at,
                    updated_at
            `;

            const values = [
                institutionId,
                pgAdminId || null,
                supplierName,
                supplierCode,
                contactPerson || null,
                phone,
                alternatePhone || null,
                email || null,
                gstNumber || null,
                panNumber || null,
                address || null,
                city || null,
                state || null,
                pincode || null,
                paymentTerms || null,
                description || null,
                status || "active",
                createdBy || null,
            ];

            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    getRationSupplierList: async (
        institutionId,
        limit,
        offset,
        search = "",
        status = ""
    ) => {
        try {
            let query = `
                SELECT
                    id,
                    institution_id,
                    pg_admin_id,
                    supplier_name,
                    supplier_code,
                    contact_person,
                    phone,
                    alternate_phone,
                    email,
                    gst_number,
                    pan_number,
                    address,
                    city,
                    state,
                    pincode,
                    payment_terms,
                    description,
                    status,
                    created_by,
                    updated_by,
                    created_at,
                    updated_at
                FROM ration_suppliers
                WHERE institution_id = $1
            `;

            const values = [institutionId];
            let paramIndex = 2;

            if (search) {
                query += `
                    AND (
                        supplier_name ILIKE $${paramIndex} OR
                        supplier_code ILIKE $${paramIndex} OR
                        contact_person ILIKE $${paramIndex} OR
                        phone ILIKE $${paramIndex} OR
                        alternate_phone ILIKE $${paramIndex} OR
                        email ILIKE $${paramIndex} OR
                        gst_number ILIKE $${paramIndex} OR
                        pan_number ILIKE $${paramIndex} OR
                        city ILIKE $${paramIndex} OR
                        state ILIKE $${paramIndex} OR
                        pincode ILIKE $${paramIndex} OR
                        payment_terms ILIKE $${paramIndex} OR
                        description ILIKE $${paramIndex} OR
                        status ILIKE $${paramIndex}
                    )
                `;
                values.push(`%${search}%`);
                paramIndex++;
            }

            if (status) {
                query += ` AND status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            query += ` ORDER BY id DESC`;

            if (limit !== undefined && offset !== undefined) {
                query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
                values.push(limit, offset);
            }

            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },

    getRationSupplierCount: async (institutionId, search = "", status = "") => {
        try {
            let query = `
                SELECT COUNT(*)::integer as count
                FROM ration_suppliers
                WHERE institution_id = $1
            `;

            const values = [institutionId];
            let paramIndex = 2;

            if (search) {
                query += `
                    AND (
                        supplier_name ILIKE $${paramIndex} OR
                        supplier_code ILIKE $${paramIndex} OR
                        contact_person ILIKE $${paramIndex} OR
                        phone ILIKE $${paramIndex} OR
                        alternate_phone ILIKE $${paramIndex} OR
                        email ILIKE $${paramIndex} OR
                        gst_number ILIKE $${paramIndex} OR
                        pan_number ILIKE $${paramIndex} OR
                        city ILIKE $${paramIndex} OR
                        state ILIKE $${paramIndex} OR
                        pincode ILIKE $${paramIndex} OR
                        payment_terms ILIKE $${paramIndex} OR
                        description ILIKE $${paramIndex} OR
                        status ILIKE $${paramIndex}
                    )
                `;
                values.push(`%${search}%`);
                paramIndex++;
            }

            if (status) {
                query += ` AND status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            const result = await pool.query(query, values);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getRationSupplierById: async (id, institutionId) => {
        try {
            const query = `
                SELECT
                    id,
                    institution_id,
                    pg_admin_id,
                    supplier_name,
                    supplier_code,
                    contact_person,
                    phone,
                    alternate_phone,
                    email,
                    gst_number,
                    pan_number,
                    address,
                    city,
                    state,
                    pincode,
                    payment_terms,
                    description,
                    status,
                    created_by,
                    updated_by,
                    created_at,
                    updated_at
                FROM ration_suppliers
                WHERE id = $1
                AND institution_id = $2
            `;
            const result = await pool.query(query, [id, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findRationSupplierByName: async (supplierName, institutionId) => {
        try {
            const query = `
                SELECT id, institution_id, supplier_name
                FROM ration_suppliers
                WHERE LOWER(supplier_name) = LOWER($1)
                AND institution_id = $2
            `;
            const result = await pool.query(query, [supplierName, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findRationSupplierByCode: async (supplierCode, institutionId) => {
        try {
            const query = `
                SELECT id, institution_id, supplier_code
                FROM ration_suppliers
                WHERE LOWER(supplier_code) = LOWER($1)
                AND institution_id = $2
            `;
            const result = await pool.query(query, [supplierCode, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findRationSupplierByPhone: async (phone, institutionId) => {
        try {
            const query = `
                SELECT id, institution_id, phone
                FROM ration_suppliers
                WHERE phone = $1
                AND institution_id = $2
            `;
            const result = await pool.query(query, [phone, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findRationSupplierByEmail: async (email, institutionId) => {
        try {
            const query = `
                SELECT id, institution_id, email
                FROM ration_suppliers
                WHERE LOWER(email) = LOWER($1)
                AND institution_id = $2
            `;
            const result = await pool.query(query, [email, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findRationSupplierByGstNumber: async (gstNumber, institutionId) => {
        try {
            const query = `
                SELECT id, institution_id, gst_number
                FROM ration_suppliers
                WHERE LOWER(gst_number) = LOWER($1)
                AND institution_id = $2
            `;
            const result = await pool.query(query, [gstNumber, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    updateRationSupplier: async (
        id,
        institutionId,
        supplierName,
        supplierCode,
        contactPerson,
        phone,
        alternatePhone,
        email,
        gstNumber,
        panNumber,
        address,
        city,
        state,
        pincode,
        paymentTerms,
        description,
        status,
        updatedBy
    ) => {
        try {
            const query = `
                UPDATE ration_suppliers
                SET
                    supplier_name = $1,
                    supplier_code = $2,
                    contact_person = $3,
                    phone = $4,
                    alternate_phone = $5,
                    email = $6,
                    gst_number = $7,
                    pan_number = $8,
                    address = $9,
                    city = $10,
                    state = $11,
                    pincode = $12,
                    payment_terms = $13,
                    description = $14,
                    status = $15,
                    updated_by = $16,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $17
                AND institution_id = $18
                RETURNING
                    id,
                    institution_id,
                    pg_admin_id,
                    supplier_name,
                    supplier_code,
                    contact_person,
                    phone,
                    alternate_phone,
                    email,
                    gst_number,
                    pan_number,
                    address,
                    city,
                    state,
                    pincode,
                    payment_terms,
                    description,
                    status,
                    created_by,
                    updated_by,
                    created_at,
                    updated_at
            `;

            const values = [
                supplierName,
                supplierCode,
                contactPerson || null,
                phone,
                alternatePhone || null,
                email || null,
                gstNumber || null,
                panNumber || null,
                address || null,
                city || null,
                state || null,
                pincode || null,
                paymentTerms || null,
                description || null,
                status || "active",
                updatedBy || null,
                id,
                institutionId,
            ];

            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    deleteRationSupplier: async (id, institutionId) => {
        try {
            const query = `
                DELETE FROM ration_suppliers
                WHERE id = $1
                AND institution_id = $2
                RETURNING id, institution_id, supplier_name, supplier_code
            `;
            const result = await pool.query(query, [id, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    getRationSupplierDropdownList: async (institutionId) => {
        try {
            const query = `
                SELECT
                    id,
                    supplier_name,
                    supplier_code,
                    contact_person,
                    phone
                FROM ration_suppliers
                WHERE institution_id = $1
                AND status = 'active'
                ORDER BY supplier_name ASC
            `;
            const result = await pool.query(query, [institutionId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },
};

module.exports = RationSupplierModel;
