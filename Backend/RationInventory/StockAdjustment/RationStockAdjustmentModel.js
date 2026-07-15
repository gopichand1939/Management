const pool = require("../../Config/Database");

const RationStockAdjustmentModel = {
    getNextAdjustmentNumber: async (institutionId, client = pool) => {
        try {
            const query = `
                INSERT INTO ration_stock_adjustment_sequences (
                    institution_id,
                    last_number,
                    updated_at
                )
                VALUES ($1, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (institution_id)
                DO UPDATE SET
                    last_number = ration_stock_adjustment_sequences.last_number + 1,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING last_number;
            `;
            const result = await client.query(query, [institutionId]);
            const lastNumber = result.rows[0].last_number;
            return `SA${String(lastNumber).padStart(6, "0")}`;
        } catch (error) {
            throw error;
        }
    },

    createStockAdjustment: async (adjData, client = pool) => {
        try {
            const query = `
                INSERT INTO ration_stock_adjustments (
                    institution_id,
                    adjustment_number,
                    adjustment_date,
                    reason,
                    remarks,
                    status,
                    created_by,
                    approved_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, adjustment_number;
            `;
            const values = [
                adjData.institution_id,
                adjData.adjustment_number,
                adjData.adjustment_date,
                adjData.reason,
                adjData.remarks || null,
                adjData.status || 'completed',
                adjData.created_by,
                adjData.approved_by || null
            ];
            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    createStockAdjustmentItem: async (itemData, client = pool) => {
        try {
            const query = `
                INSERT INTO ration_stock_adjustment_items (
                    stock_adjustment_id,
                    institution_id,
                    item_id,
                    current_stock,
                    adjustment_quantity,
                    adjustment_direction,
                    previous_stock,
                    new_stock,
                    reason,
                    remarks
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id;
            `;
            const values = [
                itemData.stock_adjustment_id,
                itemData.institution_id,
                itemData.item_id,
                itemData.current_stock,
                itemData.adjustment_quantity,
                itemData.adjustment_direction,
                itemData.previous_stock,
                itemData.new_stock,
                itemData.reason || null,
                itemData.remarks || null
            ];
            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    createStockTransaction: async (txData, client = pool) => {
        try {
            const query = `
                INSERT INTO ration_stock_transactions (
                    institution_id,
                    item_id,
                    transaction_type,
                    reference_type,
                    reference_id,
                    reference_number,
                    quantity_in,
                    quantity_out,
                    batch_number,
                    expiry_date,
                    unit_price,
                    remarks,
                    created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id;
            `;
            const values = [
                txData.institution_id,
                txData.item_id,
                txData.transaction_type,
                txData.reference_type,
                txData.reference_id,
                txData.reference_number,
                txData.quantity_in || 0,
                txData.quantity_out || 0,
                txData.batch_number || null,
                txData.expiry_date || null,
                txData.unit_price || 0,
                txData.remarks || null,
                txData.created_by
            ];
            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    getCurrentStockForItem: async (itemId, institutionId, client = pool) => {
        try {
            const query = `
                SELECT COALESCE(SUM(quantity_in) - SUM(quantity_out), 0)::numeric as current_stock
                FROM ration_stock_transactions
                WHERE item_id = $1 AND institution_id = $2
            `;
            const result = await client.query(query, [itemId, institutionId]);
            return parseFloat(result.rows[0].current_stock || 0);
        } catch (error) {
            throw error;
        }
    },

    getAdjustmentList: async (institutionId, limit, offset, search = "", status = "", reason = "", client = pool) => {
        try {
            let query = `
                SELECT
                    rsa.id,
                    rsa.adjustment_number,
                    rsa.adjustment_date,
                    rsa.reason,
                    rsa.remarks,
                    rsa.status,
                    uc.email as created_by_email,
                    rsa.created_at,
                    (SELECT COUNT(*)::integer FROM ration_stock_adjustment_items rsai WHERE rsai.stock_adjustment_id = rsa.id) as total_items,
                    (SELECT COALESCE(SUM(rsai.adjustment_quantity), 0)::numeric FROM ration_stock_adjustment_items rsai WHERE rsai.stock_adjustment_id = rsa.id) as total_quantity
                FROM ration_stock_adjustments rsa
                LEFT JOIN user_credentials uc ON rsa.created_by = uc.id
                WHERE rsa.institution_id = $1
            `;
            const values = [institutionId];
            let paramIndex = 2;

            if (status) {
                query += ` AND rsa.status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            if (reason) {
                query += ` AND rsa.reason = $${paramIndex}`;
                values.push(reason);
                paramIndex++;
            }

            if (search) {
                query += ` AND (rsa.adjustment_number ILIKE $${paramIndex} OR rsa.remarks ILIKE $${paramIndex})`;
                values.push(`%${search}%`);
                paramIndex++;
            }

            query += ` ORDER BY rsa.adjustment_date DESC, rsa.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            values.push(limit, offset);

            const result = await client.query(query, values);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },

    getAdjustmentCount: async (institutionId, search = "", status = "", reason = "", client = pool) => {
        try {
            let query = `
                SELECT COUNT(*)::integer as count
                FROM ration_stock_adjustments rsa
                WHERE rsa.institution_id = $1
            `;
            const values = [institutionId];
            let paramIndex = 2;

            if (status) {
                query += ` AND rsa.status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            if (reason) {
                query += ` AND rsa.reason = $${paramIndex}`;
                values.push(reason);
                paramIndex++;
            }

            if (search) {
                query += ` AND (rsa.adjustment_number ILIKE $${paramIndex} OR rsa.remarks ILIKE $${paramIndex})`;
                values.push(`%${search}%`);
                paramIndex++;
            }

            const result = await client.query(query, values);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getAdjustmentById: async (id, institutionId, client = pool) => {
        try {
            const query = `
                SELECT
                    rsa.id,
                    rsa.adjustment_number,
                    rsa.adjustment_date,
                    rsa.reason,
                    rsa.remarks,
                    rsa.status,
                    uc_cre.email as created_by_email,
                    uc_app.email as approved_by_email,
                    rsa.created_at,
                    rsa.updated_at
                FROM ration_stock_adjustments rsa
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

    getAdjustmentItems: async (stockAdjustmentId, institutionId, client = pool) => {
        try {
            const query = `
                SELECT
                    rsai.id,
                    rsai.item_id,
                    ri.item_name,
                    ri.item_code,
                    ri.sku_id,
                    ri.barcode,
                    ru.unit_code as unit,
                    rsai.current_stock,
                    rsai.adjustment_quantity,
                    rsai.adjustment_direction,
                    rsai.previous_stock,
                    rsai.new_stock,
                    rsai.reason,
                    rsai.remarks
                FROM ration_stock_adjustment_items rsai
                INNER JOIN ration_items ri ON rsai.item_id = ri.id
                LEFT JOIN ration_units ru ON ri.unit_id = ru.id
                WHERE rsai.stock_adjustment_id = $1 AND rsai.institution_id = $2
                ORDER BY rsai.id ASC;
            `;
            const result = await client.query(query, [stockAdjustmentId, institutionId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },

    cancelStockAdjustment: async (id, institutionId, client = pool) => {
        try {
            const query = `
                UPDATE ration_stock_adjustments
                SET
                    status = 'cancelled',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND institution_id = $2
                RETURNING *;
            `;
            const result = await client.query(query, [id, institutionId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = RationStockAdjustmentModel;
