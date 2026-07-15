const pool = require("../../Config/Database");

const RationStockAuditModel = {
    getNextAuditNumber: async (institutionId, client = pool) => {
        try {
            const query = `
                INSERT INTO ration_stock_audit_sequences (
                    institution_id,
                    last_number,
                    updated_at
                )
                VALUES ($1, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (institution_id)
                DO UPDATE SET
                    last_number = ration_stock_audit_sequences.last_number + 1,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING last_number;
            `;
            const result = await client.query(query, [institutionId]);
            const lastNumber = result.rows[0].last_number;
            return `SAU${String(lastNumber).padStart(6, "0")}`;
        } catch (error) {
            throw error;
        }
    },

    createStockAudit: async (auditData, client = pool) => {
        try {
            const query = `
                INSERT INTO ration_stock_audits (
                    institution_id,
                    audit_number,
                    audit_date,
                    audit_name,
                    remarks,
                    status,
                    created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, audit_number;
            `;
            const values = [
                auditData.institution_id,
                auditData.audit_number,
                auditData.audit_date,
                auditData.audit_name,
                auditData.remarks || null,
                auditData.status || 'draft',
                auditData.created_by
            ];
            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    createStockAuditItem: async (itemData, client = pool) => {
        try {
            const query = `
                INSERT INTO ration_stock_audit_items (
                    audit_id,
                    institution_id,
                    item_id,
                    system_stock,
                    physical_stock,
                    difference_quantity,
                    adjustment_direction,
                    remarks
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id;
            `;
            const values = [
                itemData.audit_id,
                itemData.institution_id,
                itemData.item_id,
                itemData.system_stock,
                itemData.physical_stock,
                itemData.difference_quantity,
                itemData.adjustment_direction || null,
                itemData.remarks || null
            ];
            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    updateStockAudit: async (auditId, auditData, client = pool) => {
        try {
            const query = `
                UPDATE ration_stock_audits
                SET
                    audit_date = $1,
                    audit_name = $2,
                    remarks = $3,
                    status = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $5 AND institution_id = $6
                RETURNING *;
            `;
            const values = [
                auditData.audit_date,
                auditData.audit_name,
                auditData.remarks || null,
                auditData.status || 'draft',
                auditId,
                auditData.institution_id
            ];
            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    deleteStockAuditItems: async (auditId, client = pool) => {
        try {
            const query = `DELETE FROM ration_stock_audit_items WHERE audit_id = $1`;
            await client.query(query, [auditId]);
        } catch (error) {
            throw error;
        }
    },

    deleteStockAudit: async (auditId, institutionId, client = pool) => {
        try {
            const query = `
                DELETE FROM ration_stock_audits
                WHERE id = $1 AND institution_id = $2 AND status = 'draft'
                RETURNING *;
            `;
            const result = await client.query(query, [auditId, institutionId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    },

    getAuditList: async (institutionId, limit, offset, search = "", status = "", startDate = "", endDate = "", client = pool) => {
        try {
            let query = `
                SELECT
                    rsa.id,
                    rsa.audit_number,
                    rsa.audit_date,
                    rsa.audit_name,
                    rsa.remarks,
                    rsa.status,
                    uc_cre.email as created_by_email,
                    uc_app.email as approved_by_email,
                    rsa.created_at,
                    (SELECT COUNT(*)::integer FROM ration_stock_audit_items rsai WHERE rsai.audit_id = rsa.id) as total_items
                FROM ration_stock_audits rsa
                LEFT JOIN user_credentials uc_cre ON rsa.created_by = uc_cre.id
                LEFT JOIN user_credentials uc_app ON rsa.approved_by = uc_app.id
                WHERE rsa.institution_id = $1
            `;
            const values = [institutionId];
            let paramIndex = 2;

            if (status) {
                query += ` AND rsa.status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            if (startDate) {
                query += ` AND rsa.audit_date >= $${paramIndex}`;
                values.push(startDate);
                paramIndex++;
            }

            if (endDate) {
                query += ` AND rsa.audit_date <= $${paramIndex}`;
                values.push(endDate);
                paramIndex++;
            }

            if (search) {
                // Support searching by Audit Number, Audit Name, or Item Name / Category Name inside items
                query += ` AND (
                    rsa.audit_number ILIKE $${paramIndex}
                    OR rsa.audit_name ILIKE $${paramIndex}
                    OR EXISTS (
                        SELECT 1 FROM ration_stock_audit_items rsai
                        INNER JOIN ration_items ri ON rsai.item_id = ri.id
                        LEFT JOIN ration_item_categories rc ON ri.category_id = rc.id
                        WHERE rsai.audit_id = rsa.id
                        AND (ri.item_name ILIKE $${paramIndex} OR rc.category_name ILIKE $${paramIndex})
                    )
                )`;
                values.push(`%${search}%`);
                paramIndex++;
            }

            query += ` ORDER BY rsa.audit_date DESC, rsa.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            values.push(limit, offset);

            const result = await client.query(query, values);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },

    getAuditCount: async (institutionId, search = "", status = "", startDate = "", endDate = "", client = pool) => {
        try {
            let query = `
                SELECT COUNT(*)::integer as count
                FROM ration_stock_audits rsa
                WHERE rsa.institution_id = $1
            `;
            const values = [institutionId];
            let paramIndex = 2;

            if (status) {
                query += ` AND rsa.status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            if (startDate) {
                query += ` AND rsa.audit_date >= $${paramIndex}`;
                values.push(startDate);
                paramIndex++;
            }

            if (endDate) {
                query += ` AND rsa.audit_date <= $${paramIndex}`;
                values.push(endDate);
                paramIndex++;
            }

            if (search) {
                query += ` AND (
                    rsa.audit_number ILIKE $${paramIndex}
                    OR rsa.audit_name ILIKE $${paramIndex}
                    OR EXISTS (
                        SELECT 1 FROM ration_stock_audit_items rsai
                        INNER JOIN ration_items ri ON rsai.item_id = ri.id
                        LEFT JOIN ration_item_categories rc ON ri.category_id = rc.id
                        WHERE rsai.audit_id = rsa.id
                        AND (ri.item_name ILIKE $${paramIndex} OR rc.category_name ILIKE $${paramIndex})
                    )
                )`;
                values.push(`%${search}%`);
                paramIndex++;
            }

            const result = await client.query(query, values);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getAuditById: async (id, institutionId, client = pool) => {
        try {
            const query = `
                SELECT
                    rsa.id,
                    rsa.institution_id,
                    rsa.audit_number,
                    rsa.audit_date,
                    rsa.audit_name,
                    rsa.remarks,
                    rsa.status,
                    uc_cre.email as created_by_email,
                    uc_app.email as approved_by_email,
                    rsa.approved_at,
                    rsa.created_at,
                    rsa.updated_at
                FROM ration_stock_audits rsa
                LEFT JOIN user_credentials uc_cre ON rsa.created_by = uc_cre.id
                LEFT JOIN user_credentials uc_app ON rsa.approved_by = uc_app.id
                WHERE rsa.id = $1 AND rsa.institution_id = $2
            `;
            const result = await client.query(query, [id, institutionId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    },

    getAuditItems: async (auditId, institutionId, client = pool) => {
        try {
            const query = `
                SELECT
                    rsai.id,
                    rsai.item_id,
                    ri.item_name,
                    ri.item_code,
                    ri.sku_id,
                    ri.barcode,
                    rc.category_name,
                    ru.unit_code as unit,
                    rsai.system_stock,
                    rsai.physical_stock,
                    rsai.difference_quantity,
                    rsai.adjustment_direction,
                    rsai.remarks
                FROM ration_stock_audit_items rsai
                INNER JOIN ration_items ri ON rsai.item_id = ri.id
                LEFT JOIN ration_item_categories rc ON ri.category_id = rc.id
                LEFT JOIN ration_units ru ON ri.unit_id = ru.id
                WHERE rsai.audit_id = $1 AND rsai.institution_id = $2
                ORDER BY rsai.id ASC;
            `;
            const result = await client.query(query, [auditId, institutionId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },

    updateAuditStatus: async (id, institutionId, status, approvedBy = null, client = pool) => {
        try {
            const query = `
                UPDATE ration_stock_audits
                SET
                    status = $1,
                    approved_by = $2,
                    approved_at = CASE WHEN $1 IN ('approved', 'completed') THEN CURRENT_TIMESTAMP ELSE approved_at END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3 AND institution_id = $4
                RETURNING *;
            `;
            const result = await client.query(query, [status, approvedBy, id, institutionId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = RationStockAuditModel;
