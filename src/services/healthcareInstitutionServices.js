import { query } from "../db.js";
import bcrypt from 'bcrypt';

const saltRounds = 10;

// Get all healthcare institutions
export const getHealthcareInstitutes = async () => {
  const { rows } = await query('SELECT * FROM bloodlink_schema.healthcare_institution');
  return rows;
};

// Create a new healthcare institution
export const createHealthcareInstitutes = async (instituteData) => {
  // Destructure role with a default of 'healthcare'
  const {
    name,
    email,
    password,
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
    is_active,
    role = 'healthcare'
  } = instituteData;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const { rows } = await query(
    `INSERT INTO bloodlink_schema.healthcare_institution 
      (name, email, password, phone_number, license_number, address, city, latitude, longitude, institution_type, contact_person_name, contact_person_phone, date_registered, last_login, is_active, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
    [name, email, hashedPassword, phone_number, license_number, address, city, latitude, longitude, institution_type, contact_person_name, contact_person_phone, date_registered, last_login, is_active, role]
  );
  return rows[0];
};


// Update an existing healthcare institution
export const updateHealthcareInstitutes = async (instituteData, institution_id) => {
  const {
    name,
    email,
    password,
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

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const { rows } = await query(
    `UPDATE bloodlink_schema.healthcare_institution 
     SET name = $1, email = $2, password = $3, phone_number = $4, license_number = $5, address = $6, city = $7, latitude = $8, longitude = $9, institution_type = $10, contact_person_name = $11, contact_person_phone = $12, date_registered = $13, last_login = $14, is_active = $15
     WHERE institution_id = $16 RETURNING *`,
    [name, email, hashedPassword, phone_number, license_number, address, city, latitude, longitude, institution_type, contact_person_name, contact_person_phone, date_registered, last_login, is_active, institution_id]
  );
  return rows[0];
};

// Delete a healthcare institution
export const deleteHealthcareInstitutes = async (institution_id) => {
  const { rowCount } = await query(
    `DELETE FROM bloodlink_schema.healthcare_institution WHERE institution_id = $1`,
    [institution_id]
  );
  return rowCount > 0;
};

// Search healthcare institutions (by name, email, or city)
export const searchHealthcareInstitutes = async (searchTerm) => {
  const { rows } = await query(
    `SELECT * FROM bloodlink_schema.healthcare_institution 
     WHERE name ILIKE $1 OR email ILIKE $1 OR city ILIKE $1`,
    [`%${searchTerm}%`]
  );
  return rows;
};
