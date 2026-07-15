const pool = require("../../Config/Database");

const RationInventoryDashboardModel = {
    getDashboardSummary: async (institutionId, fromDate, toDate, categoryId = null, client = pool) => {
        try {
            // 1. Fetch Item statistics based on current stock levels
            let stockQuery = `
                WITH stock_cte AS (
                    SELECT
                        ri.id,
                        ri.minimum_stock,
                        ri.default_purchase_price,
                        COALESCE(SUM(rst.quantity_in) - SUM(rst.quantity_out), 0) as current_stock
                    FROM ration_items ri
                    LEFT JOIN ration_stock_transactions rst ON ri.id = rst.item_id AND rst.institution_id = ri.institution_id
                    WHERE ri.institution_id = $1
            `;
            const stockValues = [institutionId];

            if (categoryId) {
                stockQuery += ` AND ri.category_id = $2`;
                stockValues.push(categoryId);
            }

            stockQuery += `
                    GROUP BY ri.id
                )
                SELECT
                    COUNT(*)::integer as total_items,
                    SUM(CASE WHEN current_stock > 0 THEN current_stock ELSE 0 END)::numeric as total_stock_quantity,
                    SUM(CASE WHEN current_stock > 0 THEN current_stock * default_purchase_price ELSE 0 END)::numeric as total_stock_value,
                    SUM(CASE WHEN current_stock > minimum_stock THEN 1 ELSE 0 END)::integer as in_stock_items,
                    SUM(CASE WHEN current_stock > 0 AND current_stock <= minimum_stock THEN 1 ELSE 0 END)::integer as low_stock_items,
                    SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END)::integer as out_of_stock_items
                FROM stock_cte
            `;

            const stockRes = await client.query(stockQuery, stockValues);
            const stockStats = stockRes.rows[0] || {
                total_items: 0,
                total_stock_quantity: 0,
                total_stock_value: 0,
                in_stock_items: 0,
                low_stock_items: 0,
                out_of_stock_items: 0
            };

            // 2. Fetch pending transaction logs (Kitchen requests, approved requests, audits)
            const pendingQuery = `
                SELECT
                    (SELECT COUNT(*)::integer FROM ration_kitchen_requests WHERE institution_id = $1 AND status = 'pending') as pending_kitchen_requests,
                    (SELECT COUNT(*)::integer FROM ration_kitchen_requests WHERE institution_id = $1 AND status IN ('approved', 'partially_issued')) as approved_requests_waiting_issue,
                    (SELECT COUNT(*)::integer FROM ration_stock_audits WHERE institution_id = $1 AND status = 'pending') as pending_stock_audits
            `;
            const pendingRes = await client.query(pendingQuery, [institutionId]);
            const pendingStats = pendingRes.rows[0] || {
                pending_kitchen_requests: 0,
                approved_requests_waiting_issue: 0,
                pending_stock_audits: 0
            };

            // 3. Expiry stats from batches
            const expiryQuery = `
                SELECT
                    COUNT(CASE WHEN expiry_date < CURRENT_DATE THEN 1 END)::integer as expired_batches,
                    COUNT(CASE WHEN expiry_date >= CURRENT_DATE AND expiry_date - CURRENT_DATE <= 30 THEN 1 END)::integer as expiring_soon_batches
                FROM ration_item_batches
                WHERE institution_id = $1 AND remaining_quantity > 0
            `;
            const expiryRes = await client.query(expiryQuery, [institutionId]);
            const expiryStats = expiryRes.rows[0] || {
                expired_batches: 0,
                expiring_soon_batches: 0
            };

            // 4. Financial Purchase and Issue totals within date range
            const financeQuery = `
                SELECT
                    (
                        SELECT COALESCE(SUM(rp.grand_total), 0)::numeric 
                        FROM ration_purchases rp 
                        WHERE rp.institution_id = $1 AND rp.status = 'completed' AND rp.purchase_date >= $2 AND rp.purchase_date <= $3
                    ) as current_month_purchase_amount,
                    (
                        SELECT COALESCE(SUM(rsii.issue_quantity), 0)::numeric 
                        FROM ration_stock_issues rsi 
                        INNER JOIN ration_stock_issue_items rsii ON rsi.id = rsii.stock_issue_id
                        WHERE rsi.institution_id = $1 AND rsi.status = 'completed' AND rsi.issue_date >= $2 AND rsi.issue_date <= $3
                    ) as current_month_issued_quantity
            `;
            const financeRes = await client.query(financeQuery, [institutionId, fromDate, toDate]);
            const financeStats = financeRes.rows[0] || {
                current_month_purchase_amount: 0,
                current_month_issued_quantity: 0
            };

            // 5. Active items count
            const activeRes = await client.query(
                "SELECT COUNT(*)::integer as active_items FROM ration_items WHERE institution_id = $1 AND status = 'active'",
                [institutionId]
            );
            const activeCount = activeRes.rows[0]?.active_items || 0;

            return {
                total_items: stockStats.total_items,
                active_items: activeCount,
                total_stock_quantity: parseFloat(stockStats.total_stock_quantity || 0),
                total_stock_value: parseFloat(stockStats.total_stock_value || 0),
                in_stock_items: stockStats.in_stock_items,
                low_stock_items: stockStats.low_stock_items,
                out_of_stock_items: stockStats.out_of_stock_items,
                expiring_soon_batches: expiryStats.expiring_soon_batches,
                expired_batches: expiryStats.expired_batches,
                pending_kitchen_requests: pendingStats.pending_kitchen_requests,
                approved_requests_waiting_issue: pendingStats.approved_requests_waiting_issue,
                pending_stock_audits: pendingStats.pending_stock_audits,
                current_month_purchase_amount: parseFloat(financeStats.current_month_purchase_amount || 0),
                current_month_issued_quantity: parseFloat(financeStats.current_month_issued_quantity || 0)
            };

        } catch (error) {
            throw error;
        }
    },

    getPurchaseTrend: async (institutionId, fromDate, toDate, client = pool) => {
        try {
            const query = `
                SELECT
                    rp.purchase_date::text as date,
                    COALESCE(SUM(rp.grand_total), 0)::numeric as amount
                FROM ration_purchases rp
                WHERE rp.institution_id = $1 AND rp.status = 'completed' AND rp.purchase_date >= $2 AND rp.purchase_date <= $3
                GROUP BY rp.purchase_date
                ORDER BY rp.purchase_date ASC
            `;
            const result = await client.query(query, [institutionId, fromDate, toDate]);
            return result.rows.map(r => ({
                date: r.date,
                amount: parseFloat(r.amount)
            }));
        } catch (error) {
            throw error;
        }
    },

    getIssueTrend: async (institutionId, fromDate, toDate, client = pool) => {
        try {
            const query = `
                SELECT
                    rsi.issue_date::text as date,
                    COALESCE(SUM(rsii.issue_quantity), 0)::numeric as quantity
                FROM ration_stock_issues rsi
                INNER JOIN ration_stock_issue_items rsii ON rsi.id = rsii.stock_issue_id
                WHERE rsi.institution_id = $1 AND rsi.status = 'completed' AND rsi.issue_date >= $2 AND rsi.issue_date <= $3
                GROUP BY rsi.issue_date
                ORDER BY rsi.issue_date ASC
            `;
            const result = await client.query(query, [institutionId, fromDate, toDate]);
            return result.rows.map(r => ({
                date: r.date,
                quantity: parseFloat(r.quantity)
            }));
        } catch (error) {
            throw error;
        }
    },

    getCategoryStockSummary: async (institutionId, client = pool) => {
        try {
            const query = `
                WITH stock_cte AS (
                    SELECT
                        ri.category_id,
                        COALESCE(SUM(rst.quantity_in) - SUM(rst.quantity_out), 0) as current_stock,
                        ri.default_purchase_price
                    FROM ration_items ri
                    LEFT JOIN ration_stock_transactions rst ON ri.id = rst.item_id AND rst.institution_id = ri.institution_id
                    WHERE ri.institution_id = $1
                    GROUP BY ri.id
                )
                SELECT
                    rc.id as category_id,
                    rc.category_name,
                    COUNT(s.category_id)::integer as total_items,
                    COALESCE(SUM(s.current_stock), 0)::numeric as total_quantity,
                    COALESCE(SUM(s.current_stock * s.default_purchase_price), 0)::numeric as stock_value
                FROM ration_item_categories rc
                LEFT JOIN stock_cte s ON rc.id = s.category_id
                WHERE rc.institution_id = $1
                GROUP BY rc.id, rc.category_name
                ORDER BY stock_value DESC
            `;
            const result = await client.query(query, [institutionId]);
            return result.rows.map(r => ({
                category_id: r.category_id,
                category_name: r.category_name,
                total_items: r.total_items,
                total_quantity: parseFloat(r.total_quantity),
                stock_value: parseFloat(r.stock_value)
            }));
        } catch (error) {
            throw error;
        }
    },

    getLowStockItems: async (institutionId, limit, offset, client = pool) => {
        try {
            let query = `
                WITH stock_cte AS (
                    SELECT
                        ri.id as item_id,
                        ri.item_name,
                        ri.item_code,
                        ri.sku_id,
                        ri.barcode,
                        ri.category_id,
                        ric.category_name,
                        ri.unit_id,
                        ru.unit_code,
                        ri.minimum_stock,
                        ri.reorder_quantity,
                        COALESCE(SUM(rst.quantity_in) - SUM(rst.quantity_out), 0) as current_stock
                    FROM ration_items ri
                    LEFT JOIN ration_item_categories ric ON ri.category_id = ric.id
                    LEFT JOIN ration_units ru ON ri.unit_id = ru.id
                    LEFT JOIN ration_stock_transactions rst ON ri.id = rst.item_id AND rst.institution_id = ri.institution_id
                    WHERE ri.institution_id = $1 AND ri.status = 'active'
                    GROUP BY ri.id, ric.id, ru.id
                )
                SELECT
                    *,
                    (minimum_stock - current_stock)::numeric as shortage_quantity,
                    CASE
                        WHEN current_stock <= 0 THEN 'out_of_stock'
                        ELSE 'low_stock'
                    END as stock_status
                FROM stock_cte
                WHERE current_stock <= minimum_stock
                ORDER BY shortage_quantity DESC, item_id ASC
            `;

            const values = [institutionId];
            if (limit !== undefined && offset !== undefined) {
                query += ` LIMIT $2 OFFSET $3`;
                values.push(limit, offset);
            }

            const result = await client.query(query, values);
            return result.rows.map(r => ({
                item_id: r.item_id,
                item_name: r.item_name,
                item_code: r.item_code,
                sku_id: r.sku_id,
                barcode: r.barcode,
                category_name: r.category_name,
                unit_code: r.unit_code,
                current_stock: parseFloat(r.current_stock),
                minimum_stock: parseFloat(r.minimum_stock),
                reorder_quantity: parseFloat(r.reorder_quantity),
                shortage_quantity: parseFloat(r.shortage_quantity),
                stock_status: r.stock_status
            }));
        } catch (error) {
            throw error;
        }
    },

    getLowStockCount: async (institutionId, client = pool) => {
        try {
            const query = `
                WITH stock_cte AS (
                    SELECT
                        ri.id,
                        ri.minimum_stock,
                        COALESCE(SUM(rst.quantity_in) - SUM(rst.quantity_out), 0) as current_stock
                    FROM ration_items ri
                    LEFT JOIN ration_stock_transactions rst ON ri.id = rst.item_id AND rst.institution_id = ri.institution_id
                    WHERE ri.institution_id = $1 AND ri.status = 'active'
                    GROUP BY ri.id
                )
                SELECT COUNT(*)::integer as count FROM stock_cte WHERE current_stock <= minimum_stock
            `;
            const result = await client.query(query, [institutionId]);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getExpiryAlerts: async (institutionId, limit, offset, expiryDays = 30, client = pool) => {
        try {
            let query = `
                SELECT
                    rib.item_id,
                    ri.item_name,
                    rib.id as batch_id,
                    rib.batch_number,
                    rib.expiry_date::text,
                    rib.remaining_quantity::numeric,
                    (rib.expiry_date - CURRENT_DATE)::integer as days_remaining,
                    CASE
                        WHEN rib.expiry_date < CURRENT_DATE THEN 'expired'
                        WHEN rib.expiry_date = CURRENT_DATE THEN 'expires_today'
                        WHEN rib.expiry_date - CURRENT_DATE <= 7 THEN 'critical'
                        ELSE 'warning'
                    END as expiry_status
                FROM ration_item_batches rib
                INNER JOIN ration_items ri ON rib.item_id = ri.id
                WHERE rib.institution_id = $1
                  AND rib.remaining_quantity > 0
                  AND (rib.expiry_date < CURRENT_DATE OR rib.expiry_date - CURRENT_DATE <= $2)
                ORDER BY rib.expiry_date ASC
            `;

            const values = [institutionId, expiryDays];
            if (limit !== undefined && offset !== undefined) {
                query += ` LIMIT $3 OFFSET $4`;
                values.push(limit, offset);
            }

            const result = await client.query(query, values);
            return result.rows.map(r => ({
                item_id: r.item_id,
                item_name: r.item_name,
                batch_id: r.batch_id,
                batch_number: r.batch_number,
                expiry_date: r.expiry_date,
                remaining_quantity: parseFloat(r.remaining_quantity),
                days_remaining: r.days_remaining,
                expiry_status: r.expiry_status
            }));
        } catch (error) {
            throw error;
        }
    },

    getExpiryAlertsCount: async (institutionId, expiryDays = 30, client = pool) => {
        try {
            const query = `
                SELECT COUNT(*)::integer as count
                FROM ration_item_batches
                WHERE institution_id = $1
                  AND remaining_quantity > 0
                  AND (expiry_date < CURRENT_DATE OR expiry_date - CURRENT_DATE <= $2)
            `;
            const result = await client.query(query, [institutionId, expiryDays]);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getRecentTransactions: async (institutionId, limit, offset, client = pool) => {
        try {
            let query = `
                SELECT
                    rst.created_at::text as transaction_date,
                    rst.transaction_type,
                    rst.reference_type,
                    rst.reference_number,
                    ri.item_name,
                    rst.batch_number,
                    rst.quantity_in::numeric,
                    rst.quantity_out::numeric,
                    uc.email as performed_by
                FROM ration_stock_transactions rst
                INNER JOIN ration_items ri ON rst.item_id = ri.id
                LEFT JOIN user_credentials uc ON rst.created_by = uc.id
                WHERE rst.institution_id = $1
                ORDER BY rst.id DESC
            `;

            const values = [institutionId];
            if (limit !== undefined && offset !== undefined) {
                query += ` LIMIT $2 OFFSET $3`;
                values.push(limit, offset);
            }

            const result = await client.query(query, values);
            return result.rows.map(r => ({
                transaction_date: r.transaction_date,
                transaction_type: r.transaction_type,
                reference_type: r.reference_type,
                reference_number: r.reference_number,
                item_name: r.item_name,
                batch_number: r.batch_number,
                quantity_in: parseFloat(r.quantity_in),
                quantity_out: parseFloat(r.quantity_out),
                performed_by: r.performed_by
            }));
        } catch (error) {
            throw error;
        }
    },

    getRecentTransactionsCount: async (institutionId, client = pool) => {
        try {
            const query = `
                SELECT COUNT(*)::integer as count
                FROM ration_stock_transactions
                WHERE institution_id = $1
            `;
            const result = await client.query(query, [institutionId]);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getTopPurchasedItems: async (institutionId, fromDate, toDate, client = pool) => {
        try {
            const query = `
                SELECT
                    ri.id as item_id,
                    ri.item_name,
                    COALESCE(SUM(rpi.quantity), 0)::numeric as total_qty,
                    COALESCE(SUM(rpi.line_total), 0)::numeric as total_spent
                FROM ration_purchase_items rpi
                INNER JOIN ration_purchases rp ON rpi.purchase_id = rp.id
                INNER JOIN ration_items ri ON rpi.item_id = ri.id
                WHERE rp.institution_id = $1 AND rp.status = 'completed'
                  AND rp.purchase_date >= $2 AND rp.purchase_date <= $3
                GROUP BY ri.id, ri.item_name
                ORDER BY total_spent DESC
                LIMIT 5
            `;
            const result = await client.query(query, [institutionId, fromDate, toDate]);
            return result.rows.map(r => ({
                item_id: r.item_id,
                item_name: r.item_name,
                total_qty: parseFloat(r.total_qty),
                total_spent: parseFloat(r.total_spent)
            }));
        } catch (error) {
            throw error;
        }
    },

    getTopIssuedItems: async (institutionId, fromDate, toDate, client = pool) => {
        try {
            const query = `
                SELECT
                    ri.id as item_id,
                    ri.item_name,
                    COALESCE(SUM(rsii.issue_quantity), 0)::numeric as total_qty,
                    COALESCE(SUM(rsii.issue_quantity * rsii.unit_price), 0)::numeric as total_value
                FROM ration_stock_issue_items rsii
                INNER JOIN ration_stock_issues rsi ON rsii.stock_issue_id = rsi.id
                INNER JOIN ration_items ri ON rsii.item_id = ri.id
                WHERE rsi.institution_id = $1 AND rsi.status = 'completed'
                  AND rsi.issue_date >= $2 AND rsi.issue_date <= $3
                GROUP BY ri.id, ri.item_name
                ORDER BY total_qty DESC
                LIMIT 5
            `;
            const result = await client.query(query, [institutionId, fromDate, toDate]);
            return result.rows.map(r => ({
                item_id: r.item_id,
                item_name: r.item_name,
                total_qty: parseFloat(r.total_qty),
                total_value: parseFloat(r.total_value)
            }));
        } catch (error) {
            throw error;
        }
    },

    getSupplierPurchaseSummary: async (institutionId, fromDate, toDate, client = pool) => {
        try {
            const query = `
                SELECT
                    rs.id as supplier_id,
                    rs.supplier_name,
                    COUNT(rp.id)::integer as purchases_count,
                    COALESCE(SUM(rp.grand_total), 0)::numeric as total_value
                FROM ration_purchases rp
                INNER JOIN ration_suppliers rs ON rp.supplier_id = rs.id
                WHERE rp.institution_id = $1 AND rp.status = 'completed'
                  AND rp.purchase_date >= $2 AND rp.purchase_date <= $3
                GROUP BY rs.id, rs.supplier_name
                ORDER BY total_value DESC
            `;
            const result = await client.query(query, [institutionId, fromDate, toDate]);
            return result.rows.map(r => ({
                supplier_id: r.supplier_id,
                supplier_name: r.supplier_name,
                purchases_count: r.purchases_count,
                total_value: parseFloat(r.total_value)
            }));
        } catch (error) {
            throw error;
        }
    },

    getPendingKitchenRequests: async (institutionId, client = pool) => {
        try {
            const query = `
                SELECT id, request_number, remarks, created_at::text as created_at
                FROM ration_kitchen_requests
                WHERE institution_id = $1 AND status = 'pending'
                ORDER BY id DESC
            `;
            const result = await client.query(query, [institutionId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },

    getApprovedWaitingIssues: async (institutionId, client = pool) => {
        try {
            const query = `
                SELECT id, request_number, remarks, created_at::text as created_at, status
                FROM ration_kitchen_requests
                WHERE institution_id = $1 AND status IN ('approved', 'partially_issued')
                ORDER BY id DESC
            `;
            const result = await client.query(query, [institutionId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },

    getPendingStockAudits: async (institutionId, client = pool) => {
        try {
            const query = `
                SELECT id, audit_number, audit_name, created_at::text as created_at
                FROM ration_stock_audits
                WHERE institution_id = $1 AND status = 'pending'
                ORDER BY id DESC
            `;
            const result = await client.query(query, [institutionId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = RationInventoryDashboardModel;
