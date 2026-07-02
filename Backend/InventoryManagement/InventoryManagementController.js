const {
    createInventory,
    deleteInventoryById,
    findInventoryById,
    findInventoryLocation,
    getInventoryList,
    updateInventory,
} = require("./InventoryManagementModal");
const pool = require("../Config/Database");

const isPgAdminRequest = (req) => {
    return req.user?.role === "pg_admin";
};

const normalizeInteger = (value) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const normalizedValue = Number(value);

    return Number.isInteger(normalizedValue) ? normalizedValue : null;
};

const normalizeNumber = (value) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const normalizedValue = Number(value);

    return Number.isFinite(normalizedValue) ? normalizedValue : null;
};

const normalizeText = (value) => {
    if (typeof value !== "string") {
        return value || null;
    }

    const normalizedValue = value.trim();

    return normalizedValue || null;
};

const buildUploadedFileObject = (file) => {
    if (!file) {
        return null;
    }

    return {
        file_name: file.filename,
        original_name: file.originalname,
        file_url: file.cloudinaryUrl || `/uploads/inventory/${file.filename}`,
        mime_type: file.mimetype,
        uploaded_at: new Date().toISOString(),
        size: file.size,
    };
};

const normalizeInventoryPayload = (req) => {
    const { body } = req;

    return {
        institution_id: isPgAdminRequest(req)
            ? normalizeInteger(req.pgAdmin.institution_id)
            : normalizeInteger(body.institution_id),
        item_name: normalizeText(body.item_name),
        category: normalizeText(body.category),
        floor_id: normalizeInteger(body.floor_id),
        floor_label: normalizeText(body.floor_label),
        room_no: normalizeText(body.room_no),
        quantity: normalizeInteger(body.quantity),
        purchase_date: normalizeText(body.purchase_date),
        purchase_price: normalizeNumber(body.purchase_price),
        supplier_name: normalizeText(body.supplier_name),
        condition: normalizeText(body.condition),
        item_photo: buildUploadedFileObject(req.file),
        status: normalizeText(body.status) || "active",
        remarks: normalizeText(body.remarks),
        created_by: normalizeInteger(body.created_by) || req.user?.id || null,
    };
};

const validateInventoryPayload = (data) => {
    if (!data.item_name) {
        return "Item name is required";
    }

    if (!data.category) {
        return "Category is required";
    }

    if (!data.institution_id) {
        return "Institution is required";
    }

    if (!data.room_no) {
        return "Room number is required";
    }

    if (data.quantity === null || data.quantity < 0) {
        return "Quantity is required";
    }

    if (!data.purchase_date) {
        return "Purchase date is required";
    }

    if (data.purchase_price === null || data.purchase_price < 0) {
        return "Purchase price is required";
    }

    if (!data.supplier_name) {
        return "Supplier name is required";
    }

    if (!data.condition) {
        return "Condition is required";
    }

    if (!data.status) {
        return "Status is required";
    }

    return null;
};

const validateInventoryAccess = (req, inventory) => {
    if (
        isPgAdminRequest(req) &&
        Number(inventory.institution_id) !== Number(req.pgAdmin.institution_id)
    ) {
        return false;
    }

    return true;
};

const validateInventoryLocation = async (data) => {
    if (!data.floor_id) {
        return {
            institution_id: data.institution_id,
            floor_id: null,
            room_number: data.room_no,
        };
    }

    return findInventoryLocation(
        data.institution_id,
        data.floor_id,
        data.room_no
    );
};

