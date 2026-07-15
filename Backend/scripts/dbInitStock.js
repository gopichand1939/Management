const fsOriginal = require("fs");
const path = require("path");
const db = require("../Config/Database");

const runSQL = async () => {
    try {
        console.log("Altering ration_stock_transactions table to add missing columns...");
        await db.query(`
            ALTER TABLE ration_stock_transactions ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
            ALTER TABLE ration_stock_transactions ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);
            ALTER TABLE ration_stock_transactions ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2) DEFAULT 0;
            ALTER TABLE ration_stock_transactions ADD COLUMN IF NOT EXISTS remarks TEXT;
        `);
        console.log("Successfully altered ration_stock_transactions table!");

        const filePath = path.join(__dirname, "../RationInventory/CurrentStock/RationCurrentStockMenu.sql");
        console.log(`Reading SQL file from: ${filePath}`);
        const sqlContent = fsOriginal.readFileSync(filePath, "utf8");

        console.log("Executing SQL menu seeding...");
        await db.query(sqlContent);
        console.log("Successfully seeded Current Stock child menu!");
        await db.shutdownPool();
        process.exit(0);
    } catch (error) {
        console.error("Error executing SQL migrations:", error);
        await db.shutdownPool();
        process.exit(1);
    }
};

runSQL();
