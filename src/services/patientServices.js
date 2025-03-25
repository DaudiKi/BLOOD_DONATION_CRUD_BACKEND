import { query } from "../db.js";
import bcrypt from 'bcrypt';

const saltRounds = 10;

// Get all patients
export const getPatients = async () => {
  const { rows } = await query('SELECT * FROM bloodlink_schema.patient');
  return rows;
};

// Create a new patient
export const createPatients = async (patientData) => {
  // Destructure role with a default of 'patient'
  const {
    first_name,
    last_name,
    email,
    password,
    phone_number,
    date_of_birth,
    blood_type,
    address,
    city,
    latitude,
    longitude,
    medical_conditions,
    emergency_contact_name,
    emergency_contact_phone,
    date_registered,
    last_login,
    is_active,
    role = 'patient'
  } = patientData;
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const { rows } = await query(
    `INSERT INTO bloodlink_schema.patient 
      (first_name, last_name, email, password, phone_number, date_of_birth, blood_type, address, city, latitude, longitude, medical_conditions, emergency_contact_name, emergency_contact_phone, date_registered, last_login, is_active, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
    [first_name, last_name, email, hashedPassword, phone_number, date_of_birth, blood_type, address, city, latitude, longitude, medical_conditions, emergency_contact_name, emergency_contact_phone, date_registered, last_login, is_active, role]
  );
  return rows[0];
};

// Update an existing patient
export const updatePatients = async (patientData, patient_id) => {
  const {
    first_name,
    last_name,
    email,
    password,
    phone_number,
    date_of_birth,
    blood_type,
    address,
    city,
    latitude,
    longitude,
    medical_conditions,
    emergency_contact_name,
    emergency_contact_phone,
    date_registered,
    last_login,
    is_active
  } = patientData;

  // Hash the password
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const { rows } = await query(
    `UPDATE bloodlink_schema.patient 
     SET first_name = $1, last_name = $2, email = $3, password = $4, phone_number = $5, date_of_birth = $6, blood_type = $7, address = $8, city = $9, latitude = $10, longitude = $11, medical_conditions = $12, emergency_contact_name = $13, emergency_contact_phone = $14, date_registered = $15, last_login = $16, is_active = $17
     WHERE patient_id = $18 RETURNING *`,
    [first_name, last_name, email, hashedPassword, phone_number, date_of_birth, blood_type, address, city, latitude, longitude, medical_conditions, emergency_contact_name, emergency_contact_phone, date_registered, last_login, is_active, patient_id]
  );
  return rows[0];
};

// Delete a patient
export const deletePatients = async (patient_id) => {
  const { rowCount } = await query(`DELETE FROM bloodlink_schema.patient WHERE patient_id = $1`, [patient_id]);
  return rowCount > 0;
};

// Search patients (by first_name, email, or blood_type)
export const searchPatients = async (searchTerm) => {
  const { rows } = await query(
    `SELECT * FROM bloodlink_schema.patient 
     WHERE first_name ILIKE $1 OR email ILIKE $1 OR blood_type ILIKE $1`,
    [`%${searchTerm}%`]
  );
  return rows;
};
