const {
    createInstitutionOnboarding,
    deleteInstitutionById,
    findInstitutionById,
    getInstitutionHierarchyById,
    getInstitutionList,
    updateInstitution,
    updateInstitutionOnboarding,
} = require("./InstitutionModel");

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

const normalizeBoolean = (value) => {
    if (typeof value === "boolean") {
        return value;
    }

    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    return false;
};

const normalizeText = (value) => {
    if (typeof value !== "string") {
        return value || null;
    }

    const normalizedValue = value.trim();

    return normalizedValue || null;
};

const normalizeInstitutionPayload = (body, createdBy) => {
    return {
        institution_name: normalizeText(body.institution_name),
        institution_code: normalizeText(body.institution_code),
        institution_type: normalizeText(body.institution_type),
        email: normalizeText(body.email)?.toLowerCase() || null,
        phone: normalizeText(body.phone),
        address: normalizeText(body.address),
        city: normalizeText(body.city),
        state: normalizeText(body.state),
        pincode: normalizeText(body.pincode),
        manager_name: normalizeText(body.manager_name),
        manager_phone: normalizeText(body.manager_phone),
        logo: normalizeText(body.logo),
        status: normalizeText(body.status) || "active",
        created_by: createdBy,
        floors: Array.isArray(body.floors)
            ? body.floors.map((floor) => ({
                floor_name: normalizeText(floor.floor_name),
                floor_number: normalizeInteger(floor.floor_number),
                gender_type: normalizeText(floor.gender_type),
                status: normalizeText(floor.status) || "active",
                rooms: Array.isArray(floor.rooms)
                    ? floor.rooms.map((room) => ({
                        room_number: normalizeText(room.room_number),
                        room_type: normalizeText(room.room_type),
                        capacity: normalizeInteger(room.capacity),
                        rent_amount: normalizeNumber(room.rent_amount),
                        attached_bathroom: normalizeBoolean(room.attached_bathroom),
                        status: normalizeText(room.status) || "active",
                        beds: Array.isArray(room.beds)
                            ? room.beds.map((bed) => ({
                                bed_number: normalizeText(bed.bed_number),
                                bed_type: normalizeText(bed.bed_type),
                                rent_override: normalizeNumber(bed.rent_override),
                                status: normalizeText(bed.status) || "vacant",
                            }))
                            : [],
                    }))
                    : [],
            }))
            : [],
    };
};

const validateOnboardingPayload = (data) => {
    if (!data.institution_name) {
        return "Institution name is required";
    }

    const duplicateFloorNumbers = new Set();

    for (const floor of data.floors) {
        if (!floor.floor_name) {
            return "Each floor must have a floor name";
        }

        if (floor.floor_number === null) {
            return "Each floor must have a valid floor number";
        }

        if (duplicateFloorNumbers.has(floor.floor_number)) {
            return "Floor numbers must be unique within an institution";
        }

        duplicateFloorNumbers.add(floor.floor_number);

        const duplicateRoomNumbers = new Set();

        for (const room of floor.rooms) {
            if (!room.room_number) {
                return `Each room in ${floor.floor_name} must have a room number`;
            }

            if (duplicateRoomNumbers.has(room.room_number)) {
                return `Room numbers must be unique in ${floor.floor_name}`;
            }

            duplicateRoomNumbers.add(room.room_number);

            if (room.capacity !== null && room.capacity <= 0) {
                return `Room capacity must be greater than zero for ${room.room_number}`;
            }

            const duplicateBedNumbers = new Set();

            for (const bed of room.beds) {
                if (!bed.bed_number) {
                    return `Each bed in ${room.room_number} must have a bed number`;
                }

                if (duplicateBedNumbers.has(bed.bed_number)) {
                    return `Bed numbers must be unique in ${room.room_number}`;
                }

                duplicateBedNumbers.add(bed.bed_number);
            }
        }
    }

    return null;
};

const addInstitution = async (req, res) => {
    try {
        if (isPgAdminRequest(req)) {
            return res.status(403).json({
                success: false,
                message: "PG admin cannot create institutions",
            });
        }

        const data = normalizeInstitutionPayload(req.body, req.user?.id || null);
        const validationMessage = validateOnboardingPayload(data);

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage,
            });
        }

        const institution = await createInstitutionOnboarding(data);

        return res.status(201).json({
            success: true,
            message: "Institution created successfully",
            institution,
        });
    } catch (error) {
        console.error("Institution create failed:", error);

        if (error.code === "23505") {
            return res.status(400).json({
                success: false,
                message: "Institution code, floor number, room number or bed number already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Institution create failed",
        });
    }
};

const listInstitution = async (req, res) => {
    try {
        const institutions = isPgAdminRequest(req)
            ? [await findInstitutionById(req.pgAdmin.institution_id)].filter(Boolean)
            : await getInstitutionList();

        return res.status(200).json({
            success: true,
            message: "Institution list fetched successfully",
            institutions,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Institution list failed",
        });
    }
};

const viewInstitution = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Institution id is required",
            });
        }

        const institution = await getInstitutionHierarchyById(id);

        if (!institution) {
            return res.status(404).json({
                success: false,
                message: "Institution not found",
            });
        }

        if (
            isPgAdminRequest(req) &&
            Number(institution.id) !== Number(req.pgAdmin.institution_id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this institution",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Institution fetched successfully",
            institution,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Institution fetch failed",
        });
    }
};

const editInstitution = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Institution id is required",
            });
        }

        const existingInstitution = await findInstitutionById(id);

        if (!existingInstitution) {
            return res.status(404).json({
                success: false,
                message: "Institution not found",
            });
        }

        if (
            isPgAdminRequest(req) &&
            Number(existingInstitution.id) !== Number(req.pgAdmin.institution_id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this institution",
            });
        }

        const data = normalizeInstitutionPayload(req.body, existingInstitution.created_by);
        const validationMessage = validateOnboardingPayload(data);

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage,
            });
        }

        const institution = await updateInstitutionOnboarding({
            ...data,
            id,
        });

        return res.status(200).json({
            success: true,
            message: "Institution updated successfully",
            institution,
        });
    } catch (error) {
        console.error("Institution update failed:", error);

        if (error.code === "23505") {
            return res.status(400).json({
                success: false,
                message: "Institution code, floor number, room number or bed number already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Institution update failed",
        });
    }
};

const deleteInstitution = async (req, res) => {
    try {
        if (isPgAdminRequest(req)) {
            return res.status(403).json({
                success: false,
                message: "PG admin cannot delete institutions",
            });
        }

        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Institution id is required",
            });
        }

        const institution = await deleteInstitutionById(id);

        if (!institution) {
            return res.status(404).json({
                success: false,
                message: "Institution not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Institution deleted successfully",
            institution,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Institution delete failed",
        });
    }
};

module.exports = {
    addInstitution,
    deleteInstitution,
    editInstitution,
    listInstitution,
    viewInstitution,
};
