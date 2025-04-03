// services/clientServices.js
import { pool } from '../index.js'; // Import pool for database queries
import bcrypt from 'bcrypt'; // Import bcrypt for password hashing

const schema = process.env.PG_SCHEMA || 'bloodlink_schema'; // Define schema
const saltRounds = 10; // Define salt rounds for bcrypt

// Fetch all admins
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

// Fetch a single admin by ID
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

// Fetch a single admin by email
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

// Create a new admin
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

// Update an admin
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

// Delete an admin
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

// Search admins by name or email
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