const CatalogCategoryModel = require("./CatalogCategoryModel");

const createCategory = async (req, res) => {
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

        const existingCategoryName = await CatalogCategoryModel.findCategoryByName(
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
            const existingCategoryCode = await CatalogCategoryModel.findCategoryByCode(
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

        const category = await CatalogCategoryModel.createCategory(
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
            message: "Catalog category created successfully",
            data: category,
        });
    } catch (error) {
        console.error("Error creating catalog category:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getCategoryList = async (req, res) => {
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

        const categories = await CatalogCategoryModel.getCategoryList(
            institutionId,
            limit,
            offset
        );

        const totalCount = await CatalogCategoryModel.getCategoryCount(institutionId);

        return res.status(200).json({
            success: true,
            data: categories,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching catalog categories:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getCategoryById = async (req, res) => {
    const isSuperAdmin = req.user?.role === "super_admin";
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const { id } = req.body;

    if (!isSuperAdmin && !institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Category ID is required",
        });
    }

    try {
        const category = await CatalogCategoryModel.getCategoryById(id, isSuperAdmin ? null : institutionId);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error) {
        console.error("Error fetching category details:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const updateCategory = async (req, res) => {
    const isSuperAdmin = req.user?.role === "super_admin";
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const updatedBy = req.user?.id;

    if (!isSuperAdmin && !institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const {
            id,
            category_name,
            category_code,
            description,
            status,
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

        const category = await CatalogCategoryModel.getCategoryById(id, isSuperAdmin ? null : institutionId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        const targetInstitutionId = category.institution_id;

        // Validate name duplicate
        const existingCategoryName = await CatalogCategoryModel.findCategoryByName(
            category_name,
            targetInstitutionId
        );

        if (existingCategoryName && existingCategoryName.id !== parseInt(id)) {
            return res.status(409).json({
                success: false,
                message: "Category name already exists",
            });
        }

        // Validate code duplicate
        if (category_code) {
            const existingCategoryCode = await CatalogCategoryModel.findCategoryByCode(
                category_code,
                targetInstitutionId
            );

            if (existingCategoryCode && existingCategoryCode.id !== parseInt(id)) {
                return res.status(409).json({
                    success: false,
                    message: "Category code already exists",
                });
            }
        }

        const updatedCategory = await CatalogCategoryModel.updateCategory(
            id,
            targetInstitutionId,
            category_name,
            category_code,
            description,
            status,
            updatedBy
        );

        return res.status(200).json({
            success: true,
            message: "Catalog category updated successfully",
            data: updatedCategory,
        });
    } catch (error) {
        console.error("Error updating catalog category:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const deleteCategory = async (req, res) => {
    const isSuperAdmin = req.user?.role === "super_admin";
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const { id } = req.body;

    if (!isSuperAdmin && !institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Category ID is required",
        });
    }

    try {
        const category = await CatalogCategoryModel.getCategoryById(id, isSuperAdmin ? null : institutionId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found or access denied",
            });
        }

        const deletedCategory = await CatalogCategoryModel.deleteCategory(id, category.institution_id);

        if (!deletedCategory) {
            return res.status(404).json({
                success: false,
                message: "Category not found or deletion failed",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Catalog category deleted successfully",
            data: deletedCategory,
        });
    } catch (error) {
        console.error("Error deleting catalog category:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getCategoryDropdownList = async (req, res) => {
    const isSuperAdmin = req.user?.role === "super_admin";
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!isSuperAdmin && !institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const targetId = institutionId || 1;
        const dropdownList = await CatalogCategoryModel.getCategoryDropdownList(targetId);
        return res.status(200).json({
            success: true,
            data: dropdownList,
        });
    } catch (error) {
        console.error("Error fetching catalog category dropdown list:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

module.exports = {
    createCategory,
    getCategoryList,
    getCategoryById,
    updateCategory,
    deleteCategory,
    getCategoryDropdownList,
};
