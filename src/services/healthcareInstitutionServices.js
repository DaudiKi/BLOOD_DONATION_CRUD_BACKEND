// services/healthcareInstitutionServices.js
import { query } from "../db.js";
import bcrypt from 'bcrypt';

const saltRounds = 10;

// Get all healthcare institutions
export const getHealthcareInstitutes = async () => {
  try {
    const { rows } = await query('SELECT * FROM bloodlink_schema.healthcare_institution');
    return rows;
  } catch (error) {
    console.error('Error in getHealthcareInstitutes:', error.message);
    throw error;
  }
};

// Get a specific healthcare institution by ID
export const getHealthcareInstitutionById = async (institutionId) => {
  try {
    const { rows } = await query(
      'SELECT * FROM bloodlink_schema.healthcare_institution WHERE institution_id = $1',
      [institutionId]
    );
    return rows[0];
  } catch (error) {
    console.error('Error in getHealthcareInstitutionById:', error.message);
    throw error;
  }
};

// Create a new healthcare institution
export const createInstitution = async (instituteData) => {
  try {
    const {
      name,
      email,
      password, // Expects a pre-hashed password
      phone_number,
      license_number,
      address,
      city,
      latitude,
      longitude,
      institution_type,
      contact_person_name,
      contact_person_phone,
      date_registered = new Date(), // Default to current timestamp
      last_login = null, // Default to null
      is_active = true, // Default to true
      role = 'healthcare_institution'
    } = instituteData;

    // Validate required fields
    if (!name || !email || !password || !license_number || !address || !city || !institution_type) {
      throw new Error('Missing required fields for creating healthcare institution');
    }

    const { rows } = await query(
      `INSERT INTO bloodlink_schema.healthcare_institution 
        (name, email, password, phone_number, license_number, address, city, latitude, longitude, institution_type, contact_person_name, contact_person_phone, date_registered, last_login, is_active, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [name, email, password, phone_number, license_number, address, city, latitude, longitude, institution_type, contact_person_name, contact_person_phone, date_registered, last_login, is_active, role]
    );
    return rows[0];
  } catch (error) {
    console.error('Error in createInstitution:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
};

// Update an existing healthcare institution
export const updateInstitution = async (instituteData, institution_id) => {
  try {
    const {
      name,
      email,
      password, // Expects a pre-hashed password
      phone_number,
      license_number,
      address,
      city,
      latitude,
      longitude,
      institution_type,
      contact_person_name,
      contact_person_phone,
      date_registered,
      last_login,
      is_active
    } = instituteData;

    const { rows } = await query(
      `UPDATE bloodlink_schema.healthcare_institution 
       SET name = $1, email = $2, password = $3, phone_number = $4, license_number = $5, address = $6, city = $7, latitude = $8, longitude = $9, institution_type = $10, contact_person_name = $11, contact_person_phone = $12, date_registered = $13, last_login = $14, is_active = $15
       WHERE institution_id = $16 RETURNING *`,
      [name, email, password, phone_number, license_number, address, city, latitude, longitude, institution_type, contact_person_name, contact_person_phone, date_registered, last_login, is_active, institution_id]
    );
    return rows[0];
  } catch (error) {
    console.error('Error in updateInstitution:', error.message);
    throw error;
  }
};

// Delete a healthcare institution
export const deleteInstitution = async (institution_id) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM bloodlink_schema.healthcare_institution WHERE institution_id = $1`,
      [institution_id]
    );
    return rowCount > 0;
  } catch (error) {
    console.error('Error in deleteInstitution:', error.message);
    throw error;
  }
};

// Search healthcare institutions (by name, email, or city)
export const searchHealthcareInstitutes = async (searchTerm) => {
  try {
    const { rows } = await query(
      `SELECT * FROM bloodlink_schema.healthcare_institution 
       WHERE name ILIKE $1 OR email ILIKE $1 OR city ILIKE $1`,
      [`%${searchTerm}%`]
    );
    return rows;
  } catch (error) {
    console.error('Error in searchHealthcareInstitutes:', error.message);
    throw error;
  }
};

// Get healthcare institution by email for duplicate-checking in signup logic
export const getHealthcareInstitutionByEmail = async (email) => {
  try {
    const { rows } = await query(
      'SELECT * FROM bloodlink_schema.healthcare_institution WHERE email = $1',
      [email]
    );
    return rows[0];
  } catch (error) {
    console.error('Error in getHealthcareInstitutionByEmail:', error.message);
    throw error;
  }
};