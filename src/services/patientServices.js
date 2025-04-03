// services/patientServices.js
import { query } from "../db.js";
import bcrypt from "bcrypt";

const saltRounds = 10;

// Get a patient by ID
export const getPatientById = async (patientId) => {
  const { rows } = await query(
    "SELECT * FROM bloodlink_schema.patient WHERE patient_id = $1",
    [patientId]
  );
  return rows[0];
};

// Other functions remain unchanged...
export const getPatientNotifications = async (patientId) => {
  const { rows } = await query(
    `SELECT n.* 
     FROM bloodlink_schema.notification n
     WHERE n.recipient_id = $1 AND n.recipient_type = 'patient'
     ORDER BY n.created_at DESC`,
    [patientId]
  );
  return rows;
};

export const markNotificationAsRead = async (notificationId, patientId) => {
  const { rowCount } = await query(
    `UPDATE bloodlink_schema.notification 
     SET is_read = true 
     WHERE notification_id = $1 AND recipient_id = $2 AND recipient_type = 'patient'`,
    [notificationId, patientId]
  );
  return rowCount > 0;
};

export const getPatientByEmail = async (email) => {
  const { rows } = await query(
    "SELECT * FROM bloodlink_schema.patient WHERE email = $1",
    [email]
  );
  return rows[0];
};

export const getPatients = async () => {
  const { rows } = await query("SELECT * FROM bloodlink_schema.patient");
  return rows;
};

export const createPatients = async (patientData) => {
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
    medical_conditions,
    emergency_contact_name,
    emergency_contact_phone,
    date_registered,
    is_active,
    role = "patient"
  } = patientData;
  
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const { rows } = await query(
    `INSERT INTO bloodlink_schema.patient 
      (first_name, last_name, email, password, phone_number, date_of_birth, blood_type, address, city, medical_conditions, emergency_contact_name, emergency_contact_phone, date_registered, is_active, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
    [
      first_name, last_name, email, hashedPassword, phone_number,
      date_of_birth, blood_type, address, city,
      medical_conditions, emergency_contact_name, emergency_contact_phone,
      date_registered, is_active, role
    ]
  );
  return rows[0];
};

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
    medical_conditions,
    emergency_contact_name,
    emergency_contact_phone,
    date_registered,
    is_active
  } = patientData;

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const { rows } = await query(
    `UPDATE bloodlink_schema.patient 
     SET first_name = $1, last_name = $2, email = $3, password = $4, phone_number = $5, date_of_birth = $6, blood_type = $7, address = $8, city = $9, medical_conditions = $10, emergency_contact_name = $11, emergency_contact_phone = $12, date_registered = $13, is_active = $14
     WHERE patient_id = $15 RETURNING *`,
    [
      first_name, last_name, email, hashedPassword, phone_number,
      date_of_birth, blood_type, address, city,
      medical_conditions, emergency_contact_name, emergency_contact_phone,
      date_registered, is_active, patient_id
    ]
  );
  return rows[0];
};

export const deletePatients = async (patient_id) => {
  const { rowCount } = await query("DELETE FROM bloodlink_schema.patient WHERE patient_id = $1", [patient_id]);
  return rowCount > 0;
};

export const searchPatients = async (searchTerm) => {
  const { rows } = await query(
    `SELECT * FROM bloodlink_schema.patient 
     WHERE first_name ILIKE $1 OR email ILIKE $1 OR blood_type ILIKE $1`,
    [`%${searchTerm}%`]
  );
  return rows;
};