import { query } from "../db.js";
import bcrypt from 'bcrypt';

const saltRounds = 10;


// Get all donors
export const getDonors = async () => {
  const { rows } = await query('SELECT * FROM bloodlink_schema.donor');
  return rows;
};

// Create a new donor
export const createDonors = async (donorData) => {
  // Destructure role with a default of 'donor'
  const {
    first_name,
    last_name,
    email,
    password,
    phone_number,
    date_of_birth,
    blood_type,
    weight,
    address,
    city,
    latitude,
    longitude,
    last_donation_date,
    is_available,
    medical_conditions,
    date_registered,
    last_login,
    is_active,
    role = 'donor'
  } = donorData;

  // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const { rows } = await query(
    `INSERT INTO bloodlink_schema.donor 
      (first_name, last_name, email, password, phone_number, date_of_birth, blood_type, weight, address, city, latitude, longitude, last_donation_date, is_available, medical_conditions, date_registered, last_login, is_active, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
    [first_name, last_name, email, hashedPassword, phone_number, date_of_birth, blood_type, weight, address, city, latitude, longitude, last_donation_date, is_available, medical_conditions, date_registered, last_login, is_active, role]
  );
  return rows[0];
};


// Update an existing donor
export const updateDonors = async (donorData, donor_id) => {
  const {
    first_name,
    last_name,
    email,
    password,
    phone_number,
    date_of_birth,
    blood_type,
    weight,
    address,
    city,
    latitude,
    longitude,
    last_donation_date,
    is_available,
    medical_conditions,
    date_registered,
    last_login,
    is_active
  } = donorData;

  // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const { rows } = await query(
    `UPDATE bloodlink_schema.donor 
     SET first_name = $1, last_name = $2, email = $3, password = $4, phone_number = $5, date_of_birth = $6, blood_type = $7, weight = $8, address = $9, city = $10, latitude = $11, longitude = $12, last_donation_date = $13, is_available = $14, medical_conditions = $15, date_registered = $16, last_login = $17, is_active = $18
     WHERE donor_id = $19 RETURNING *`,
    [first_name, last_name, email, hashedPassword, phone_number, date_of_birth, blood_type, weight, address, city, latitude, longitude, last_donation_date, is_available, medical_conditions, date_registered, last_login, is_active, donor_id]
  );
  return rows[0];
};

// Delete a donor
export const deleteDonors = async (donor_id) => {
  const { rowCount } = await query(`DELETE FROM bloodlink_schema.donor WHERE donor_id = $1`, [donor_id]);
  return rowCount > 0;
};

// Search donors (by first_name, email, or blood_type)
export const searchDonors = async (searchTerm) => {
  const { rows } = await query(
    `SELECT * FROM bloodlink_schema.donor 
     WHERE first_name ILIKE $1 OR email ILIKE $1 OR blood_type ILIKE $1`,
    [`%${searchTerm}%`]
  );
  return rows;
};
