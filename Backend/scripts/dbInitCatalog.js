const fs = require("fs");
const path = require("path");
const db = require("../Config/Database");

const runSQL = async () => {
    try {
        const filePath = path.join(__dirname, "../CatalogManagementModul/CatalogManagement.sql");
        console.log(`Reading SQL file from: ${filePath}`);
        const sqlContent = fs.readFileSync(filePath, "utf8");

        console.log("Executing SQL migration and seeding for Catalog Management Module...");
        await db.query(sqlContent);
        console.log("Successfully executed Catalog Management database initialization!");
        await db.shutdownPool();
        process.exit(0);
    } catch (error) {
        console.error("Error executing SQL:", error);
        await db.shutdownPool();
        process.exit(1);
    }
};

runSQL();
