// services/requestService.js
import { query } from "../db.js";

/**
 * Creates a new blood request record in the database.
 * @param {Object} requestData - The data needed to create a blood request.
 * @returns {Object} - The newly created request record.
 */
export const createRequest = async (requestData) => {
  // Destructure fields from requestData to match your table columns
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

  // Build the INSERT query
  // The columns should match exactly those in your blood_request table
  const insertQuery = `
    INSERT INTO bloodlink_schema.blood_request
      (patient_id, institution_id, blood_type, units_needed, urgency_level,
       request_date, required_by_date, request_status, request_notes,
       location_latitude, location_longitude)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;

  // Prepare the values array
  // You can provide defaults if any fields are optional
  const values = [
    patient_id || null,
    institution_id || null,
    blood_type || null,
    units_needed || null,
    urgency_level || null,
    request_date || new Date(),      // or rely on DB defaults if you prefer
    required_by_date || null,
    request_status || 'pending',     // or your preferred default status
    request_notes || '',
    location_latitude || null,
    location_longitude || null
  ];

  // Execute the query
  const { rows } = await query(insertQuery, values);

  // Return the newly inserted row
  return rows[0];
};
