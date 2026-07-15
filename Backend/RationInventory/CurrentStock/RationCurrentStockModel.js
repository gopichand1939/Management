const pool = require("../../Config/Database");

const RationCurrentStockModel = {
    getCurrentStockList: async (
        institutionId,
        limit,
        offset,
        search = "",
        categoryId = null,
        unitId = null,
        stockStatus = "",
        itemStatus = "active"
    ) => {
        try {
            let query = `
                WITH stock_cte AS (
                    SELECT
                        ri.id as item_id,
                        ri.institution_id,
                        ri.item_name,
                        ri.item_code,
                        ri.sku_id,
                        ri.barcode,
                        ri.image_url,
                        ri.category_id,
                        ric.category_name,
                        ric.category_code,
                        ri.unit_id,
                        ru.unit_name,
                        ru.unit_code,
                        ri.minimum_stock,
                        ri.maximum_stock,
                        ri.reorder_quantity,
                        ri.default_purchase_price,
                        ri.status,
                        COALESCE(SUM(rst.quantity_in) - SUM(rst.quantity_out), 0) as current_stock,
                        MAX(rst.created_at) as last_transaction_date
                    FROM ration_items ri
                    LEFT JOIN ration_item_categories ric ON ri.category_id = ric.id
                    LEFT JOIN ration_units ru ON ri.unit_id = ru.id
                    LEFT JOIN ration_stock_transactions rst ON ri.id = rst.item_id AND rst.institution_id = ri.institution_id
                    WHERE ri.institution_id = $1
                    GROUP BY ri.id, ric.id, ru.id
                )
                SELECT
                    *,
                    (current_stock * default_purchase_price) as stock_value,
                    CASE
                        WHEN current_stock <= 0 THEN 'out_of_stock'
                        WHEN current_stock > 0 AND current_stock <= minimum_stock THEN 'low_stock'
                        ELSE 'in_stock'
                    END as stock_status
                FROM stock_cte
                WHERE 1=1
            `;

            const values = [institutionId];
            let paramIndex = 2;

            if (itemStatus) {
                query += ` AND status = $${paramIndex}`;
                values.push(itemStatus);
                paramIndex++;
            }

            if (categoryId) {
                query += ` AND category_id = $${paramIndex}`;
                values.push(categoryId);
                paramIndex++;
            }

            if (unitId) {
                query += ` AND unit_id = $${paramIndex}`;
                values.push(unitId);
                paramIndex++;
            }

            if (stockStatus) {
                query += ` AND CASE
                    WHEN current_stock <= 0 THEN 'out_of_stock'
                    WHEN current_stock > 0 AND current_stock <= minimum_stock THEN 'low_stock'
                    ELSE 'in_stock'
                END = $${paramIndex}`;
                values.push(stockStatus);
                paramIndex++;
            }

            if (search) {
                query += `
                    AND (
                        item_name ILIKE $${paramIndex} OR
                        item_code ILIKE $${paramIndex} OR
                        sku_id ILIKE $${paramIndex} OR
                        barcode ILIKE $${paramIndex} OR
                        category_name ILIKE $${paramIndex} OR
                        category_code ILIKE $${paramIndex} OR
                        unit_name ILIKE $${paramIndex} OR
                        unit_code ILIKE $${paramIndex}
                    )
                `;
                values.push(`%${search}%`);
                paramIndex++;
            }

            query += ` ORDER BY item_id DESC`;

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

    getCurrentStockCount: async (
        institutionId,
        search = "",
        categoryId = null,
        unitId = null,
        stockStatus = "",
        itemStatus = "active"
    ) => {
        try {
            let query = `
                WITH stock_cte AS (
                    SELECT
                        ri.id as item_id,
                        ri.status,
                        ri.category_id,
                        ri.unit_id,
                        ri.minimum_stock,
                        ric.category_name,
                        ric.category_code,
                        ru.unit_name,
                        ru.unit_code,
                        ri.item_name,
                        ri.item_code,
                        ri.sku_id,
                        ri.barcode,
                        COALESCE(SUM(rst.quantity_in) - SUM(rst.quantity_out), 0) as current_stock
                    FROM ration_items ri
                    LEFT JOIN ration_item_categories ric ON ri.category_id = ric.id
                    LEFT JOIN ration_units ru ON ri.unit_id = ru.id
                    LEFT JOIN ration_stock_transactions rst ON ri.id = rst.item_id AND rst.institution_id = ri.institution_id
                    WHERE ri.institution_id = $1
                    GROUP BY ri.id, ric.id, ru.id
                )
                SELECT COUNT(*)::integer as count
                FROM stock_cte
                WHERE 1=1
            `;

            const values = [institutionId];
            let paramIndex = 2;

            if (itemStatus) {
                query += ` AND status = $${paramIndex}`;
                values.push(itemStatus);
                paramIndex++;
            }

            if (categoryId) {
                query += ` AND category_id = $${paramIndex}`;
                values.push(categoryId);
                paramIndex++;
            }

            if (unitId) {
                query += ` AND unit_id = $${paramIndex}`;
                values.push(unitId);
                paramIndex++;
            }

            if (stockStatus) {
                query += ` AND CASE
                    WHEN current_stock <= 0 THEN 'out_of_stock'
                    WHEN current_stock > 0 AND current_stock <= minimum_stock THEN 'low_stock'
                    ELSE 'in_stock'
                END = $${paramIndex}`;
                values.push(stockStatus);
                paramIndex++;
            }

            if (search) {
                query += `
                    AND (
                        item_name ILIKE $${paramIndex} OR
                        item_code ILIKE $${paramIndex} OR
                        sku_id ILIKE $${paramIndex} OR
                        barcode ILIKE $${paramIndex} OR
                        category_name ILIKE $${paramIndex} OR
                        category_code ILIKE $${paramIndex} OR
                        unit_name ILIKE $${paramIndex} OR
                        unit_code ILIKE $${paramIndex}
                    )
                `;
                values.push(`%${search}%`);
                paramIndex++;
            }

            const result = await pool.query(query, values);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getCurrentStockByItemId: async (itemId, institutionId) => {
        try {
            const query = `
                WITH stock_cte AS (
                    SELECT
                        ri.id as item_id,
                        ri.institution_id,
                        ri.item_name,
                        ri.item_code,
                        ri.sku_id,
                        ri.barcode,
                        ri.image_url,
                        ri.category_id,
                        ric.category_name,
                        ric.category_code,
                        ri.unit_id,
                        ru.unit_name,
                        ru.unit_code,
                        ri.minimum_stock,
                        ri.maximum_stock,
                        ri.reorder_quantity,
                        ri.default_purchase_price,
                        ri.status,
                        COALESCE(SUM(rst.quantity_in) - SUM(rst.quantity_out), 0) as current_stock
                    FROM ration_items ri
                    LEFT JOIN ration_item_categories ric ON ri.category_id = ric.id
                    LEFT JOIN ration_units ru ON ri.unit_id = ru.id
                    LEFT JOIN ration_stock_transactions rst ON ri.id = rst.item_id AND rst.institution_id = ri.institution_id
                    WHERE ri.id = $1 AND ri.institution_id = $2
                    GROUP BY ri.id, ric.id, ru.id
                )
                SELECT
                    *,
                    (current_stock * default_purchase_price) as stock_value,
                    CASE
                        WHEN current_stock <= 0 THEN 'out_of_stock'
                        WHEN current_stock > 0 AND current_stock <= minimum_stock THEN 'low_stock'
                        ELSE 'in_stock'
                    END as stock_status
                FROM stock_cte
            `;
            const result = await pool.query(query, [itemId, institutionId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    },

    getStockTransactionHistory: async (itemId, institutionId, limit, offset, filters = {}) => {
        try {
            let query = `
                SELECT
                    id as transaction_id,
                    transaction_type,
                    reference_type,
                    reference_id,
                    reference_number,
                    quantity_in,
                    quantity_out,
                    unit_price,
                    created_at as transaction_date,
                    remarks,
                    created_by
                FROM ration_stock_transactions
                WHERE item_id = $1 AND institution_id = $2
            `;

            const values = [itemId, institutionId];
            let paramIndex = 3;

            if (filters.transaction_type) {
                query += ` AND transaction_type = $${paramIndex}`;
                values.push(filters.transaction_type);
                paramIndex++;
            }

            if (filters.search) {
                query += ` AND reference_number ILIKE $${paramIndex}`;
                values.push(`%${filters.search}%`);
                paramIndex++;
            }

            if (filters.start_date && filters.end_date) {
                query += ` AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
                values.push(filters.start_date, filters.end_date);
                paramIndex += 2;
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

    getStockTransactionHistoryCount: async (itemId, institutionId, filters = {}) => {
        try {
            let query = `
                SELECT COUNT(*)::integer as count
                FROM ration_stock_transactions
                WHERE item_id = $1 AND institution_id = $2
            `;

            const values = [itemId, institutionId];
            let paramIndex = 3;

            if (filters.transaction_type) {
                query += ` AND transaction_type = $${paramIndex}`;
                values.push(filters.transaction_type);
                paramIndex++;
            }

            if (filters.search) {
                query += ` AND reference_number ILIKE $${paramIndex}`;
                values.push(`%${filters.search}%`);
                paramIndex++;
            }

            if (filters.start_date && filters.end_date) {
                query += ` AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
                values.push(filters.start_date, filters.end_date);
                paramIndex += 2;
            }

            const result = await pool.query(query, values);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getCurrentStockSummary: async (institutionId) => {
        try {
            const query = `
                WITH stock_cte AS (
                    SELECT
                        ri.id,
                        ri.minimum_stock,
                        ri.default_purchase_price,
                        COALESCE(SUM(rst.quantity_in) - SUM(rst.quantity_out), 0) as current_stock
                    FROM ration_items ri
                    LEFT JOIN ration_stock_transactions rst ON ri.id = rst.item_id AND rst.institution_id = ri.institution_id
                    WHERE ri.institution_id = $1 AND ri.status = 'active'
                    GROUP BY ri.id
                )
                SELECT
                    COUNT(*)::integer as total_items,
                    SUM(CASE WHEN current_stock > minimum_stock THEN 1 ELSE 0 END)::integer as in_stock_items,
                    SUM(CASE WHEN current_stock > 0 AND current_stock <= minimum_stock THEN 1 ELSE 0 END)::integer as low_stock_items,
                    SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END)::integer as out_of_stock_items,
                    COALESCE(SUM(current_stock), 0)::numeric(12,3) as total_stock_quantity,
                    COALESCE(SUM(current_stock * default_purchase_price), 0)::numeric(12,2) as total_inventory_value
                FROM stock_cte
            `;
            const result = await pool.query(query, [institutionId]);
            return result.rows[0] || {
                total_items: 0,
                in_stock_items: 0,
                low_stock_items: 0,
                out_of_stock_items: 0,
                total_stock_quantity: 0,
                total_inventory_value: 0
            };
        } catch (error) {
            throw error;
        }
    },

    getLastPurchaseForItem: async (itemId, institutionId) => {
        try {
            const query = `
                SELECT
                    rp.purchase_number,
                    rs.supplier_name,
                    rp.purchase_date,
                    rpi.quantity,
                    rpi.unit_price
                FROM ration_purchase_items rpi
                INNER JOIN ration_purchases rp ON rpi.purchase_id = rp.id
                INNER JOIN ration_suppliers rs ON rp.supplier_id = rs.id
                WHERE rpi.item_id = $1 AND rp.institution_id = $2 AND rp.status = 'completed'
                ORDER BY rp.purchase_date DESC, rp.id DESC
                LIMIT 1
            `;
            const result = await pool.query(query, [itemId, institutionId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    },

    getStockValueSummary: async (institutionId) => {
        try {
            const query = `
                WITH stock_cte AS (
                    SELECT
                        ri.id,
                        ri.default_purchase_price,
                        COALESCE(SUM(rst.quantity_in) - SUM(rst.quantity_out), 0) as current_stock
                    FROM ration_items ri
                    LEFT JOIN ration_stock_transactions rst ON ri.id = rst.item_id AND rst.institution_id = ri.institution_id
                    WHERE ri.institution_id = $1 AND ri.status = 'active'
                    GROUP BY ri.id
                )
                SELECT
                    COALESCE(SUM(current_stock * default_purchase_price), 0)::numeric(12,2) as total_value
                FROM stock_cte
            `;
            const result = await pool.query(query, [institutionId]);
            return result.rows[0] || { total_value: 0 };
        } catch (error) {
            throw error;
        }
    },

    getItemInstitutionId: async (itemId) => {
        try {
            const query = `SELECT institution_id FROM ration_items WHERE id = $1`;
            const result = await pool.query(query, [itemId]);
            return result.rows[0]?.institution_id || null;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = RationCurrentStockModel;
