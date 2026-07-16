const model = require("./RestrictionModel");

const getAdmins = async (req, res) => {
    try {
        const institutionId = req.query.institution_id;
        const list = await model.getAdmins(institutionId);
        return res.status(200).json({
            success: true,
            data: list
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

const getRules = async (req, res) => {
    try {
        const id = req.params.userId;
        const list = await model.getRules(id);
        return res.status(200).json({
            success: true,
            data: list
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

const saveRules = async (req, res) => {
    try {
        const id = req.params.userId;
        const rules = req.body.rules || [];
        await model.deleteRules(id);
        for (const item of rules) {
            await model.addRule(
                id,
                item.menu_id,
                item.action_id,
                item.is_allowed
            );
        }
        return res.status(200).json({
            success: true,
            message: "Permissions saved"
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = {
    getAdmins,
    getRules,
    saveRules
};
