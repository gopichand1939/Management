const db = require("./Config/Database");

const checkUsers = async () => {
    const res = await db.query("SELECT id, email, role, institution_id, super_admin_id, pg_admin_id FROM user_credentials");
    console.log("CREDENTIALS:");
    console.log(res.rows);
    await db.shutdownPool();
};

checkUsers().catch(async (err) => {
    console.error(err);
    await db.shutdownPool();
});
