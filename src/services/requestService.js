// services/requestService.js
import { query } from "../db.js";

/**
 * Creates a new blood request record in the database.
 * @param {Object} requestData - The data needed to create a blood request.
 * @returns {Object} - The newly created request record.
 */
export const createRequest = async (requestData) => {
  const {
    patient_id,
    institution_id,
    blood_type,
    units_needed,
    urgency_level,
    request_date,
    required_by_date,
    request_status,
    request_notes,
    location_latitude,
    location_longitude
  } = requestData;

  // Validate required fields
  if (!blood_type) {
    throw new Error('blood_type is required.');
  }
  if (!units_needed || !Number.isInteger(units_needed) || units_needed <= 0) {
    throw new Error('units_needed must be a positive integer.');
  }
  if (!urgency_level || !['Low', 'Medium', 'High'].includes(urgency_level)) {
    throw new Error('urgency_level must be one of: Low, Medium, High.');
  }
  if (!required_by_date) {
    throw new Error('required_by_date is required.');
  }

  // Validate location fields
  if (location_latitude === null || location_latitude === undefined) {
    throw new Error('location_latitude is required.');
  }
  if (location_longitude === null || location_longitude === undefined) {
    throw new Error('location_longitude is required.');
  }
  if (location_latitude < -90 || location_latitude > 90) {
    throw new Error('location_latitude must be between -90 and 90.');
  }
  if (location_longitude < -180 || location_longitude > 180) {
    throw new Error('location_longitude must be between -180 and 180.');
  }

  // Build the INSERT query
  const insertQuery = `
    INSERT INTO bloodlink_schema.blood_request
      (patient_id, institution_id, blood_type, units_needed, urgency_level,
       request_date, required_by_date, request_status, request_notes,
       location_latitude, location_longitude)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;

  // Prepare the values array
  const values = [
    patient_id || null,
    institution_id || null,
    blood_type,
    units_needed,
    urgency_level,
    request_date || new Date(),
    required_by_date,
    request_status || 'pending',
    request_notes || '',
    location_latitude,
    location_longitude
  ];

  // Execute the query
  const { rows } = await query(insertQuery, values);

  // Return the newly inserted row
  return rows[0];
};