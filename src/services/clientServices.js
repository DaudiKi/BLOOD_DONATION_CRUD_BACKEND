/**
 * Client Services Module
 * 
 * This module provides comprehensive services for managing admin users in the BloodLink system.
 * It handles admin profile management, authentication, and search functionality.
 * The module includes secure password handling, data validation, and logging.
 * 
 * Features:
 * - Admin profile CRUD operations
 * - Secure password hashing with bcrypt
 * - Email validation and duplicate checking
 * - Role-based access control
 * - Search functionality
 * - Comprehensive error handling and logging
 */

// services/clientServices.js
import { pool } from '../index.js'; // Import pool for database queries
import bcrypt from 'bcrypt'; // Import bcrypt for password hashing

/**
 * Database schema name from environment variables
 * @constant {string}
 */
const schema = process.env.PG_SCHEMA || 'bloodlink_schema'; // Define schema
const saltRounds = 10; // Define salt rounds for bcrypt

/**
 * Retrieves all admin users from the system.
 * Returns admin records ordered by admin_id.
 * 
 * @returns {Promise<Array>} Array of admin records
 * @property {number} admin_id - Unique identifier
 * @property {string} first_name - Admin's first name
 * @property {string} last_name - Admin's last name
 * @property {string} email - Admin's email address
 * @property {string} phone_number - Contact phone number
 * @property {boolean} is_active - Account active status
 * @throws {Error} If database query fails
 */
export const getAllAdmins = async () => {
  try {
    const queryText = `SELECT * FROM ${schema}.admin ORDER BY admin_id`;
    const { rows } = await pool.query(queryText);
    return rows;
  } catch (error) {
    console.error('Error fetching all admins:', error);
    throw new Error(`Failed to fetch admins: ${error.message}`);
  }
};

/**
 * Retrieves a specific admin's profile by their ID.
 * Includes validation of the admin ID parameter.
 * 
 * @param {string|number} admin_id - Unique identifier of the admin
 * @returns {Promise<Object>} Admin profile data
 * @throws {Error} If admin ID is invalid or admin not found
 */
export const getAdminById = async (admin_id) => {
  try {
    // Validate admin_id
    if (!admin_id || isNaN(admin_id)) {
      throw new Error('Invalid admin ID');
    }

    const queryText = `SELECT * FROM ${schema}.admin WHERE admin_id = $1`;
    const { rows } = await pool.query(queryText, [admin_id]);
    if (rows.length === 0) {
      throw new Error('Admin not found');
    }
    return rows[0];
  } catch (error) {
    console.error(`Error fetching admin with ID ${admin_id}:`, error);
    throw new Error(`Failed to fetch admin: ${error.message}`);
  }
};

/**
 * Retrieves an admin's profile by their email address.
 * Used primarily for authentication and duplicate checking.
 * 
 * @param {string} email - Email address to search for
 * @returns {Promise<Object|null>} Admin profile data or null if not found
 * @throws {Error} If email format is invalid or database query fails
 */
export const getAdminByEmail = async (email) => {
  try {
    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    const queryText = `SELECT * FROM ${schema}.admin WHERE email = $1`;
    const { rows } = await pool.query(queryText, [email]);
    return rows[0] || null; // Return null if no admin is found
  } catch (error) {
    console.error(`Error fetching admin with email ${email}:`, error);
    throw new Error(`Failed to fetch admin by email: ${error.message}`);
  }
};

/**
 * Creates a new admin profile in the system.
 * Includes comprehensive validation and secure password handling.
 * 
 * @param {Object} adminData - Admin profile information
 * @param {string} adminData.first_name - Admin's first name
 * @param {string} adminData.last_name - Admin's last name
 * @param {string} adminData.email - Admin's email address
 * @param {string} adminData.password - Password (will be hashed)
 * @param {string} adminData.phone_number - Contact phone number
 * @param {Date} [adminData.date_created] - Account creation date
 * @param {boolean} [adminData.is_active] - Account active status
 * @param {string} adminData.role - Must be 'admin'
 * @returns {Promise<Object>} Created admin profile
 * @throws {Error} If validation fails, email exists, or database operation fails
 */
