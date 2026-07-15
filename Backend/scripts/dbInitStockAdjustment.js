const fs = require("fs");
const path = require("path");
const pool = require("../Config/Database");

const runSQL = async () => {
    try {
        const filePath = path.join(__dirname, "../RationInventory/StockAdjustment/RationStockAdjustment.sql");
        console.log(`Reading SQL file from: ${filePath}`);
        const sqlContent = fs.readFileSync(filePath, "utf8");

        console.log("Executing SQL migration for Stock Adjustment...");
        await pool.query(sqlContent);
        console.log("Successfully executed Stock Adjustment database initialization!");
        process.exit(0);
    } catch (error) {
        console.error("Error executing SQL:", error);
        process.exit(1);
    }
};

runSQL();
