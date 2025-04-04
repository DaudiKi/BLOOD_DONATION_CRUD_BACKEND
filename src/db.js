/**
 * Database Configuration Module
 * 
 * This module handles the PostgreSQL database connection configuration and setup.
 * It uses environment variables for secure database credentials management.
 * 
 * @module db
 */

import pg from "pg";
import env from "dotenv";

// Load environment variables from .env file
env.config();

/**
 * PostgreSQL Client Configuration
 * Creates a new database client with connection parameters from environment variables:
 * - PG_USER: Database user
 * - PG_HOST: Database host address
 * - PG_DATABASE: Database name
 * - PG_PASSWORD: Database password
 * - PG_PORT: Database port number
 */
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

/**
 * Establish Database Connection
 * Attempts to connect to the PostgreSQL database and logs the result
 */
db.connect()
  .then(() => {
    console.log('Connected to PostgreSQL');
  })
  .catch(err => {
    console.error('PostgreSQL connection error:', err.stack);
  });

/**
 * Execute Database Query
 * 
 * @param {string} text - The SQL query text
 * @param {Array} params - Array of parameters to be used in the query
 * @returns {Promise} Result of the database query
 */
export const query = (text, params) => db.query(text, params);
