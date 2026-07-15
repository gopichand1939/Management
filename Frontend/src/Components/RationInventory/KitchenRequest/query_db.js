const pool = require("../../../../../Desktop/folder/Management/Backend/Config/Database");

async function run() {
    try {
        console.log("=== SCHEMA OF ration_kitchen_requests ===");
        const schema = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'ration_kitchen_requests'
        `);
        console.log(schema.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
