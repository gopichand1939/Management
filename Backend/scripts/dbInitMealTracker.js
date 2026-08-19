const fs = require("fs");
const path = require("path");
const db = require("../Config/Database");

const runSQL = async () => {
    try {
        const filePath = path.join(__dirname, "../DailyMealTracker/DailyMealTracker.sql");
        console.log(`Reading SQL file from: ${filePath}`);
        const sqlContent = fs.readFileSync(filePath, "utf8");

        console.log("Executing SQL migration and seeding for Daily Meal Tracker...");
        await db.query(sqlContent);
        console.log("Successfully executed Daily Meal Tracker database initialization!");
        await db.shutdownPool();
        process.exit(0);
    } catch (error) {
        console.error("Error executing SQL:", error);
        await db.shutdownPool();
        process.exit(1);
    }
};

runSQL();
