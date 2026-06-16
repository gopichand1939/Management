const pool = require("./Config/Database");
const bcrypt = require("bcryptjs");

const resetPassword = async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("Admin@123", salt);

    await pool.query("UPDATE super_admins SET password = $1 WHERE email = 'blr@gmail.com'", [hashedPassword]);
    await pool.query("UPDATE user_credentials SET password = $1 WHERE email = 'blr@gmail.com'", [hashedPassword]);

    console.log("Password reset successfully for blr@gmail.com to Admin@123");
    pool.end();
};

resetPassword().catch(err => {
    console.error(err);
    pool.end();
});
