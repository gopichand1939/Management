const db = require("./Config/Database");
const bcrypt = require("bcryptjs");

const resetPassword = async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("Admin@123", salt);

    await db.query("UPDATE super_admins SET password = $1 WHERE email = 'blr@gmail.com'", [hashedPassword]);
    await db.query("UPDATE user_credentials SET password = $1 WHERE email = 'blr@gmail.com'", [hashedPassword]);

    console.log("Password reset successfully for blr@gmail.com to Admin@123");
    await db.shutdownPool();
};

resetPassword().catch(async (err) => {
    console.error(err);
    await db.shutdownPool();
});
