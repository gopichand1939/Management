require("dotenv").config();
const { query, shutdownPool } = require("c:/Users/Innovitegra Solution/Desktop/folder/Management/Backend/Config/Database");

async function run() {
    try {
        const u = await query("SELECT id, email, role, pg_admin_id FROM user_credentials");
        console.log("USER_CREDENTIALS:", u.rows);
        
        const p = await query("SELECT * FROM pg_admin");
        console.log("PG_ADMIN:", p.rows);
        
        const i = await query("SELECT id, institution_name FROM institutions");
        console.log("INSTITUTIONS:", i.rows);
    } catch (e) {
        console.error("Query failed:", e);
    } finally {
        await shutdownPool();
    }
}

run();
