const fs = require("fs");
const path = require("path");
const db = require("../Config/Database");

const runSQL = async () => {
    try {
        const filePath = path.join(__dirname, "../RationInventory/InventoryDashboard/RationInventoryDashboard.sql");
        console.log(`Reading SQL file from: ${filePath}`);
        const sqlContent = fs.readFileSync(filePath, "utf8");

        console.log("Executing SQL migration for Inventory Dashboard...");
        await db.query(sqlContent);
        console.log("Successfully executed Inventory Dashboard database initialization!");
        await db.shutdownPool();
        process.exit(0);
    } catch (error) {
        console.error("Error executing SQL:", error);
        await db.shutdownPool();
        process.exit(1);
    }
};

runSQL();
