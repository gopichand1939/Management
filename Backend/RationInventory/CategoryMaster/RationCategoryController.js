const RationCategoryModel = require("./RationCategoryModel");

const createRationCategory = async (req, res) => {
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
            category_name,
            category_code,
            description,
            status = "active",
        } = req.body;

        if (!category_name) {
            return res.status(400).json({
                success: false,
                message: "Category name is required",
            });
        }

        const existingCategoryName =
            await RationCategoryModel.findRationCategoryByName(
                category_name,
                institutionId
            );

        if (existingCategoryName) {
            return res.status(409).json({
                success: false,
                message: "Category name already exists",
            });
        }

        if (category_code) {
            const existingCategoryCode =
                await RationCategoryModel.findRationCategoryByCode(
                    category_code,
                    institutionId
                );

            if (existingCategoryCode) {
                return res.status(409).json({
                    success: false,
                    message: "Category code already exists",
                });
            }
        }

        const category =
            await RationCategoryModel.createRationCategory(
                institutionId,
                pgAdminId,
                category_name,
                category_code,
                description,
                status,
                createdBy
            );

        return res.status(201).json({
            success: true,
            message: "Ration category created successfully",
            data: category,
        });
    } catch (error) {
        console.error("Error creating ration category:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getRationCategoryList = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const page = parseInt(req.body.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const categories =
            await RationCategoryModel.getRationCategoryList(
                institutionId,
                limit,
                offset
            );

        const totalCount = await RationCategoryModel.getRationCategoryCount(institutionId);

        return res.status(200).json({
            success: true,
            message: "Ration category list fetched successfully",
            data: categories,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit),
            }
        });
    } catch (error) {
        console.error("Error fetching ration category list:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getRationCategoryById = async (req, res) => {
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
                message: "Category ID is required",
            });
        }

        const category =
            await RationCategoryModel.getRationCategoryById(
                id,
                institutionId
            );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Ration category not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Ration category fetched successfully",
            data: category,
        });
    } catch (error) {
        console.error("Error fetching ration category:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const updateRationCategory = async (req, res) => {
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

        const {
            category_name,
            category_code,
            description,
            status = "active",
        } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Category ID is required",
            });
        }

        if (!category_name) {
            return res.status(400).json({
                success: false,
                message: "Category name is required",
            });
        }

        const existingCategory =
            await RationCategoryModel.getRationCategoryById(
                id,
                institutionId
            );

        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: "Ration category not found",
            });
        }

        const existingCategoryName =
            await RationCategoryModel.findRationCategoryByName(
                category_name,
                institutionId
            );

        if (
            existingCategoryName &&
            Number(existingCategoryName.id) !== Number(id)
        ) {
            return res.status(409).json({
                success: false,
                message: "Category name already exists",
            });
        }

        if (category_code) {
            const existingCategoryCode =
                await RationCategoryModel.findRationCategoryByCode(
                    category_code,
                    institutionId
                );

            if (
                existingCategoryCode &&
                Number(existingCategoryCode.id) !== Number(id)
            ) {
                return res.status(409).json({
                    success: false,
                    message: "Category code already exists",
                });
            }
        }

        const updatedCategory =
            await RationCategoryModel.updateRationCategory(
                id,
                institutionId,
                category_name,
                category_code,
                description,
                status,
                updatedBy
            );

        return res.status(200).json({
            success: true,
            message: "Ration category updated successfully",
            data: updatedCategory,
        });
    } catch (error) {
        console.error("Error updating ration category:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const deleteRationCategory = async (req, res) => {
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
                message: "Category ID is required",
            });
        }

        const existingCategory =
            await RationCategoryModel.getRationCategoryById(
                id,
                institutionId
            );

        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: "Ration category not found",
            });
        }

        const deletedCategory =
            await RationCategoryModel.deleteRationCategory(
                id,
                institutionId
            );

        return res.status(200).json({
            success: true,
            message: "Ration category deleted successfully",
            data: deletedCategory,
        });
    } catch (error) {
        console.error("Error deleting ration category:", error);

        if (error.code === "23503") {
            return res.status(409).json({
                success: false,
                message:
                    "Category cannot be deleted because it is used by ration items",
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getCategoryDropdownList = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const categories = await RationCategoryModel.getCategoryDropdownList(institutionId);

        return res.status(200).json({
            success: true,
            message: "Category list fetched successfully",
            data: categories,
            categories: categories,
        });
    } catch (error) {
        console.error("Error fetching category dropdown list:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

module.exports = {
    createRationCategory,
    getRationCategoryList,
    getRationCategoryById,
    updateRationCategory,
    deleteRationCategory,
    getCategoryDropdownList,
};