const db = require("../../Config/Database");
const RationStockAdjustmentModel = require("../StockAdjustment/RationStockAdjustmentModel");

const RationStockAuditModel = {
    getNextAuditNumber: async (institutionId, client) => {
        const executor = client || db;

        // Find the maximum numeric suffix from existing stock audit numbers in this institution
        const maxNumQuery = `
            SELECT COALESCE(MAX(NULLIF(regexp_replace(audit_number, '[^0-9]', '', 'g'), '')::BIGINT), 0) AS max_num
            FROM ration_stock_audits
            WHERE institution_id = $1 AND audit_number ~* '^SAU\\d+$'
        `;
        const maxNumResult = await executor.query(maxNumQuery, [institutionId]);
        const maxNumVal = parseInt(maxNumResult.rows[0].max_num || 0, 10);

        const queryText = `
            INSERT INTO ration_stock_audit_sequences (
                institution_id,
                last_number,
                updated_at
            )
            VALUES ($1, GREATEST($2 + 1, 1), CURRENT_TIMESTAMP)
            ON CONFLICT (institution_id)
            DO UPDATE SET
                last_number = GREATEST(ration_stock_audit_sequences.last_number + 1, EXCLUDED.last_number),
                updated_at = CURRENT_TIMESTAMP
            RETURNING last_number;
        `;
        const result = await executor.query(queryText, [institutionId, maxNumVal]);
        const lastNumber = result.rows[0].last_number;
        return `SAU${String(lastNumber).padStart(6, "0")}`;
    },

    createStockAudit: async (auditData, client) => {
        const executor = client || db;
        const queryText = `
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
        const result = await executor.query(queryText, values);
        return result.rows[0];
    },

    createStockAuditItem: async (itemData, client) => {
        const executor = client || db;
        const queryText = `
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
        const result = await executor.query(queryText, values);
        return result.rows[0];
    },

    updateStockAudit: async (auditId, auditData, client) => {
        const executor = client || db;
        const queryText = `
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
        const result = await executor.query(queryText, values);
        return result.rows[0];
    },

    deleteStockAuditItems: async (auditId, client) => {
        const executor = client || db;
        const queryText = `DELETE FROM ration_stock_audit_items WHERE audit_id = $1`;
        await executor.query(queryText, [auditId]);
    },

    deleteStockAudit: async (auditId, institutionId, client) => {
        const executor = client || db;
        const queryText = `
            DELETE FROM ration_stock_audits
            WHERE id = $1 AND institution_id = $2 AND status = 'draft'
            RETURNING *;
        `;
        const result = await executor.query(queryText, [auditId, institutionId]);
        return result.rows[0] || null;
    },

    getAuditList: async (institutionId, limit, offset, search = "", status = "", startDate = "", endDate = "", client) => {
        const executor = client || db;
        let queryText = `
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
            queryText += ` AND rsa.status = $${paramIndex}`;
            values.push(status);
            paramIndex++;
        }

        if (startDate) {
            queryText += ` AND rsa.audit_date >= $${paramIndex}`;
            values.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            queryText += ` AND rsa.audit_date <= $${paramIndex}`;
            values.push(endDate);
            paramIndex++;
        }

        if (search) {
            queryText += ` AND (
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

        queryText += ` ORDER BY rsa.audit_date DESC, rsa.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        const result = await executor.query(queryText, values);
        return result.rows;
    },

    getAuditCount: async (institutionId, search = "", status = "", startDate = "", endDate = "", client) => {
        const executor = client || db;
        let queryText = `
            SELECT COUNT(*)::integer as count
            FROM ration_stock_audits rsa
            WHERE rsa.institution_id = $1
        `;
        const values = [institutionId];
        let paramIndex = 2;

        if (status) {
            queryText += ` AND rsa.status = $${paramIndex}`;
            values.push(status);
            paramIndex++;
        }

        if (startDate) {
            queryText += ` AND rsa.audit_date >= $${paramIndex}`;
            values.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            queryText += ` AND rsa.audit_date <= $${paramIndex}`;
            values.push(endDate);
            paramIndex++;
        }

        if (search) {
            queryText += ` AND (
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

        const result = await executor.query(queryText, values);
        return result.rows[0].count;
    },

    getAuditById: async (id, institutionId, client) => {
        const executor = client || db;
        const queryText = `
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
        const result = await executor.query(queryText, [id, institutionId]);
        return result.rows[0] || null;
    },

    getAuditItems: async (auditId, institutionId, client) => {
        const executor = client || db;
        const queryText = `
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
        const result = await executor.query(queryText, [auditId, institutionId]);
        return result.rows;
    },

    updateAuditStatus: async (id, institutionId, status, approvedBy = null, client) => {
        const executor = client || db;
        const queryText = `
            UPDATE ration_stock_audits
            SET
                status = $1::varchar,
                approved_by = $2,
                approved_at = CASE WHEN $1::varchar IN ('approved', 'completed') THEN CURRENT_TIMESTAMP ELSE approved_at END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND institution_id = $4
            RETURNING *;
        `;
        const result = await executor.query(queryText, [status, approvedBy, id, institutionId]);
        return result.rows[0] || null;
    },

    // Transaction implementations
    createStockAuditTransaction: async (institutionId, auditData, items, createdBy) => {
        return await db.transaction(async (client) => {
            const auditNumber = await RationStockAuditModel.getNextAuditNumber(institutionId, client);
            const auditHeader = await RationStockAuditModel.createStockAudit({
                institution_id: institutionId,
                audit_number: auditNumber,
                audit_date: auditData.audit_date,
                audit_name: auditData.audit_name,
                remarks: auditData.remarks,
                status: auditData.status || 'draft',
                created_by: createdBy
            }, client);

            const auditId = auditHeader.id;

            for (const item of items) {
                const itemId = Number(item.item_id);
                const sysStock = parseFloat(item.system_stock);
                const pStock = parseFloat(item.physical_stock);
                const diff = pStock - sysStock;

                let direction = null;
                if (diff > 0) {
                    direction = "increase";
                } else if (diff < 0) {
                    direction = "decrease";
                }

                await RationStockAuditModel.createStockAuditItem({
                    audit_id: auditId,
                    institution_id: institutionId,
                    item_id: itemId,
                    system_stock: sysStock,
                    physical_stock: pStock,
                    difference_quantity: diff,
                    adjustment_direction: direction,
                    remarks: item.remarks || null
                }, client);
            }

            return {
                id: auditId,
                audit_number: auditNumber
            };
        });
    },

    updateStockAuditTransaction: async (id, institutionId, auditData, items) => {
        return await db.transaction(async (client) => {
            const auditRes = await client.query(
                `SELECT id, status FROM ration_stock_audits WHERE id = $1 AND institution_id = $2 FOR UPDATE`,
                [Number(id), institutionId]
            );
            if (auditRes.rows.length === 0) {
                throw new Error("Stock audit not found or unauthorized");
            }

            const existingAudit = auditRes.rows[0];
            if (existingAudit.status !== 'draft') {
                throw new Error(`Only draft stock audits can be edited. Current status is '${existingAudit.status}'`);
            }

            await RationStockAuditModel.updateStockAudit(Number(id), {
                institution_id: institutionId,
                audit_date: auditData.audit_date,
                audit_name: auditData.audit_name,
                remarks: auditData.remarks,
                status: auditData.status || 'draft'
            }, client);

            await RationStockAuditModel.deleteStockAuditItems(Number(id), client);

            for (const item of items) {
                const itemId = Number(item.item_id);
                const sysStock = parseFloat(item.system_stock);
                const pStock = parseFloat(item.physical_stock);
                const diff = pStock - sysStock;

                let direction = null;
                if (diff > 0) {
                    direction = "increase";
                } else if (diff < 0) {
                    direction = "decrease";
                }

                await RationStockAuditModel.createStockAuditItem({
                    audit_id: Number(id),
                    institution_id: institutionId,
                    item_id: itemId,
                    system_stock: sysStock,
                    physical_stock: pStock,
                    difference_quantity: diff,
                    adjustment_direction: direction,
                    remarks: item.remarks || null
                }, client);
            }
        });
    },

    approveStockAuditTransaction: async (id, institutionId, approvedBy) => {
        return await db.transaction(async (client) => {
            const selectQuery = `
                SELECT id, audit_number, audit_date, remarks, status 
                FROM ration_stock_audits 
                WHERE id = $1 AND institution_id = $2 
                FOR UPDATE
            `;
            const selectRes = await client.query(selectQuery, [Number(id), institutionId]);
            if (selectRes.rows.length === 0) {
                throw new Error("Stock audit not found or unauthorized");
            }

            const audit = selectRes.rows[0];
            if (audit.status !== "pending") {
                throw new Error(`Only audits in pending status can be approved. Current status: '${audit.status}'`);
            }

            const items = await RationStockAuditModel.getAuditItems(Number(id), institutionId, client);
            const differenceItems = items.filter(item => parseFloat(item.difference_quantity) !== 0);

            if (differenceItems.length > 0) {
                const adjNumber = await RationStockAdjustmentModel.getNextAdjustmentNumber(institutionId, client);

                const adjHeader = await RationStockAdjustmentModel.createStockAdjustment({
                    institution_id: institutionId,
                    adjustment_number: adjNumber,
                    adjustment_date: audit.audit_date,
                    reason: "Correction",
                    remarks: `Correction generated automatically from approved Stock Audit ${audit.audit_number}. ${audit.remarks || ""}`.trim(),
                    status: "completed",
                    created_by: approvedBy,
                    approved_by: approvedBy
                }, client);

                const adjustmentId = adjHeader.id;

                for (const item of differenceItems) {
                    const itemId = Number(item.item_id);
                    const diffQty = parseFloat(item.difference_quantity);
                    const direction = item.adjustment_direction;
                    const adjQty = Math.abs(diffQty);

                    const currentStock = await RationStockAdjustmentModel.getCurrentStockForItem(itemId, institutionId, client);

                    if (direction === "decrease" && adjQty > currentStock) {
                        throw new Error(`Cannot approve stock audit. Reversal requires decreasing ${adjQty} units of ${item.item_name}, but current available stock is only ${currentStock}.`);
                    }

                    const previousStock = currentStock;
                    const newStock = direction === "increase" ? previousStock + adjQty : previousStock - adjQty;

                    await RationStockAdjustmentModel.createStockAdjustmentItem({
                        stock_adjustment_id: adjustmentId,
                        institution_id: institutionId,
                        item_id: itemId,
                        current_stock: currentStock,
                        adjustment_quantity: adjQty,
                        adjustment_direction: direction,
                        previous_stock: previousStock,
                        new_stock: newStock,
                        reason: "Correction",
                        remarks: `Audit diff adjustment for ${item.item_name}. ${item.remarks || ""}`.trim()
                    }, client);

                    await RationStockAdjustmentModel.createStockTransaction({
                        institution_id: institutionId,
                        item_id: itemId,
                        transaction_type: "ADJUSTMENT",
                        reference_type: "ADJUSTMENT",
                        reference_id: adjustmentId,
                        reference_number: adjNumber,
                        quantity_in: direction === "increase" ? adjQty : 0,
                        quantity_out: direction === "decrease" ? adjQty : 0,
                        batch_number: null,
                        expiry_date: null,
                        unit_price: 0,
                        remarks: `Audit correction transaction for ${item.item_name}`,
                        created_by: approvedBy
                    }, client);
                }
            }

            await RationStockAuditModel.updateAuditStatus(Number(id), institutionId, "approved", approvedBy, client);
        });
    }
};

module.exports = RationStockAuditModel;
