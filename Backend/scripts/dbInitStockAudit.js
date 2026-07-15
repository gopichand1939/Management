const fs = require("fs");
const path = require("path");
const db = require("../Config/Database");

const runSQL = async () => {
    try {
        const filePath = path.join(__dirname, "../RationInventory/StockAudit/RationStockAudit.sql");
        console.log(`Reading SQL file from: ${filePath}`);
        const sqlContent = fs.readFileSync(filePath, "utf8");

        console.log("Executing SQL migration for Stock Audit...");
        await db.query(sqlContent);
        console.log("Successfully executed Stock Audit database initialization!");
        await db.shutdownPool();
        process.exit(0);
    } catch (error) {
        console.error("Error executing SQL:", error);
        await db.shutdownPool();
        process.exit(1);
    }
};

runSQL();
