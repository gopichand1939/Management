const pool = require("../../Config/Database");

const RationStockIssueModel = {
    getNextStockIssueNumber: async (institutionId, client = pool) => {
        try {
            const query = `
                INSERT INTO ration_stock_issue_sequences (
                    institution_id,
                    last_number,
                    updated_at
                )
                VALUES ($1, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (institution_id)
                DO UPDATE SET
                    last_number = ration_stock_issue_sequences.last_number + 1,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING last_number;
            `;
            const result = await client.query(query, [institutionId]);
            const lastNumber = result.rows[0].last_number;
            return `SI${String(lastNumber).padStart(6, "0")}`;
        } catch (error) {
            throw error;
        }
    },

    getApprovedRequestList: async (institutionId, limit, offset, search = "", client = pool) => {
        try {
            let query = `
                SELECT
                    rkr.id,
                    rkr.request_number,
                    rkr.request_date,
                    rkr.required_date,
                    mtm.meal_type_name,
                    rkr.priority,
                    uc.email as requested_by_email,
                    rkr.status,
                    (SELECT COUNT(*)::integer FROM ration_kitchen_request_items rkri WHERE rkri.request_id = rkr.id) as total_items,
                    (SELECT COUNT(*)::integer FROM ration_kitchen_request_items rkri WHERE rkri.request_id = rkr.id AND rkri.approved_quantity > rkri.issued_quantity) as remaining_items,
                    (SELECT COALESCE(SUM(rkri.approved_quantity), 0)::numeric FROM ration_kitchen_request_items rkri WHERE rkri.request_id = rkr.id) as total_approved_quantity,
                    (SELECT COALESCE(SUM(rkri.issued_quantity), 0)::numeric FROM ration_kitchen_request_items rkri WHERE rkri.request_id = rkr.id) as total_issued_quantity
                FROM ration_kitchen_requests rkr
                LEFT JOIN meal_type_master mtm ON rkr.meal_type_id = mtm.id
                LEFT JOIN user_credentials uc ON rkr.requested_by = uc.id
                WHERE rkr.institution_id = $1
                  AND rkr.status IN ('approved', 'partially_issued')
                  AND EXISTS (
                      SELECT 1 FROM ration_kitchen_request_items rkri
                      WHERE rkri.request_id = rkr.id
                        AND rkri.approved_quantity > rkri.issued_quantity
                  )
            `;
            const values = [institutionId];
            let paramIndex = 2;

            if (search) {
                query += ` AND (rkr.request_number ILIKE $${paramIndex} OR uc.email ILIKE $${paramIndex} OR rkr.remarks ILIKE $${paramIndex})`;
                values.push(`%${search}%`);
                paramIndex++;
            }

            query += ` ORDER BY rkr.required_date ASC, rkr.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            values.push(limit, offset);

            const result = await client.query(query, values);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },

    getApprovedRequestCount: async (institutionId, search = "", client = pool) => {
        try {
            let query = `
                SELECT COUNT(*)::integer as count
                FROM ration_kitchen_requests rkr
                LEFT JOIN user_credentials uc ON rkr.requested_by = uc.id
                WHERE rkr.institution_id = $1
                  AND rkr.status IN ('approved', 'partially_issued')
                  AND EXISTS (
                      SELECT 1 FROM ration_kitchen_request_items rkri
                      WHERE rkri.request_id = rkr.id
                        AND rkri.approved_quantity > rkri.issued_quantity
                  )
            `;
            const values = [institutionId];
            let paramIndex = 2;

            if (search) {
                query += ` AND (rkr.request_number ILIKE $${paramIndex} OR uc.email ILIKE $${paramIndex} OR rkr.remarks ILIKE $${paramIndex})`;
                values.push(`%${search}%`);
                paramIndex++;
            }

            const result = await client.query(query, values);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getApprovedRequestById: async (id, institutionId, client = pool) => {
        try {
            const query = `
                SELECT
                    rkr.id,
                    rkr.request_number,
                    rkr.request_date,
                    rkr.required_date,
                    mtm.meal_type_name,
                    rkr.priority,
                    uc.email as requested_by_email,
                    rkr.status,
                    rkr.remarks
                FROM ration_kitchen_requests rkr
                LEFT JOIN meal_type_master mtm ON rkr.meal_type_id = mtm.id
                LEFT JOIN user_credentials uc ON rkr.requested_by = uc.id
                WHERE rkr.id = $1 AND rkr.institution_id = $2
            `;
            const result = await client.query(query, [id, institutionId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    },

    getApprovedRequestItems: async (requestId, institutionId, client = pool) => {
        try {
            const query = `
                SELECT
                    rkri.id as kitchen_request_item_id,
                    rkri.item_id,
                    ri.item_name,
                    ri.item_code,
                    ri.sku_id,
                    ri.barcode,
                    rc.category_name as category,
                    ru.unit_code as unit,
                    rkri.requested_quantity,
                    rkri.approved_quantity,
                    rkri.issued_quantity,
                    (rkri.approved_quantity - rkri.issued_quantity) as remaining_quantity,
                    (
                        SELECT COALESCE(SUM(rst.quantity_in) - SUM(rst.quantity_out), 0)::numeric
                        FROM ration_stock_transactions rst
                        WHERE rst.item_id = rkri.item_id AND rst.institution_id = rkri.institution_id
                    ) as current_stock,
                    ri.batch_tracking,
                    ri.expiry_tracking,
                    ri.default_purchase_price
                FROM ration_kitchen_request_items rkri
                INNER JOIN ration_items ri ON rkri.item_id = ri.id
                LEFT JOIN ration_item_categories rc ON ri.category_id = rc.id
                LEFT JOIN ration_units ru ON ri.unit_id = ru.id
                WHERE rkri.request_id = $1 AND rkri.institution_id = $2
                ORDER BY rkri.id ASC
            `;
            const result = await client.query(query, [requestId, institutionId]);
            return result.rows;
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

    createStockIssue: async (issueData, client = pool) => {
        try {
            const query = `
                INSERT INTO ration_stock_issues (
                    institution_id,
                    pg_admin_id,
                    issue_number,
                    kitchen_request_id,
                    issue_date,
                    issued_to,
                    meal_type_id,
                    remarks,
                    status,
                    created_by,
                    updated_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id, issue_number;
            `;
            const values = [
                issueData.institution_id,
                issueData.pg_admin_id || null,
                issueData.issue_number,
                issueData.kitchen_request_id,
                issueData.issue_date,
                issueData.issued_to || null,
                issueData.meal_type_id || null,
                issueData.remarks || null,
                issueData.status || 'completed',
                issueData.created_by,
                issueData.created_by
            ];
            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    createStockIssueItem: async (itemData, client = pool) => {
        try {
            const query = `
                INSERT INTO ration_stock_issue_items (
                    stock_issue_id,
                    institution_id,
                    kitchen_request_item_id,
                    item_id,
                    approved_quantity,
                    previously_issued_quantity,
                    issue_quantity,
                    unit_price,
                    batch_number,
                    expiry_date,
                    remarks
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id;
            `;
            const values = [
                itemData.stock_issue_id,
                itemData.institution_id,
                itemData.kitchen_request_item_id,
                itemData.item_id,
                itemData.approved_quantity,
                itemData.previously_issued_quantity,
                itemData.issue_quantity,
                itemData.unit_price || 0,
                itemData.batch_number || null,
                itemData.expiry_date || null,
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
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id;
            `;
            const values = [
                txData.institution_id,
                txData.item_id,
                txData.transaction_type,
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

    updateKitchenRequestItemIssuedQuantity: async (kitchenRequestItemId, incrementQty, client = pool) => {
        try {
            const query = `
                UPDATE ration_kitchen_request_items
                SET
                    issued_quantity = issued_quantity + $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2;
            `;
            await client.query(query, [incrementQty, kitchenRequestItemId]);
        } catch (error) {
            throw error;
        }
    },

    updateKitchenRequestStatus: async (requestId, status, client = pool) => {
        try {
            const query = `
                UPDATE ration_kitchen_requests
                SET
                    status = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2;
            `;
            await client.query(query, [status, requestId]);
        } catch (error) {
            throw error;
        }
    },

    getStockIssueList: async (institutionId, limit, offset, search = "", status = "", client = pool) => {
        try {
            let query = `
                SELECT
                    rsi.id,
                    rsi.issue_number,
                    rsi.issue_date,
                    rsi.remarks,
                    rsi.status,
                    rkr.request_number,
                    mtm.meal_type_name,
                    uc.email as created_by_email,
                    rsi.created_at,
                    (SELECT COUNT(*)::integer FROM ration_stock_issue_items rsii WHERE rsii.stock_issue_id = rsi.id) as total_items,
                    (SELECT COALESCE(SUM(rsii.issue_quantity), 0)::numeric FROM ration_stock_issue_items rsii WHERE rsii.stock_issue_id = rsi.id) as total_quantity
                FROM ration_stock_issues rsi
                INNER JOIN ration_kitchen_requests rkr ON rsi.kitchen_request_id = rkr.id
                LEFT JOIN meal_type_master mtm ON rsi.meal_type_id = mtm.id
                LEFT JOIN user_credentials uc ON rsi.created_by = uc.id
                WHERE rsi.institution_id = $1
            `;
            const values = [institutionId];
            let paramIndex = 2;

            if (status) {
                query += ` AND rsi.status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            if (search) {
                query += ` AND (rsi.issue_number ILIKE $${paramIndex} OR rkr.request_number ILIKE $${paramIndex} OR rsi.remarks ILIKE $${paramIndex})`;
                values.push(`%${search}%`);
                paramIndex++;
            }

            query += ` ORDER BY rsi.issue_date DESC, rsi.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            values.push(limit, offset);

            const result = await client.query(query, values);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },

    getStockIssueCount: async (institutionId, search = "", status = "", client = pool) => {
        try {
            let query = `
                SELECT COUNT(*)::integer as count
                FROM ration_stock_issues rsi
                INNER JOIN ration_kitchen_requests rkr ON rsi.kitchen_request_id = rkr.id
                LEFT JOIN user_credentials uc ON rsi.created_by = uc.id
                WHERE rsi.institution_id = $1
            `;
            const values = [institutionId];
            let paramIndex = 2;

            if (status) {
                query += ` AND rsi.status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            if (search) {
                query += ` AND (rsi.issue_number ILIKE $${paramIndex} OR rkr.request_number ILIKE $${paramIndex} OR rsi.remarks ILIKE $${paramIndex})`;
                values.push(`%${search}%`);
                paramIndex++;
            }

            const result = await client.query(query, values);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getStockIssueById: async (id, institutionId, client = pool) => {
        try {
            const query = `
                SELECT
                    rsi.id,
                    rsi.issue_number,
                    rsi.issue_date,
                    rsi.remarks,
                    rsi.status,
                    rsi.kitchen_request_id,
                    rkr.request_number,
                    mtm.meal_type_name,
                    uc_iss.email as issued_by_email,
                    rsi.created_at,
                    rsi.updated_at
                FROM ration_stock_issues rsi
                INNER JOIN ration_kitchen_requests rkr ON rsi.kitchen_request_id = rkr.id
                LEFT JOIN meal_type_master mtm ON rsi.meal_type_id = mtm.id
                LEFT JOIN user_credentials uc_iss ON rsi.created_by = uc_iss.id
                WHERE rsi.id = $1 AND rsi.institution_id = $2
            `;
            const result = await client.query(query, [id, institutionId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    },

    getStockIssueItems: async (stockIssueId, institutionId, client = pool) => {
        try {
            const query = `
                SELECT
                    rsii.id,
                    rsii.item_id,
                    ri.item_name,
                    ri.sku_id,
                    ri.barcode,
                    ru.unit_code as unit,
                    rsii.approved_quantity,
                    rsii.previously_issued_quantity,
                    rsii.issue_quantity,
                    rsii.unit_price,
                    rsii.batch_number,
                    rsii.expiry_date,
                    rsii.remarks
                FROM ration_stock_issue_items rsii
                INNER JOIN ration_items ri ON rsii.item_id = ri.id
                LEFT JOIN ration_units ru ON ri.unit_id = ru.id
                WHERE rsii.stock_issue_id = $1 AND rsii.institution_id = $2
                ORDER BY rsii.id ASC;
            `;
            const result = await client.query(query, [stockIssueId, institutionId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },

    cancelStockIssue: async (id, institutionId, client = pool) => {
        try {
            const query = `
                UPDATE ration_stock_issues
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

module.exports = RationStockIssueModel;
