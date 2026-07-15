const RationItemModel = require("./RationItemModel");
const RationCategoryModel = require("../CategoryMaster/RationCategoryModel");
const RationUnitModel = require("../UnitMaster/RationUnitModel");

const createRationItem = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const pgAdminId = req.user?.pg_admin_id;
    const createdBy = req.user?.id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const {
            item_name,
            item_code,
            barcode,
            category_id,
            unit_id,
            description,
            minimum_stock,
            maximum_stock,
            reorder_quantity,
            default_purchase_price,
            gst_percentage,
            batch_tracking,
            expiry_tracking,
            status = "active",
        } = req.body;

        // Required field validations
        if (!item_name || !item_name.trim()) {
            return res.status(400).json({ success: false, message: "Item name is required" });
        }
        if (!item_code || !item_code.trim()) {
            return res.status(400).json({ success: false, message: "Item code is required" });
        }
        if (!barcode || !barcode.trim()) {
            return res.status(400).json({ success: false, message: "Barcode is required" });
        }
        if (!category_id) {
            return res.status(400).json({ success: false, message: "Category ID is required" });
        }
        if (!unit_id) {
            return res.status(400).json({ success: false, message: "Unit ID is required" });
        }

        // Numeric parsing and range validation
        const catId = parseInt(category_id, 10);
        const utId = parseInt(unit_id, 10);
        const minStock = parseFloat(minimum_stock) || 0;
        const maxStock = maximum_stock ? parseFloat(maximum_stock) : null;
        const reorderQty = reorder_quantity ? parseFloat(reorder_quantity) : null;
        const purchasePrice = default_purchase_price ? parseFloat(default_purchase_price) : 0;
        const gstPct = gst_percentage ? parseFloat(gst_percentage) : 0;

        if (minStock < 0) {
            return res.status(400).json({ success: false, message: "Minimum stock cannot be negative" });
        }
        if (maxStock !== null && maxStock < 0) {
            return res.status(400).json({ success: false, message: "Maximum stock cannot be negative" });
        }
        if (reorderQty !== null && reorderQty < 0) {
            return res.status(400).json({ success: false, message: "Reorder quantity cannot be negative" });
        }
        if (purchasePrice < 0) {
            return res.status(400).json({ success: false, message: "Default purchase price cannot be negative" });
        }
        if (gstPct < 0 || gstPct > 100) {
            return res.status(400).json({ success: false, message: "GST percentage must be between 0 and 100" });
        }

        // Check if Category and Unit exist under same institution_id
        const category = await RationCategoryModel.getRationCategoryById(catId, institutionId);
        if (!category) {
            return res.status(400).json({
                success: false,
                message: "Selected category does not exist under your institution",
            });
        }

        const unit = await RationUnitModel.getRationUnitById(utId, institutionId);
        if (!unit) {
            return res.status(400).json({
                success: false,
                message: "Selected unit does not exist under your institution",
            });
        }

        // Uniqueness checks within the institution
        const dupName = await RationItemModel.findRationItemByName(item_name.trim(), institutionId);
        if (dupName) {
            return res.status(409).json({ success: false, message: "Item name already exists" });
        }

        const dupCode = await RationItemModel.findRationItemByCode(item_code.trim(), institutionId);
        if (dupCode) {
            return res.status(409).json({ success: false, message: "Item code already exists" });
        }

        const dupBarcode = await RationItemModel.findRationItemByBarcode(barcode.trim(), institutionId);
        if (dupBarcode) {
            return res.status(409).json({ success: false, message: "Barcode already exists" });
        }

        const isBatch = batch_tracking === "true" || batch_tracking === true;
        const isExpiry = expiry_tracking === "true" || expiry_tracking === true;

        const item = await RationItemModel.createRationItemTransaction(
            institutionId,
            pgAdminId,
            createdBy,
            {
                item_name,
                item_code,
                barcode,
                category_id: catId,
                unit_id: utId,
                description,
                minStock,
                maxStock,
                reorderQty,
                purchasePrice,
                gstPct,
                isBatch,
                isExpiry,
                status
            },
            req.file ? req.file.cloudinaryUrl : null
        );

        return res.status(201).json({
            success: true,
            message: "Ration item created successfully",
            data: item,
        });
    } catch (error) {
        console.error("Error creating ration item:", error);

        if (error.code === "23505") {
            if (error.detail && error.detail.includes("sku_id")) {
                return res.status(409).json({
                    success: false,
                    message: "Generated SKU ID already exists",
                });
            }
            if (error.detail && error.detail.includes("item_code")) {
                return res.status(409).json({
                    success: false,
                    message: "Item code already exists",
                });
            }
            if (error.detail && error.detail.includes("barcode")) {
                return res.status(409).json({
                    success: false,
                    message: "Barcode already exists",
                });
            }
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getRationItemList = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;
        const offset = (page - 1) * limit;

        const { search = "", category_id = null, unit_id = null, status = "" } = req.body;

        const items = await RationItemModel.getRationItemList(
            institutionId,
            limit,
            offset,
            search,
            category_id,
            unit_id,
            status
        );

        const totalCount = await RationItemModel.getRationItemCount(
            institutionId,
            search,
            category_id,
            unit_id,
            status
        );

        return res.status(200).json({
            success: true,
            message: "Ration item list fetched successfully",
            data: items,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching ration item list:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getRationItemById = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const id = req.body.id || req.params.id;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Item ID is required",
            });
        }

        const item = await RationItemModel.getRationItemById(id, institutionId);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Ration item not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Ration item fetched successfully",
            data: item,
        });
    } catch (error) {
        console.error("Error fetching ration item:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const updateRationItem = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const updatedBy = req.user?.id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const id = req.body.id || req.params.id;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Item ID is required",
            });
        }

        const {
            item_name,
            item_code,
            barcode,
            category_id,
            unit_id,
            description,
            minimum_stock,
            maximum_stock,
            reorder_quantity,
            default_purchase_price,
            gst_percentage,
            batch_tracking,
            expiry_tracking,
            status = "active",
        } = req.body;

        // Required fields
        if (!item_name || !item_name.trim()) {
            return res.status(400).json({ success: false, message: "Item name is required" });
        }
        if (!item_code || !item_code.trim()) {
            return res.status(400).json({ success: false, message: "Item code is required" });
        }
        if (!barcode || !barcode.trim()) {
            return res.status(400).json({ success: false, message: "Barcode is required" });
        }
        if (!category_id) {
            return res.status(400).json({ success: false, message: "Category ID is required" });
        }
        if (!unit_id) {
            return res.status(400).json({ success: false, message: "Unit ID is required" });
        }

        const catId = parseInt(category_id, 10);
        const utId = parseInt(unit_id, 10);
        const minStock = parseFloat(minimum_stock) || 0;
        const maxStock = maximum_stock ? parseFloat(maximum_stock) : null;
        const reorderQty = reorder_quantity ? parseFloat(reorder_quantity) : null;
        const purchasePrice = default_purchase_price ? parseFloat(default_purchase_price) : 0;
        const gstPct = gst_percentage ? parseFloat(gst_percentage) : 0;

        if (minStock < 0) {
            return res.status(400).json({ success: false, message: "Minimum stock cannot be negative" });
        }
        if (maxStock !== null && maxStock < 0) {
            return res.status(400).json({ success: false, message: "Maximum stock cannot be negative" });
        }
        if (reorderQty !== null && reorderQty < 0) {
            return res.status(400).json({ success: false, message: "Reorder quantity cannot be negative" });
        }
        if (purchasePrice < 0) {
            return res.status(400).json({ success: false, message: "Default purchase price cannot be negative" });
        }
        if (gstPct < 0 || gstPct > 100) {
            return res.status(400).json({ success: false, message: "GST percentage must be between 0 and 100" });
        }

        const existingItem = await RationItemModel.getRationItemById(id, institutionId);
        if (!existingItem) {
            return res.status(404).json({ success: false, message: "Ration item not found" });
        }

        // Category/Unit exist validations
        const category = await RationCategoryModel.getRationCategoryById(catId, institutionId);
        if (!category) {
            return res.status(400).json({ success: false, message: "Selected category does not exist" });
        }

        const unit = await RationUnitModel.getRationUnitById(utId, institutionId);
        if (!unit) {
            return res.status(400).json({ success: false, message: "Selected unit does not exist" });
        }

        // Unique checks
        const dupName = await RationItemModel.findRationItemByName(item_name.trim(), institutionId);
        if (dupName && Number(dupName.id) !== Number(id)) {
            return res.status(409).json({ success: false, message: "Item name already exists" });
        }

        const dupCode = await RationItemModel.findRationItemByCode(item_code.trim(), institutionId);
        if (dupCode && Number(dupCode.id) !== Number(id)) {
            return res.status(409).json({ success: false, message: "Item code already exists" });
        }

        const dupBarcode = await RationItemModel.findRationItemByBarcode(barcode.trim(), institutionId);
        if (dupBarcode && Number(dupBarcode.id) !== Number(id)) {
            return res.status(409).json({ success: false, message: "Barcode already exists" });
        }

        // If no new image file was uploaded, preserve the old image URL
        const imageUrl = req.file ? req.file.cloudinaryUrl : existingItem.image_url;

        const isBatch = batch_tracking === "true" || batch_tracking === true;
        const isExpiry = expiry_tracking === "true" || expiry_tracking === true;

        const updatedItem = await RationItemModel.updateRationItem(
            id,
            institutionId,
            item_name.trim(),
            item_code.trim(),
            barcode.trim(),
            catId,
            utId,
            description,
            imageUrl,
            minStock,
            maxStock,
            reorderQty,
            purchasePrice,
            gstPct,
            isBatch,
            isExpiry,
            status,
            updatedBy
        );

        return res.status(200).json({
            success: true,
            message: "Ration item updated successfully",
            data: updatedItem,
        });
    } catch (error) {
        console.error("Error updating ration item:", error);

        if (error.code === "23505") {
            if (error.detail && error.detail.includes("item_code")) {
                return res.status(409).json({
                    success: false,
                    message: "Item code already exists",
                });
            }
            if (error.detail && error.detail.includes("barcode")) {
                return res.status(409).json({
                    success: false,
                    message: "Barcode already exists",
                });
            }
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const deleteRationItem = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const id = req.body.id || req.params.id;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Item ID is required",
            });
        }

        const existingItem = await RationItemModel.getRationItemById(id, institutionId);
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                message: "Ration item not found",
            });
        }

        const deletedItem = await RationItemModel.deleteRationItem(id, institutionId);

        return res.status(200).json({
            success: true,
            message: "Ration item deleted successfully",
            data: deletedItem,
        });
    } catch (error) {
        console.error("Error deleting ration item:", error);
        if (error.code === "23503") {
            return res.status(409).json({
                success: false,
                message: "Item cannot be deleted because it is used by inventory transactions",
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getNextRationBarcode = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const nextBarcode = await RationItemModel.getNextBarcode(institutionId);
        return res.status(200).json({
            success: true,
            message: "Next ration barcode generated successfully",
            data: { barcode: nextBarcode },
        });
    } catch (error) {
        console.error("Error generating next barcode:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getRationItemByBarcode = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const { barcode } = req.body;

        if (!barcode) {
            return res.status(400).json({
                success: false,
                message: "Barcode is required",
            });
        }

        const item = await RationItemModel.getRationItemByBarcode(
            barcode.trim(),
            institutionId
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Ration item not found",
            });
        }

        if (item.status !== "active") {
            return res.status(400).json({
                success: false,
                message: "Ration item is inactive",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Ration item fetched successfully",
            data: item,
        });
    } catch (error) {
        console.error("Error scanning ration item:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

module.exports = {
    createRationItem,
    getRationItemList,
    getRationItemById,
    updateRationItem,
    deleteRationItem,
    getNextRationBarcode,
    getRationItemByBarcode,
};
