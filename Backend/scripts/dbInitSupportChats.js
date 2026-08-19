const db = require("../Config/Database");

const init = async () => {
    try {
        console.log("Creating support_users table...");
        await db.query(`
            CREATE TABLE IF NOT EXISTS support_users (
                id SERIAL PRIMARY KEY,
                institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
                name VARCHAR(150) NOT NULL,
                email VARCHAR(150) NOT NULL,
                phone VARCHAR(20) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Created support_users table.");

        console.log("Creating support_user_chats table...");
        await db.query(`
            CREATE TABLE IF NOT EXISTS support_user_chats (
                id SERIAL PRIMARY KEY,
                support_user_id INTEGER NOT NULL REFERENCES support_users(id) ON DELETE CASCADE,
                sender_type VARCHAR(50) NOT NULL,
                sender_id INTEGER,
                message TEXT NOT NULL,
                attachment TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Created support_user_chats table.");
        
        console.log("Database support chat tables created successfully!");
        await db.shutdownPool();
        process.exit(0);
    } catch (error) {
        console.error("Database initialization failed:", error);
        await db.shutdownPool();
        process.exit(1);
    }
};

init();