export const createAdmin = async (adminData) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      phone_number,
      date_created,
      is_active,
      role
    } = adminData;

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !phone_number || !role) {
      throw new Error('Missing required fields for admin creation');
    }

    // Validate email format
    if (!email.includes('@')) {
      throw new Error('Invalid email address');
    }

    // Validate role
    if (role !== 'admin') {
      throw new Error('Role must be "admin"');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const queryText = `
      INSERT INTO ${schema}.admin (
        first_name,
        last_name,
        email,
        password,
        phone_number,
        date_created,
        is_active,
        role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      first_name,
      last_name,
      email,
      hashedPassword,
      phone_number,
      date_created,
      is_active,
      role
    ];

    const { rows } = await pool.query(queryText, values);
    console.log(`Successfully created admin: ${rows[0].email}`);
    return rows[0];
  } catch (error) {
    console.error('Error creating admin:', error);
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      throw new Error('Email already exists');
    }
    throw new Error(`Failed to create admin: ${error.message}`);
  }
};

/**
 * Updates an existing admin's profile information.
 * Includes validation of all fields and duplicate email checking.
 * 
 * @param {string|number} admin_id - Unique identifier of the admin
 * @param {Object} adminData - Updated admin information
 * @param {string} adminData.first_name - Updated first name
 * @param {string} adminData.last_name - Updated last name
 * @param {string} adminData.email - Updated email address
 * @param {string} adminData.phone_number - Updated phone number
 * @param {boolean} adminData.is_active - Updated active status
 * @returns {Promise<Object>} Updated admin profile
 * @throws {Error} If validation fails, admin not found, or email exists
 */
export const updateAdmin = async (admin_id, adminData) => {
  try {
    const { first_name, last_name, email, phone_number, is_active } = adminData;

    // Validate required fields
    if (!first_name || !last_name || !email || !phone_number || typeof is_active !== 'boolean') {
      throw new Error('Missing or invalid required fields for admin update');
    }

    // Validate email format
    if (!email.includes('@')) {
      throw new Error('Invalid email address');
    }

    // Validate admin_id
    if (!admin_id || isNaN(admin_id)) {
      throw new Error('Invalid admin ID');
    }

    const queryText = `
      UPDATE ${schema}.admin
      SET first_name = $1, last_name = $2, email = $3, phone_number = $4, is_active = $5
      WHERE admin_id = $6
      RETURNING *`;
    const values = [first_name, last_name, email, phone_number, is_active, admin_id];
    const { rows } = await pool.query(queryText, values);
    if (rows.length === 0) {
      throw new Error('Admin not found');
    }
    console.log(`Successfully updated admin with ID ${admin_id}`);
    return rows[0];
  } catch (error) {
    console.error(`Error updating admin with ID ${admin_id}:`, error);
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      throw new Error('Email already exists');
    }
    throw new Error(`Failed to update admin: ${error.message}`);
  }
};

/**
 * Deletes an admin's profile from the system.
 * This is a permanent operation and cannot be undone.
 * 
 * @param {string|number} admin_id - Unique identifier of the admin to delete
 * @returns {Promise<Object>} Deleted admin's ID
 * @throws {Error} If admin ID is invalid or admin not found
 */
export const deleteAdmin = async (admin_id) => {
  try {
    // Validate admin_id
    if (!admin_id || isNaN(admin_id)) {
      throw new Error('Invalid admin ID');
    }

    const queryText = `DELETE FROM ${schema}.admin WHERE admin_id = $1 RETURNING admin_id`;
    const { rows } = await pool.query(queryText, [admin_id]);
    if (rows.length === 0) {
      throw new Error('Admin not found');
    }
    console.log(`Successfully deleted admin with ID ${admin_id}`);
    return rows[0];
  } catch (error) {
    console.error(`Error deleting admin with ID ${admin_id}:`, error);
    throw new Error(`Failed to delete admin: ${error.message}`);
  }
};

/**
 * Searches for admin users based on name or email.
 * Performs a case-insensitive search on first name, last name, and email.
 * 
 * @param {string} query - Search term to match against admin records
 * @returns {Promise<Array>} Array of matching admin records
 * @throws {Error} If search query is invalid or database operation fails
 */
export const searchAdmins = async (query) => {
  try {
    // Validate query
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query Ascending: true query parameter must be specified');
    }

    const searchTerm = `%${query}%`;
    const queryText = `
      SELECT * FROM ${schema}.admin
      WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1`;
    const { rows } = await pool.query(queryText, [searchTerm]);
    return rows;
  } catch (error) {
    console.error('Error searching admins:', error);
    throw new Error(`Failed to search admins: ${error.message}`);
  }
};