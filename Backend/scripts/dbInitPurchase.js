const fs = require("fs");
const path = require("path");
const pool = require("../Config/Database");

const runSQLFile = async (filePath) => {
    console.log(`Reading SQL file from: ${filePath}`);
    const sqlContent = fs.readFileSync(filePath, "utf8");

    try {
        console.log(`Executing SQL file: ${path.basename(filePath)}...`);
        // pg supports multiple queries separated by semicolons in a single string
        await pool.query(sqlContent);
        console.log(`Successfully executed: ${path.basename(filePath)}`);
    } catch (error) {
        console.error(`Error executing SQL file ${path.basename(filePath)}:`, error);
        throw error;
    }
};

const init = async () => {
    try {
        const supplierSqlPath = path.join(__dirname, "../RationInventory/SupplierMaster/RationSupplierMaster.sql");
        const purchaseSqlPath = path.join(__dirname, "../RationInventory/Purchase/RationPurchase.sql");

        await runSQLFile(supplierSqlPath);
        await runSQLFile(purchaseSqlPath);

        console.log("Database initialized successfully for Supplier Master and Purchases!");
        process.exit(0);
    } catch (error) {
        console.error("Database initialization failed:", error);
        process.exit(1);
    }
};

init();
