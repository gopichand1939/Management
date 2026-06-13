const { Pool } = require("pg");
require("dotenv").config({ quiet: true });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

const createUser = async (name, email, phone, password) => {
    try {
        const query = `
            INSERT INTO users (name, email, phone, password)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, email, phone, role, created_at
        `;

        const values = [name, email, phone, password];

        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const findUserByEmail = async (email) => {
    try {
        const query = `
            SELECT id, name, email, phone, password, role, created_at
            FROM users
            WHERE email = $1
        `;

        const values = [email];

        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const findUserById = async (id) => {
    try {
        const query = `
            SELECT id, name, email, phone, role, created_at
            FROM users
            WHERE id = $1
        `;

        const values = [id];

        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const getRegisteredUserList = async () => {
    try {
        const query = `
            SELECT id, name, email, phone, role, created_at
            FROM users
            ORDER BY id DESC
        `;

        const result = await pool.query(query);

        return result.rows;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    getRegisteredUserList,
};
