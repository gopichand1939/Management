const db = require("./Config/Database");
const { getMenusByRole, getDefaultRoute, isPathAllowedForUser } = require("./Utils/MenuPermissions");

const runTest = async () => {
    const menus = await getMenusByRole("super_admin");
    const user = { role: "super_admin", menus };

    console.log("=== TEST RESULTS ===");
    const defaultRoute = getDefaultRoute(user);
    console.log("getDefaultRoute(user) result:", defaultRoute);

    const isDashboardAllowed = isPathAllowedForUser(user, "/dashboard");
    console.log("isPathAllowedForUser(user, '/dashboard') result:", isDashboardAllowed);

    const isSuperAdminAllowed = isPathAllowedForUser(user, "/super-admins");
    console.log("isPathAllowedForUser(user, '/super-admins') result:", isSuperAdminAllowed);

    await db.shutdownPool();
};

runTest().catch(async (err) => {
    console.error(err);
    await db.shutdownPool();
});
