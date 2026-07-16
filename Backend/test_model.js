require("dotenv").config();
const { getAdmins } = require("./Restriction/RestrictionModel");
const db = require("./Config/Database");

async function run() {
    try {
        console.log("Calling getAdmins()...");
        const rows = await getAdmins();
        console.log("getAdmins() returned:", rows);
    } catch (e) {
        console.error("Failed to run getAdmins:", e);
    } finally {
        await db.shutdownPool();
    }
}

run();
