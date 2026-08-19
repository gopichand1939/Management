require("dotenv").config();
const db = require("../Config/Database");

async function cleanup() {
    try {
        console.log("Cleaning up orphaned super_admin credentials...");
        const saRes = await db.query(`
            DELETE FROM user_credentials
            WHERE role = 'super_admin'
              AND super_admin_id IS NOT NULL
              AND super_admin_id NOT IN (SELECT id FROM super_admins)
            RETURNING id, email
        `);
        console.log("Deleted super_admin credentials:", saRes.rows);

        console.log("Cleaning up orphaned pg_admin credentials...");
        const pgRes = await db.query(`
            DELETE FROM user_credentials
            WHERE role = 'pg_admin'
              AND pg_admin_id IS NOT NULL
              AND pg_admin_id NOT IN (SELECT id FROM pg_admin)
            RETURNING id, email
        `);
        console.log("Deleted pg_admin credentials:", pgRes.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await db.shutdownPool();
    }
}

cleanup();