const getInventoryInstitutions = async (req, res) => {
    try {
        const values = [];
        const whereConditions = ["status = 'active'"];

        if (isPgAdminRequest(req)) {
            values.push(req.pgAdmin.institution_id);
            whereConditions.push(`id = $${values.length}`);
        }

        const result = await pool.query(`
            SELECT
                id,
                institution_name,
                institution_code
            FROM institutions
            WHERE ${whereConditions.join(" AND ")}
            ORDER BY institution_name ASC
        `, values);

        return res.status(200).json({
            success: true,
            message: "Institution list",
            data: result.rows,
        });
    } catch (error) {
        console.error("Error fetching institution list:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getInventoryFloors = async (req, res) => {
    try {
        const institutionId = isPgAdminRequest(req)
            ? normalizeInteger(req.pgAdmin.institution_id)
            : normalizeInteger(req.body.institution_id);

        if (!institutionId) {
            return res.status(400).json({
                success: false,
                message: "Institution id is required",
            });
        }

        const result = await pool.query(`
            SELECT
                id,
                institution_id,
                floor_name,
                floor_number
            FROM floors
            WHERE institution_id = $1
              AND status = 'active'
            ORDER BY floor_number ASC, id ASC
        `, [institutionId]);

        return res.status(200).json({
            success: true,
            message: "Floor list",
            data: result.rows,
        });
    } catch (error) {
        console.error("Error fetching floor list:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getInventoryRooms = async (req, res) => {
    try {
        const institutionId = isPgAdminRequest(req)
            ? normalizeInteger(req.pgAdmin.institution_id)
            : normalizeInteger(req.body.institution_id);
        const floorId = normalizeInteger(req.body.floor_id);

        if (!institutionId || !floorId) {
            return res.status(400).json({
                success: false,
                message: "Institution id and floor id are required",
            });
        }

        const result = await pool.query(`
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
        `, [
            institutionId,
            floorId,
        ]);

        return res.status(200).json({
            success: true,
            message: "Room list",
            data: result.rows,
        });
    } catch (error) {
        console.error("Error fetching room list:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const addInventory = async (req, res) => {
    try {
        const data = normalizeInventoryPayload(req);
        const validationMessage = validateInventoryPayload(data);

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage,
            });
        }

        const location = await validateInventoryLocation(data);

        if (!location) {
            return res.status(400).json({
                success: false,
                message: "Selected institution, floor and room do not exist",
            });
        }

        const inventory = await createInventory(data);

        return res.status(201).json({
            success: true,
            message: "Inventory created successfully",
            inventory,
        });
    } catch (error) {
        console.error("Inventory create failed:", error);

        if (error.code === "23505") {
            return res.status(400).json({
                success: false,
                message: "Inventory id already exists",
            });
        }

        if (error.code === "23503") {
            return res.status(400).json({
                success: false,
                message: "Selected institution or floor does not exist",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Inventory create failed",
        });
    }
};

const listInventory = async (req, res) => {
    try {
        const inventories = await getInventoryList(
            isPgAdminRequest(req) ? req.pgAdmin.institution_id : null
        );

        return res.status(200).json({
            success: true,
            message: "Inventory list fetched successfully",
            inventories,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Inventory list failed",
        });
    }
};

const viewInventory = async (req, res) => {
    try {
        const id = normalizeInteger(req.body.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Inventory id is required",
            });
        }

        const inventory = await findInventoryById(id);

        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: "Inventory not found",
            });
        }

        if (!validateInventoryAccess(req, inventory)) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this inventory",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Inventory fetched successfully",
            inventory,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Inventory fetch failed",
        });
    }
};

const editInventory = async (req, res) => {
    try {
        const id = normalizeInteger(req.body.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Inventory id is required",
            });
        }

        const existingInventory = await findInventoryById(id);

        if (!existingInventory) {
            return res.status(404).json({
                success: false,
                message: "Inventory not found",
            });
        }

        if (!validateInventoryAccess(req, existingInventory)) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this inventory",
            });
        }

        const data = {
            ...normalizeInventoryPayload(req),
            id,
            item_photo: buildUploadedFileObject(req.file) || existingInventory.item_photo,
        };
        const validationMessage = validateInventoryPayload(data);

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage,
            });
        }

        const location = await validateInventoryLocation(data);

        if (!location) {
            return res.status(400).json({
                success: false,
                message: "Selected institution, floor and room do not exist",
            });
        }

        const inventory = await updateInventory(data);

        return res.status(200).json({
            success: true,
            message: "Inventory updated successfully",
            inventory,
        });
    } catch (error) {
        console.error("Inventory update failed:", error);

        if (error.code === "23503") {
            return res.status(400).json({
                success: false,
                message: "Selected institution or floor does not exist",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Inventory update failed",
        });
    }
};

const deleteInventory = async (req, res) => {
    try {
        const id = normalizeInteger(req.body.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Inventory id is required",
            });
        }

        const existingInventory = await findInventoryById(id);

        if (!existingInventory) {
            return res.status(404).json({
                success: false,
                message: "Inventory not found",
            });
        }

        if (!validateInventoryAccess(req, existingInventory)) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this inventory",
            });
        }

        const inventory = await deleteInventoryById(id);

        return res.status(200).json({
            success: true,
            message: "Inventory deleted successfully",
            inventory,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Inventory delete failed",
        });
    }
};

module.exports = {
    addInventory,
    deleteInventory,
    editInventory,
    getInventoryFloors,
    getInventoryInstitutions,
    getInventoryRooms,
    listInventory,
    viewInventory,
};
