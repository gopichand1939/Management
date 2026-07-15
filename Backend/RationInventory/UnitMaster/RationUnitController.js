const RationUnitModel = require("./RationUnitModel");

const createRationUnit = async (req, res) => {
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
            unit_name,
            unit_code,
            allow_decimal = true,
            description,
            status = "active",
        } = req.body;

        if (!unit_name) {
            return res.status(400).json({
                success: false,
                message: "Unit name is required",
            });
        }

        if (!unit_code) {
            return res.status(400).json({
                success: false,
                message: "Unit code is required",
            });
        }

        const existingUnitName =
            await RationUnitModel.findRationUnitByName(
                unit_name,
                institutionId
            );

        if (existingUnitName) {
            return res.status(409).json({
                success: false,
                message: "Unit name already exists",
            });
        }

        const existingUnitCode =
            await RationUnitModel.findRationUnitByCode(
                unit_code,
                institutionId
            );

        if (existingUnitCode) {
            return res.status(409).json({
                success: false,
                message: "Unit code already exists",
            });
        }

        const unit =
            await RationUnitModel.createRationUnit(
                institutionId,
                pgAdminId,
                unit_name,
                unit_code,
                allow_decimal,
                description,
                status,
                createdBy
            );

        return res.status(201).json({
            success: true,
            message: "Ration unit created successfully",
            data: unit,
        });
    } catch (error) {
        console.error("Error creating ration unit:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getRationUnitList = async (req, res) => {
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

        const units =
            await RationUnitModel.getRationUnitList(
                institutionId,
                limit,
                offset
            );

        const totalCount = await RationUnitModel.getRationUnitCount(institutionId);

        return res.status(200).json({
            success: true,
            message: "Ration unit list fetched successfully",
            data: units,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit),
            }
        });
    } catch (error) {
        console.error("Error fetching ration unit list:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getRationUnitById = async (req, res) => {
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
                message: "Unit ID is required",
            });
        }

        const unit =
            await RationUnitModel.getRationUnitById(
                id,
                institutionId
            );

        if (!unit) {
            return res.status(404).json({
                success: false,
                message: "Ration unit not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Ration unit fetched successfully",
            data: unit,
        });
    } catch (error) {
        console.error("Error fetching ration unit:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const updateRationUnit = async (req, res) => {
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
            unit_name,
            unit_code,
            allow_decimal = true,
            description,
            status = "active",
        } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Unit ID is required",
            });
        }

        if (!unit_name) {
            return res.status(400).json({
                success: false,
                message: "Unit name is required",
            });
        }

        if (!unit_code) {
            return res.status(400).json({
                success: false,
                message: "Unit code is required",
            });
        }

        const existingUnit =
            await RationUnitModel.getRationUnitById(
                id,
                institutionId
            );

        if (!existingUnit) {
            return res.status(404).json({
                success: false,
                message: "Ration unit not found",
            });
        }

        const existingUnitName =
            await RationUnitModel.findRationUnitByName(
                unit_name,
                institutionId
            );

        if (
            existingUnitName &&
            Number(existingUnitName.id) !== Number(id)
        ) {
            return res.status(409).json({
                success: false,
                message: "Unit name already exists",
            });
        }

        const existingUnitCode =
            await RationUnitModel.findRationUnitByCode(
                unit_code,
                institutionId
            );

        if (
            existingUnitCode &&
            Number(existingUnitCode.id) !== Number(id)
        ) {
            return res.status(409).json({
                success: false,
                message: "Unit code already exists",
            });
        }

        const updatedUnit =
            await RationUnitModel.updateRationUnit(
                id,
                institutionId,
                unit_name,
                unit_code,
                allow_decimal,
                description,
                status,
                updatedBy
            );

        return res.status(200).json({
            success: true,
            message: "Ration unit updated successfully",
            data: updatedUnit,
        });
    } catch (error) {
        console.error("Error updating ration unit:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const deleteRationUnit = async (req, res) => {
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
                message: "Unit ID is required",
            });
        }

        const existingUnit =
            await RationUnitModel.getRationUnitById(
                id,
                institutionId
            );

        if (!existingUnit) {
            return res.status(404).json({
                success: false,
                message: "Ration unit not found",
            });
        }

        const deletedUnit =
            await RationUnitModel.deleteRationUnit(
                id,
                institutionId
            );

        return res.status(200).json({
            success: true,
            message: "Ration unit deleted successfully",
            data: deletedUnit,
        });
    } catch (error) {
        console.error("Error deleting ration unit:", error);

        if (error.code === "23503") {
            return res.status(409).json({
                success: false,
                message:
                    "Unit cannot be deleted because it is used by ration items",
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getUnitDropdownList = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const units = await RationUnitModel.getUnitDropdownList(institutionId);

        return res.status(200).json({
            success: true,
            message: "Unit list fetched successfully",
            data: units,
            units: units,
        });
    } catch (error) {
        console.error("Error fetching unit dropdown list:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

module.exports = {
    createRationUnit,
    getRationUnitList,
    getRationUnitById,
    updateRationUnit,
    deleteRationUnit,
    getUnitDropdownList,
};
