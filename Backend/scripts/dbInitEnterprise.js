const fs = require("fs");
const path = require("path");
const db = require("../Config/Database");

const runSQLFile = async (filePath) => {
    console.log(`Reading SQL file from: ${filePath}`);
    const sqlContent = fs.readFileSync(filePath, "utf8");

    try {
        console.log(`Executing SQL file: ${path.basename(filePath)}...`);
        await db.query(sqlContent);
        console.log(`Successfully executed: ${path.basename(filePath)}`);
    } catch (error) {
        console.error(`Error executing SQL file ${path.basename(filePath)}:`, error);
        throw error;
    }
};

const init = async () => {
    try {
        const purchaseSqlPath = path.join(__dirname, "../RationInventory/Purchase/RationPurchaseEnterprise.sql");
        await runSQLFile(purchaseSqlPath);
        console.log("Database updated successfully for Enterprise Purchases!");
        await db.shutdownPool();
        process.exit(0);
    } catch (error) {
        console.error("Database initialization failed:", error);
        await db.shutdownPool();
        process.exit(1);
    }
};

init();
