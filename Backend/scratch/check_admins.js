const db = require("../Config/Database");

async function check() {
    try {
        console.log("Querying all pg_admins and super_admins...");
        const pgAdmins = await db.query("SELECT id, username, institution_id, role, deleted_at FROM pg_admins");
        const superAdmins = await db.query("SELECT id, username, role FROM super_admins");
        console.log("PG Admins:", pgAdmins.rows);
        console.log("Super Admins:", superAdmins.rows);
        await db.shutdownPool();
    } catch (e) {
        console.error("Failed to query:", e);
    }
}

check();
