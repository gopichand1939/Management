const db = require("../Config/Database");

async function check() {
    try {
        console.log("Querying all tenants in database...");
        const result = await db.query("SELECT id, full_name, status, institution_id, deleted_at FROM tenants");
        console.log("Tenants found:", result.rows);
        await db.shutdownPool();
    } catch (e) {
        console.error("Failed to query:", e);
    }
}

check();
