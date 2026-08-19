require("dotenv").config();
const db = require("../Config/Database");

async function check() {
    try {
        const email1 = 'testadmin@gmail.com';
        const email2 = 'aa@gmail.com';

        console.log(`Checking for '${email1}':`);
        const sa1 = await db.query("SELECT * FROM super_admins WHERE email = $1", [email1]);
        console.log("super_admins:", sa1.rows);
        const uc1 = await db.query("SELECT * FROM user_credentials WHERE email = $1", [email1]);
        console.log("user_credentials:", uc1.rows);
        const pg1 = await db.query("SELECT * FROM pg_admin WHERE email = $1", [email1]);
        console.log("pg_admin:", pg1.rows);

        console.log(`\nChecking for '${email2}':`);
        const sa2 = await db.query("SELECT * FROM super_admins WHERE email = $1", [email2]);
        console.log("super_admins:", sa2.rows);
        const uc2 = await db.query("SELECT * FROM user_credentials WHERE email = $1", [email2]);
        console.log("user_credentials:", uc2.rows);
        const pg2 = await db.query("SELECT * FROM pg_admin WHERE email = $1", [email2]);
        console.log("pg_admin:", pg2.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await db.shutdownPool();
    }
}

check();
