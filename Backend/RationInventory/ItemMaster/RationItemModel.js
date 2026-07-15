const pool = require("../../Config/Database");

const RationItemModel = {
    createRationItem: async (
        institutionId,
        pgAdminId,
        itemName,
        itemCode,
        skuId,
        barcode,
        categoryId,
        unitId,
        description,
        imageUrl,
        minimumStock,
        maximumStock,
        reorderQuantity,
        defaultPurchasePrice,
        gstPercentage,
        batchTracking,
        expiryTracking,
        status,
        createdBy,
        client = pool
    ) => {
        try {
            const query = `
                INSERT INTO ration_items (
                    institution_id,
                    pg_admin_id,
                    item_name,
                    item_code,
                    sku_id,
                    barcode,
                    category_id,
                    unit_id,
                    description,
                    image_url,
                    minimum_stock,
                    maximum_stock,
                    reorder_quantity,
                    default_purchase_price,
                    gst_percentage,
                    batch_tracking,
                    expiry_tracking,
                    status,
                    created_by
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19
                )
                RETURNING
                    id,
                    institution_id,
                    pg_admin_id,
                    item_name,
                    item_code,
                    sku_id,
                    barcode,
                    category_id,
                    unit_id,
                    description,
                    image_url,
                    minimum_stock,
                    maximum_stock,
                    reorder_quantity,
                    default_purchase_price,
                    gst_percentage,
                    batch_tracking,
                    expiry_tracking,
                    status,
                    created_by,
                    created_at,
                    updated_at
            `;

            const values = [
                institutionId,
                pgAdminId || null,
                itemName,
                itemCode,
                skuId || null,
                barcode,
                categoryId,
                unitId,
                description || null,
                imageUrl || null,
                minimumStock !== undefined ? minimumStock : 0,
                maximumStock !== undefined ? maximumStock : null,
                reorderQuantity !== undefined ? reorderQuantity : null,
                defaultPurchasePrice !== undefined ? defaultPurchasePrice : 0,
                gstPercentage !== undefined ? gstPercentage : 0,
                batchTracking !== undefined ? batchTracking : false,
                expiryTracking !== undefined ? expiryTracking : false,
                status || "active",
                createdBy || null,
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    getRationItemList: async (
        institutionId,
        limit,
        offset,
        search = "",
        categoryId = null,
        unitId = null,
        status = ""
    ) => {
        try {
            let query = `
                SELECT
                    ri.id,
                    ri.institution_id,
                    ri.pg_admin_id,
                    ri.item_name,
                    ri.item_code,
                    ri.sku_id,
                    ri.barcode,
                    ri.category_id,
                    ric.category_name,
                    ric.category_code,
                    ri.unit_id,
                    ru.unit_name,
                    ru.unit_code,
                    ri.description,
                    ri.image_url,
                    ri.minimum_stock,
                    ri.maximum_stock,
                    ri.reorder_quantity,
                    ri.default_purchase_price,
                    ri.gst_percentage,
                    ri.batch_tracking,
                    ri.expiry_tracking,
                    ri.status,
                    ri.created_by,
                    ri.updated_by,
                    ri.created_at,
                    ri.updated_at
                FROM ration_items ri
                INNER JOIN ration_item_categories ric ON ri.category_id = ric.id
                INNER JOIN ration_units ru ON ri.unit_id = ru.id
                WHERE ri.institution_id = $1
            `;

            const values = [institutionId];
            let paramIndex = 2;

            if (search) {
                query += `
                    AND (
                        ri.item_name ILIKE $${paramIndex} OR
                        ri.item_code ILIKE $${paramIndex} OR
                        ri.sku_id ILIKE $${paramIndex} OR
                        ri.barcode ILIKE $${paramIndex} OR
                        ric.category_name ILIKE $${paramIndex} OR
                        ric.category_code ILIKE $${paramIndex} OR
                        ru.unit_name ILIKE $${paramIndex} OR
                        ru.unit_code ILIKE $${paramIndex} OR
                        ri.description ILIKE $${paramIndex} OR
                        ri.status ILIKE $${paramIndex}
                    )
                `;
                values.push(`%${search}%`);
                paramIndex++;
            }

            if (categoryId) {
                query += ` AND ri.category_id = $${paramIndex}`;
                values.push(categoryId);
                paramIndex++;
            }

            if (unitId) {
                query += ` AND ri.unit_id = $${paramIndex}`;
                values.push(unitId);
                paramIndex++;
            }

            if (status) {
                query += ` AND ri.status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            query += ` ORDER BY ri.id DESC`;

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

    getRationItemCount: async (
        institutionId,
        search = "",
        categoryId = null,
        unitId = null,
        status = ""
    ) => {
        try {
            let query = `
                SELECT COUNT(*)::integer as count
                FROM ration_items ri
                INNER JOIN ration_item_categories ric ON ri.category_id = ric.id
                INNER JOIN ration_units ru ON ri.unit_id = ru.id
                WHERE ri.institution_id = $1
            `;

            const values = [institutionId];
            let paramIndex = 2;

            if (search) {
                query += `
                    AND (
                        ri.item_name ILIKE $${paramIndex} OR
                        ri.item_code ILIKE $${paramIndex} OR
                        ri.sku_id ILIKE $${paramIndex} OR
                        ri.barcode ILIKE $${paramIndex} OR
                        ric.category_name ILIKE $${paramIndex} OR
                        ric.category_code ILIKE $${paramIndex} OR
                        ru.unit_name ILIKE $${paramIndex} OR
                        ru.unit_code ILIKE $${paramIndex} OR
                        ri.description ILIKE $${paramIndex} OR
                        ri.status ILIKE $${paramIndex}
                    )
                `;
                values.push(`%${search}%`);
                paramIndex++;
            }

            if (categoryId) {
                query += ` AND ri.category_id = $${paramIndex}`;
                values.push(categoryId);
                paramIndex++;
            }

            if (unitId) {
                query += ` AND ri.unit_id = $${paramIndex}`;
                values.push(unitId);
                paramIndex++;
            }

            if (status) {
                query += ` AND ri.status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            const result = await pool.query(query, values);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getRationItemById: async (id, institutionId) => {
        try {
            const query = `
                SELECT
                    ri.id,
                    ri.institution_id,
                    ri.pg_admin_id,
                    ri.item_name,
                    ri.item_code,
                    ri.sku_id,
                    ri.barcode,
                    ri.category_id,
                    ric.category_name,
                    ric.category_code,
                    ri.unit_id,
                    ru.unit_name,
                    ru.unit_code,
                    ri.description,
                    ri.image_url,
                    ri.minimum_stock,
                    ri.maximum_stock,
                    ri.reorder_quantity,
                    ri.default_purchase_price,
                    ri.gst_percentage,
                    ri.batch_tracking,
                    ri.expiry_tracking,
                    ri.status,
                    ri.created_by,
                    ri.updated_by,
                    ri.created_at,
                    ri.updated_at
                FROM ration_items ri
                INNER JOIN ration_item_categories ric ON ri.category_id = ric.id
                INNER JOIN ration_units ru ON ri.unit_id = ru.id
                WHERE ri.id = $1
                AND ri.institution_id = $2
            `;

            const values = [id, institutionId];
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findRationItemByName: async (itemName, institutionId) => {
        try {
            const query = `
                SELECT id, institution_id, item_name
                FROM ration_items
                WHERE LOWER(item_name) = LOWER($1)
                AND institution_id = $2
            `;
            const result = await pool.query(query, [itemName, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findRationItemByCode: async (itemCode, institutionId) => {
        try {
            const query = `
                SELECT id, institution_id, item_code
                FROM ration_items
                WHERE LOWER(item_code) = LOWER($1)
                AND institution_id = $2
            `;
            const result = await pool.query(query, [itemCode, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findRationItemByBarcode: async (barcode, institutionId) => {
        try {
            const query = `
                SELECT id, institution_id, barcode
                FROM ration_items
                WHERE LOWER(barcode) = LOWER($1)
                AND institution_id = $2
            `;
            const result = await pool.query(query, [barcode, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findRationItemBySkuId: async (skuId, institutionId) => {
        try {
            const query = `
                SELECT id, institution_id, sku_id
                FROM ration_items
                WHERE LOWER(sku_id) = LOWER($1)
                AND institution_id = $2
            `;
            const result = await pool.query(query, [skuId, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    updateRationItem: async (
        id,
        institutionId,
        itemName,
        itemCode,
        barcode,
        categoryId,
        unitId,
        description,
        imageUrl,
        minimumStock,
        maximumStock,
        reorderQuantity,
        defaultPurchasePrice,
        gstPercentage,
        batchTracking,
        expiryTracking,
        status,
        updatedBy
    ) => {
        try {
            const query = `
                UPDATE ration_items
                SET
                    item_name = $1,
                    item_code = $2,
                    barcode = $3,
                    category_id = $4,
                    unit_id = $5,
                    description = $6,
                    image_url = $7,
                    minimum_stock = $8,
                    maximum_stock = $9,
                    reorder_quantity = $10,
                    default_purchase_price = $11,
                    gst_percentage = $12,
                    batch_tracking = $13,
                    expiry_tracking = $14,
                    status = $15,
                    updated_by = $16,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $17
                AND institution_id = $18
                RETURNING
                    id,
                    institution_id,
                    pg_admin_id,
                    item_name,
                    item_code,
                    sku_id,
                    barcode,
                    category_id,
                    unit_id,
                    description,
                    image_url,
                    minimum_stock,
                    maximum_stock,
                    reorder_quantity,
                    default_purchase_price,
                    gst_percentage,
                    batch_tracking,
                    expiry_tracking,
                    status,
                    created_by,
                    updated_by,
                    created_at,
                    updated_at
            `;

            const values = [
                itemName,
                itemCode,
                barcode,
                categoryId,
                unitId,
                description || null,
                imageUrl || null,
                minimumStock !== undefined ? minimumStock : 0,
                maximumStock !== undefined ? maximumStock : null,
                reorderQuantity !== undefined ? reorderQuantity : null,
                defaultPurchasePrice !== undefined ? defaultPurchasePrice : 0,
                gstPercentage !== undefined ? gstPercentage : 0,
                batchTracking !== undefined ? batchTracking : false,
                expiryTracking !== undefined ? expiryTracking : false,
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

    deleteRationItem: async (id, institutionId) => {
        try {
            const query = `
                DELETE FROM ration_items
                WHERE id = $1
                AND institution_id = $2
                RETURNING id, institution_id, item_name, item_code, barcode
            `;
            const result = await pool.query(query, [id, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    getNextBarcode: async (institutionId) => {
        try {
            const query = `
                SELECT barcode FROM ration_items
                WHERE institution_id = $1
                AND barcode ~ '^RAT\\d+$'
                ORDER BY barcode DESC
                LIMIT 1
            `;
            const result = await pool.query(query, [institutionId]);
            if (result.rows.length === 0) {
                return "RAT000001";
            }
            const lastBarcode = result.rows[0].barcode;
            const numberPart = parseInt(lastBarcode.substring(3), 10);
            const nextNumber = numberPart + 1;
            const formattedNumber = String(nextNumber).padStart(6, "0");
            return `RAT${formattedNumber}`;
        } catch (error) {
            throw error;
        }
    },

    getRationItemByBarcode: async (barcode, institutionId) => {
        try {
            const query = `
                SELECT
                    ri.id,
                    ri.institution_id,
                    ri.pg_admin_id,
                    ri.item_name,
                    ri.item_code,
                    ri.sku_id,
                    ri.barcode,
                    ri.category_id,
                    ric.category_name,
                    ric.category_code,
                    ri.unit_id,
                    ru.unit_name,
                    ru.unit_code,
                    ri.description,
                    ri.image_url,
                    ri.minimum_stock,
                    ri.maximum_stock,
                    ri.reorder_quantity,
                    ri.default_purchase_price,
                    ri.gst_percentage,
                    ri.batch_tracking,
                    ri.expiry_tracking,
                    ri.status,
                    ri.created_by,
                    ri.updated_by,
                    ri.created_at,
                    ri.updated_at
                FROM ration_items ri
                INNER JOIN ration_item_categories ric ON ri.category_id = ric.id
                INNER JOIN ration_units ru ON ri.unit_id = ru.id
                WHERE ri.barcode = $1
                AND ri.institution_id = $2
            `;
            const result = await pool.query(query, [barcode, institutionId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    getNextSkuId: async (institutionId, client = pool) => {
        try {
            const query = `
                INSERT INTO ration_sku_sequences (
                    institution_id,
                    last_number,
                    updated_at
                )
                VALUES ($1, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (institution_id)
                DO UPDATE SET
                    last_number = ration_sku_sequences.last_number + 1,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING last_number;
            `;
            const result = await client.query(query, [institutionId]);
            const lastNumber = result.rows[0].last_number;
            return `SKU${String(lastNumber).padStart(6, "0")}`;
        } catch (error) {
            throw error;
        }
    },
};

module.exports = RationItemModel;
