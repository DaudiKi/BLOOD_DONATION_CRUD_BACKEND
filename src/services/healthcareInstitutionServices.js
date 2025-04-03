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
      password,
      phone_number,
      address,
      city,
      institution_type,
      contact_person_name,
      contact_person_phone,
      date_registered = new Date(),
      is_active = true,
      role = 'healthcare_institution'
    } = instituteData;

    // Validate required fields
    if (!name || !email || !password || !address || !city || !institution_type) {
      throw new Error('Missing required fields for creating healthcare institution');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const { rows } = await query(
      `INSERT INTO bloodlink_schema.healthcare_institution 
        (name, email, password, phone_number, address, city, institution_type, contact_person_name, contact_person_phone, date_registered, is_active, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [name, email, hashedPassword, phone_number, address, city, institution_type, contact_person_name, contact_person_phone, date_registered, is_active, role]
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
      password,
      phone_number,
      address,
      city,
      institution_type,
      contact_person_name,
      contact_person_phone,
      date_registered,
      is_active
    } = instituteData;

    // Hash the password if it's provided
    let hashedPassword = password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }

    const { rows } = await query(
      `UPDATE bloodlink_schema.healthcare_institution 
       SET name = $1, email = $2, password = $3, phone_number = $4, address = $5, city = $6, institution_type = $7, contact_person_name = $8, contact_person_phone = $9, date_registered = $10, is_active = $11
       WHERE institution_id = $12 RETURNING *`,
      [name, email, hashedPassword, phone_number, address, city, institution_type, contact_person_name, contact_person_phone, date_registered, is_active, institution_id]
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