// services/donorServices.js
import { query } from "../db.js";
import bcrypt from 'bcrypt';
import Joi from 'joi';

const saltRounds = 10;

// Schema for creating a donor
const donorCreateSchema = Joi.object({
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone_number: Joi.string().optional(),
  date_of_birth: Joi.date().required(),
  blood_type: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').required(),
  weight: Joi.number().optional(),
  address: Joi.string().optional(),
  city: Joi.string().optional(),
  last_donation_date: Joi.date().optional().allow(null),
  is_available: Joi.boolean().optional(),
  medical_conditions: Joi.string().optional().allow(''),
  date_registered: Joi.date().optional(),
  is_active: Joi.boolean().optional(),
  role: Joi.string().default('donor')
});

// Schema for updating a donor
const donorUpdateSchema = Joi.object({
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone_number: Joi.string().optional(),
  date_of_birth: Joi.date().required(),
  blood_type: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').required(),
  weight: Joi.number().optional(),
  address: Joi.string().optional(),
  city: Joi.string().optional(),
  last_donation_date: Joi.date().optional().allow(null),
  is_available: Joi.boolean().optional(),
  medical_conditions: Joi.string().optional().allow(''),
  date_registered: Joi.date().optional(),
  is_active: Joi.boolean().optional()
});

// Get all donors
export const getDonors = async () => {
  try {
    const { rows } = await query('SELECT * FROM bloodlink_schema.donor');
    return rows;
  } catch (error) {
    console.error('Error fetching donors:', error);
    throw new Error('Failed to fetch donors');
  }
};

// Get donor by email (for duplicate-checking)
export const getDonorByEmail = async (email) => {
  try {
    const { rows } = await query(
      'SELECT * FROM bloodlink_schema.donor WHERE email = $1',
      [email]
    );
    return rows[0];
  } catch (error) {
    console.error('Error fetching donor by email:', error);
    throw new Error('Failed to fetch donor by email');
  }
};

// Create a new donor
export const createDonors = async (donorData) => {
  // Validate donor data
  const { error, value } = donorCreateSchema.validate(donorData);
  if (error) {
    throw new Error('Invalid donor data: ' + error.details[0].message);
  }

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
    last_donation_date,
    is_available,
    medical_conditions,
    date_registered,
    is_active,
    role
  } = value;

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  try {
    const { rows } = await query(
      `INSERT INTO bloodlink_schema.donor 
        (first_name, last_name, email, password, phone_number, date_of_birth, blood_type, weight, address, city, last_donation_date, is_available, medical_conditions, date_registered, is_active, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        first_name, last_name, email, hashedPassword, phone_number,
        date_of_birth, blood_type, weight, address, city, last_donation_date, is_available,
        medical_conditions, date_registered, is_active, role
      ]
    );
    return rows[0];
  } catch (error) {
    console.error('Error creating donor:', error);
    throw new Error('Failed to create donor: ' + error.message);
  }
};

// Update an existing donor
export const updateDonors = async (donorData, donor_id) => {
  // Validate donor data
  const { error, value } = donorUpdateSchema.validate(donorData);
  if (error) {
    throw new Error('Invalid donor data: ' + error.details[0].message);
  }

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
    last_donation_date,
    is_available,
    medical_conditions,
    date_registered,
    is_active
  } = value;

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  try {
    const { rows } = await query(
      `UPDATE bloodlink_schema.donor 
       SET first_name = $1, last_name = $2, email = $3, password = $4, phone_number = $5, date_of_birth = $6, blood_type = $7, weight = $8, address = $9, city = $10, last_donation_date = $13, is_available = $14, medical_conditions = $15, date_registered = $16, is_active = $18
       WHERE donor_id = $19 RETURNING *`,
      [
        first_name, last_name, email, hashedPassword, phone_number,
        date_of_birth, blood_type, weight, address, city, last_donation_date, is_available,
        medical_conditions, date_registered, is_active, donor_id
      ]
    );
    return rows[0];
  } catch (error) {
    console.error('Error updating donor:', error);
    throw new Error('Failed to update donor: ' + error.message);
  }
};

// Delete a donor
export const deleteDonors = async (donor_id) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM bloodlink_schema.donor WHERE donor_id = $1`,
      [donor_id]
    );
    return rowCount > 0;
  } catch (error) {
    console.error('Error deleting donor:', error);
    throw new Error('Failed to delete donor: ' + error.message);
  }
};

// Search donors (by first_name, email, or blood_type)
export const searchDonors = async (searchTerm) => {
  try {
    const { rows } = await query(
      `SELECT * FROM bloodlink_schema.donor 
       WHERE first_name ILIKE $1 OR email ILIKE $1 OR blood_type ILIKE $1`,
      [`%${searchTerm}%`]
    );
    return rows;
  } catch (error) {
    console.error('Error searching donors:', error);
    throw new Error('Failed to search donors: ' + error.message);
  }
};

// Get donors by blood type
export const getDonorsByBloodType = async (bloodType) => {
  try {
    const { rows } = await query(
      'SELECT * FROM bloodlink_schema.donor WHERE blood_type = $1',
      [bloodType]
    );
    return rows;
  } catch (error) {
    console.error('Error in getDonorsByBloodType:', error);
    throw new Error('Failed to fetch donors by blood type');
  }
};

export const getDonorById = async (donorId) => {
  try {
    const { rows } = await query(
      'SELECT * FROM bloodlink_schema.donor WHERE donor_id = $1',
      [donorId]
    );
    return rows[0];
  } catch (error) {
    console.error('Error in getDonorById:', error);
    throw new Error('Failed to fetch donor');
  }
};

export const updateDonor = async (donorId, updateData) => {
  try {
    const allowedFields = [
      'phone_number',
      'address',
      'city',
      'last_donation_date',
      'is_active'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(donorId);
    const updateQuery = `
      UPDATE bloodlink_schema.donor 
      SET ${updates.join(', ')}, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE donor_id = $${paramCount} 
      RETURNING *
    `;

    const { rows } = await query(updateQuery, values);
    return rows[0];
  } catch (error) {
    console.error('Error in updateDonor:', error);
    throw new Error('Failed to update donor');
  }
};

export const getDonorDashboardData = async (donorId) => {
  try {
    // Get donor profile
    const donorQuery = 'SELECT * FROM bloodlink_schema.donor WHERE donor_id = $1';
    const donorResult = await query(donorQuery, [donorId]);
    const donor = donorResult.rows[0];

    // Get donation history
    const historyQuery = `
      SELECT * FROM bloodlink_schema.donation_history 
      WHERE donor_id = $1 
      ORDER BY donation_date DESC
    `;
    const historyResult = await query(historyQuery, [donorId]);

    // Get active blood requests matching donor's blood type
    const requestsQuery = `
      SELECT * FROM bloodlink_schema.blood_request 
      WHERE blood_type = $1 
      AND request_status = 'Pending' 
      ORDER BY request_date DESC
    `;
    const requestsResult = await query(requestsQuery, [donor.blood_type]);

    return {
      profile: donor,
      donationHistory: historyResult.rows,
      matchingRequests: requestsResult.rows
    };
  } catch (error) {
    console.error('Error in getDonorDashboardData:', error);
    throw new Error('Failed to fetch dashboard data');
  }
};
