const fs = require("fs");
const path = require("path");
const pool = require("../Config/Database");

const runSQL = async () => {
    try {
        const filePath = path.join(__dirname, "../RationInventory/StockIssue/RationStockIssue.sql");
        console.log(`Reading SQL file from: ${filePath}`);
        const sqlContent = fs.readFileSync(filePath, "utf8");

        console.log("Executing SQL migration for Stock Issue...");
        await pool.query(sqlContent);
        console.log("Successfully executed Stock Issue database initialization!");
        process.exit(0);
    } catch (error) {
        console.error("Error executing SQL:", error);
        process.exit(1);
    }
};

runSQL();
