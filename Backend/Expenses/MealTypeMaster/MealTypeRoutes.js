const express = require("express");
const { protectAuth } = require("../../Auth/AuthMiddleware");

const {
    addMealType,
    changeMealTypeStatus,
    deleteMealType,
    editMealType,
    listActiveMealTypes,
    listMealTypes,
    viewMealType,
} = require("./MealTypeMasterControl");

const router = express.Router();

const protectAdminAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/create", protectAdminAccess, addMealType);
router.post("/list", protectAdminAccess, listMealTypes);
router.post("/active-list", protectAdminAccess, listActiveMealTypes);
router.post("/view", protectAdminAccess, viewMealType);
router.post("/edit", protectAdminAccess, editMealType);
router.post("/status", protectAdminAccess, changeMealTypeStatus);
router.post("/delete", protectAdminAccess, deleteMealType);

module.exports = router;