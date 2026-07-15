const fs = require("fs");
const path = require("path");
const pool = require("../Config/Database");

const runSQL = async () => {
    try {
        const filePath = path.join(__dirname, "../RationInventory/KitchenRequest/KitchenRequest.sql");
        console.log(`Reading SQL file from: ${filePath}`);
        const sqlContent = fs.readFileSync(filePath, "utf8");

        console.log("Executing SQL migration and seeding...");
        await pool.query(sqlContent);
        console.log("Successfully executed Kitchen Request database initialization!");
        process.exit(0);
    } catch (error) {
        console.error("Error executing SQL:", error);
        process.exit(1);
    }
};

runSQL();
