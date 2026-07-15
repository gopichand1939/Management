const db = require("../Config/Database");
const pool = db;

const inventorySelectQuery = `
    SELECT
        inventory_management.*,
        institutions.institution_name,
        COALESCE(floors.floor_name, inventory_management.floor_label) AS floor_name
    FROM inventory_management
    INNER JOIN institutions
        ON institutions.id = inventory_management.institution_id
    LEFT JOIN floors
        ON floors.id = inventory_management.floor_id
`;

const mapInventoryValues = (data) => {
    return [
        data.institution_id,
        data.item_name,
        data.category,
        data.floor_id,
        data.floor_label,
        data.room_no,
        data.quantity,
        data.purchase_date,
        data.purchase_price,
        data.supplier_name,
        data.condition,
        JSON.stringify(data.item_photo || null),
        data.status,
        data.remarks || null,
        data.created_by || null,
    ];
};

const buildInventoryId = (id) => {
    return `INV-${String(id).padStart(5, "0")}`;
};

const createInventory = async (data) => {
    return await db.transaction(async (client) => {
        const createdInventoryResult = await client.query(`
            INSERT INTO inventory_management (
                institution_id,
                item_name,
                category,
                floor_id,
                floor_label,
                room_no,
                quantity,
                purchase_date,
                purchase_price,
                supplier_name,
                condition,
                item_photo,
                status,
                remarks,
                created_by
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12::jsonb, $13, $14, $15
            )
            RETURNING id
        `, mapInventoryValues(data));

        const createdInventoryId = createdInventoryResult.rows[0].id;
        const inventoryId = buildInventoryId(createdInventoryId);

        const inventoryResult = await client.query(`
            UPDATE inventory_management
            SET
                inventory_id = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [
            inventoryId,
            createdInventoryId,
        ]);

        return inventoryResult.rows[0];
    });
};

const getInventoryList = async (institutionId = null) => {
    const values = [];
    const whereConditions = ["inventory_management.is_deleted = FALSE"];

    if (institutionId) {
        values.push(institutionId);
        whereConditions.push(`inventory_management.institution_id = $${values.length}`);
    }

    const query = `
        ${inventorySelectQuery}
        WHERE ${whereConditions.join(" AND ")}
        ORDER BY inventory_management.id DESC
    `;

    const result = await pool.query(query, values);

    return result.rows;
};

const findInventoryById = async (id) => {
    const query = `
        ${inventorySelectQuery}
        WHERE inventory_management.id = $1
          AND inventory_management.is_deleted = FALSE
    `;

    const result = await pool.query(query, [id]);

    return result.rows[0];
};

const findInventoryInstitution = async (institutionId) => {
    const query = `
        SELECT
            id AS institution_id,
            institution_name
        FROM institutions
        WHERE id = $1
          AND status = 'active'
        LIMIT 1
    `;

    const result = await pool.query(query, [institutionId]);

    return result.rows[0];
};

const findInventoryFloor = async (institutionId, floorId) => {
    const query = `
        SELECT
            institutions.id AS institution_id,
            institutions.institution_name,
            floors.id AS floor_id,
            floors.floor_name
        FROM institutions
        INNER JOIN floors
            ON floors.institution_id = institutions.id
        WHERE institutions.id = $1
          AND floors.id = $2
          AND institutions.status = 'active'
          AND floors.status = 'active'
        LIMIT 1
    `;

    const result = await pool.query(query, [
        institutionId,
        floorId,
    ]);

    return result.rows[0];
};

const findInventoryLocation = async (institutionId, floorId, roomNo) => {
    const query = `
        SELECT
            institutions.id AS institution_id,
            institutions.institution_name,
            floors.id AS floor_id,
            floors.floor_name,
            rooms.id AS room_id,
            rooms.room_number
        FROM institutions
        INNER JOIN floors
            ON floors.institution_id = institutions.id
        LEFT JOIN rooms
            ON rooms.floor_id = floors.id
           AND rooms.institution_id = institutions.id
           AND LOWER(TRIM(rooms.room_number)) = LOWER(TRIM($3))
           AND rooms.status = 'active'
        WHERE institutions.id = $1
          AND floors.id = $2
          AND institutions.status = 'active'
          AND floors.status = 'active'
        LIMIT 1
    `;

    const result = await pool.query(query, [
        institutionId,
        floorId,
        roomNo,
    ]);

    return result.rows[0];
};

const updateInventory = async (data) => {
    const query = `
        UPDATE inventory_management
        SET
            institution_id = $1,
            item_name = $2,
            category = $3,
            floor_id = $4,
            floor_label = $5,
            room_no = $6,
            quantity = $7,
            purchase_date = $8,
            purchase_price = $9,
            supplier_name = $10,
            condition = $11,
            item_photo = $12::jsonb,
            status = $13,
            remarks = $14,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $15
          AND is_deleted = FALSE
        RETURNING *
    `;

    const values = [
        data.institution_id,
        data.item_name,
        data.category,
        data.floor_id,
        data.floor_label,
        data.room_no,
        data.quantity,
        data.purchase_date,
        data.purchase_price,
        data.supplier_name,
        data.condition,
        JSON.stringify(data.item_photo || null),
        data.status,
        data.remarks || null,
        data.id,
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const deleteInventoryById = async (id) => {
    const query = `
        UPDATE inventory_management
        SET
            is_deleted = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND is_deleted = FALSE
        RETURNING *
    `;

    const result = await pool.query(query, [id]);

    return result.rows[0];
};

const getInventoryInstitutions = async (institutionId = null) => {
    const values = [];
    const whereConditions = ["status = 'active'"];

    if (institutionId) {
        values.push(institutionId);
        whereConditions.push(`id = $${values.length}`);
    }

    const queryText = `
        SELECT
            id,
            institution_name,
            institution_code
        FROM institutions
        WHERE ${whereConditions.join(" AND ")}
        ORDER BY institution_name ASC
    `;

    const result = await db.query({
        name: "get-inventory-institutions",
        text: queryText,
        values
    });
    return result.rows;
};

const getInventoryFloors = async (institutionId) => {
    const queryText = `
        SELECT
            id,
            institution_id,
            floor_name,
            floor_number
        FROM floors
        WHERE institution_id = $1
          AND status = 'active'
        ORDER BY floor_number ASC, id ASC
    `;

    const result = await db.query({
        name: "get-inventory-floors",
        text: queryText,
        values: [institutionId]
    });
    return result.rows;
};

const getInventoryRooms = async (institutionId, floorId) => {
    const queryText = `
        SELECT
            id,
            institution_id,
            floor_id,
            room_number,
            room_type
        FROM rooms
        WHERE institution_id = $1
          AND floor_id = $2
          AND status = 'active'
        ORDER BY room_number ASC, id ASC
    `;

    const result = await db.query({
        name: "get-inventory-rooms",
        text: queryText,
        values: [institutionId, floorId]
    });
    return result.rows;
};

module.exports = {
    createInventory,
    deleteInventoryById,
    findInventoryById,
    findInventoryFloor,
    findInventoryInstitution,
    findInventoryLocation,
    getInventoryList,
    updateInventory,
    getInventoryInstitutions,
    getInventoryFloors,
    getInventoryRooms,
};
