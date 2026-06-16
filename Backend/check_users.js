const pool = require("./Config/Database");

const checkUsers = async () => {
    const res = await pool.query("SELECT id, email, role, institution_id, super_admin_id, pg_admin_id FROM user_credentials");
    console.log("CREDENTIALS:");
    console.log(res.rows);
    pool.end();
};

checkUsers().catch(err => {
    console.error(err);
    pool.end();
});
