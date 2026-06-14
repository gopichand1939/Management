const pool = require("./Config/Database");

async function test() {
    try {
        console.log("--- Querying tenants with bed_id = 59 ---");
        const tenants = await pool.query("SELECT id, full_name, status, bed_id, check_in_date, deleted_at FROM tenants WHERE bed_id = 59");
        console.log("Tenants on bed 59:", tenants.rows);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

test();
