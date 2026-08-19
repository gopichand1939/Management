const pool = require("../Config/Database");

const CatalogItemModel = {
    createItem: async (institutionId, pgAdminId, itemData, createdBy) => {
        try {
            const query = `
                INSERT INTO catalog_items (
                    institution_id, pg_admin_id, clover_id, name, alternate_name,
                    description, price, price_type, price_unit, cost,
                    product_code, sku, quantity, is_hidden, default_tax_rates,
                    is_non_revenue_item, printer_labels, modifier_groups,
                    category_id, unit_id, tax_rates, variant_attribute,
                    variant_option, status, created_by, barcode
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                    $21, $22, $23, $24, $25, $26
                )
                RETURNING *
            `;

            const values = [
                institutionId,
                pgAdminId || null,
                itemData.clover_id || null,
                itemData.name,
                itemData.alternate_name || null,
                itemData.description || null,
                itemData.price !== undefined ? parseFloat(itemData.price) : 0,
                itemData.price_type || "Fixed",
                itemData.price_unit || null,
                itemData.cost !== undefined ? parseFloat(itemData.cost) : 0,
                itemData.product_code || null,
                itemData.sku || null,
                itemData.quantity !== undefined ? parseInt(itemData.quantity) : 0,
                itemData.is_hidden || "No",
                itemData.default_tax_rates || "Yes",
                itemData.is_non_revenue_item || "No",
                itemData.printer_labels || null,
                itemData.modifier_groups || null,
                itemData.category_id || null,
                itemData.unit_id || null,
                itemData.tax_rates || null,
                itemData.variant_attribute || null,
                itemData.variant_option || null,
                itemData.status || "active",
                createdBy || null,
                itemData.barcode || null,
            ];

            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    getItemList: async (institutionId, limit, offset, search = "", categoryId = null, status = "") => {
        try {
            let query = `
                SELECT
                    ci.*,
                    cc.category_name,
                    cc.category_code,
                    ru.unit_name,
                    ru.unit_code
                FROM catalog_items ci
                LEFT JOIN catalog_categories cc ON ci.category_id = cc.id
                LEFT JOIN ration_units ru ON ci.unit_id = ru.id
                WHERE ci.institution_id = $1
            `;

            const values = [institutionId];
            let paramIdx = 2;

            if (search) {
                query += ` AND (LOWER(ci.name) LIKE LOWER($${paramIdx}) OR LOWER(ci.sku) LIKE LOWER($${paramIdx}) OR LOWER(ci.product_code) LIKE LOWER($${paramIdx}))`;
                values.push(`%${search}%`);
                paramIdx++;
            }

            if (categoryId) {
                query += ` AND ci.category_id = $${paramIdx}`;
                values.push(categoryId);
                paramIdx++;
            }

            if (status) {
                query += ` AND ci.status = $${paramIdx}`;
                values.push(status);
                paramIdx++;
            }

            query += ` ORDER BY ci.id DESC`;

            if (limit !== undefined && offset !== undefined) {
                query += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
                values.push(limit, offset);
            }

            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },

    getItemCount: async (institutionId, search = "", categoryId = null, status = "") => {
        try {
            let query = `
                SELECT COUNT(*)::integer as count
                FROM catalog_items ci
                WHERE ci.institution_id = $1
            `;

            const values = [institutionId];
            let paramIdx = 2;

            if (search) {
                query += ` AND (LOWER(ci.name) LIKE LOWER($${paramIdx}) OR LOWER(ci.sku) LIKE LOWER($${paramIdx}) OR LOWER(ci.product_code) LIKE LOWER($${paramIdx}))`;
                values.push(`%${search}%`);
                paramIdx++;
            }

            if (categoryId) {
                query += ` AND ci.category_id = $${paramIdx}`;
                values.push(categoryId);
                paramIdx++;
            }

            if (status) {
                query += ` AND ci.status = $${paramIdx}`;
                values.push(status);
                paramIdx++;
            }

            const result = await pool.query(query, values);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getItemById: async (id, institutionId = null) => {
        try {
            let query = `
                SELECT
                    ci.*,
                    cc.category_name,
                    cc.category_code,
                    ru.unit_name,
                    ru.unit_code
                FROM catalog_items ci
                LEFT JOIN catalog_categories cc ON ci.category_id = cc.id
                LEFT JOIN ration_units ru ON ci.unit_id = ru.id
                WHERE ci.id = $1
            `;
            const values = [id];
            if (institutionId) {
                query += ` AND ci.institution_id = $2`;
                values.push(institutionId);
            }
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findItemBySku: async (sku, institutionId) => {
        try {
            const query = `
                SELECT id, name, sku
                FROM catalog_items
                WHERE LOWER(sku) = LOWER($1) AND institution_id = $2
            `;
            const result = await pool.query(query, [sku, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findItemByProductCode: async (productCode, institutionId) => {
        try {
            const query = `
                SELECT id, name, product_code
                FROM catalog_items
                WHERE LOWER(product_code) = LOWER($1) AND institution_id = $2
            `;
            const result = await pool.query(query, [productCode, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    updateItem: async (id, institutionId, itemData, updatedBy) => {
        try {
            const query = `
                UPDATE catalog_items
                SET
                    clover_id = $1, name = $2, alternate_name = $3, description = $4,
                    price = $5, price_type = $6, price_unit = $7, cost = $8,
                    product_code = $9, sku = $10, quantity = $11, is_hidden = $12,
                    default_tax_rates = $13, is_non_revenue_item = $14,
                    printer_labels = $15, modifier_groups = $16, category_id = $17,
                    unit_id = $18, tax_rates = $19, variant_attribute = $20,
                    variant_option = $21, status = $22, updated_by = $23,
                    barcode = $24, updated_at = CURRENT_TIMESTAMP
                WHERE id = $25 AND institution_id = $26
                RETURNING *
            `;

            const values = [
                itemData.clover_id || null,
                itemData.name,
                itemData.alternate_name || null,
                itemData.description || null,
                itemData.price !== undefined ? parseFloat(itemData.price) : 0,
                itemData.price_type || "Fixed",
                itemData.price_unit || null,
                itemData.cost !== undefined ? parseFloat(itemData.cost) : 0,
                itemData.product_code || null,
                itemData.sku || null,
                itemData.quantity !== undefined ? parseInt(itemData.quantity) : 0,
                itemData.is_hidden || "No",
                itemData.default_tax_rates || "Yes",
                itemData.is_non_revenue_item || "No",
                itemData.printer_labels || null,
                itemData.modifier_groups || null,
                itemData.category_id || null,
                itemData.unit_id || null,
                itemData.tax_rates || null,
                itemData.variant_attribute || null,
                itemData.variant_option || null,
                itemData.status || "active",
                updatedBy || null,
                itemData.barcode || null,
                id,
                institutionId,
            ];

            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    deleteItem: async (id, institutionId) => {
        try {
            const query = `
                DELETE FROM catalog_items
                WHERE id = $1 AND institution_id = $2
                RETURNING id, name, sku
            `;
            const result = await pool.query(query, [id, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    // Scan for existing SKUs in this institution matching prefix pattern to determine the next sequential number
    getExistingSkusByPattern: async (institutionId, pattern) => {
        try {
            const query = `
                SELECT sku
                FROM catalog_items
                WHERE institution_id = $1 AND sku LIKE $2
            `;
            const result = await pool.query(query, [institutionId, pattern + "%"]);
            return result.rows.map(row => row.sku);
        } catch (error) {
            throw error;
        }
    },
};

module.exports = CatalogItemModel;
