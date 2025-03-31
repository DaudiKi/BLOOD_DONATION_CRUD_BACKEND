import { query } from '../db.js';
import dotenv from 'dotenv';
import * as notificationService from './notificationService.js';

dotenv.config();

/**
 * Creates a new blood request record in the database and notifies compatible donors and admins.
 * @param {Object} requestData - The data for the blood request.
 * @param {string|number} [requestData.patient_id] - ID of the patient making the request.
 * @param {string|number|null} [requestData.institution_id] - ID of the institution, if applicable.
 * @param {string} requestData.blood_type - Blood type (e.g., 'A+', 'O-').
 * @param {number} requestData.units_needed - Number of blood units required.
 * @param {string} requestData.urgency_level - Urgency level (e.g., 'high', 'medium', 'low').
 * @param {Date|string} requestData.required_by_date - Date by which blood is needed.
 * @param {string} [requestData.request_notes] - Additional notes for the request.
 * @param {number} [requestData.location_latitude] - Latitude of the request location.
 * @param {number} [requestData.location_longitude] - Longitude of the request location.
 * @param {Object} io - Socket.IO instance for real-time notifications.
 * @returns {Promise<Object>} - The created request record.
 * @throws {Error} - If the request creation or notification process fails.
 */
export const createRequest = async (requestData, io) => {
  // Basic validation
  const requiredFields = ['blood_type', 'units_needed', 'urgency_level', 'required_by_date'];
  const missingFields = requiredFields.filter(field => !requestData[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  try {
    const insertQuery = `
      INSERT INTO bloodlink_schema.blood_request (
        patient_id,
        institution_id,
        blood_type,
        units_needed,
        urgency_level,
        required_by_date,
        request_notes,
        request_status,
        request_date,
        location_latitude,
        location_longitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, $10)
      RETURNING *;
    `;

    const values = [
      requestData.patient_id || null,
      requestData.institution_id || null,
      requestData.blood_type,
      requestData.units_needed,
      requestData.urgency_level,
      requestData.required_by_date,
      requestData.request_notes || '',
      'Pending',
      requestData.location_latitude || null,
      requestData.location_longitude || null
    ];

    console.log('Creating blood request with values:', values); // Replace with logger in production

    const result = await query(insertQuery, values);
    const newRequest = result.rows[0];
    console.log('Blood request created successfully:', newRequest);

    // Find compatible donors
    const compatibleDonorsQuery = `
      SELECT 
        donor_id, 
        blood_type,
        is_active,
        last_donation_date,
        CURRENT_DATE - last_donation_date AS days_since_donation
      FROM bloodlink_schema.donor 
      WHERE blood_type = $1 
      AND (is_active IS NULL OR is_active = true)
      AND (last_donation_date IS NULL OR last_donation_date < CURRENT_DATE - INTERVAL '3 months')
    `;
    
    const compatibleDonors = await query(compatibleDonorsQuery, [requestData.blood_type]);
    console.log(`Found ${compatibleDonors.rows.length} compatible donors for blood type ${requestData.blood_type}`);

    // Notify compatible donors
    const donorNotifications = compatibleDonors.rows.map(donor => {
      console.log(`Creating notification for donor ${donor.donor_id}`);
      return notificationService.createNotification({
        recipient_id: donor.donor_id,
        recipient_type: 'donor',
        notification_type: 'blood_request',
        notification_title: 'New Blood Request',
        notification_message: `Urgent blood request for ${requestData.blood_type}. ${requestData.units_needed} units needed by ${new Date(requestData.required_by_date).toLocaleDateString()}`,
        related_request_id: newRequest.request_id
      }, io);
    });

    // Notify admins
    const adminQuery = `
      SELECT institution_id 
      FROM bloodlink_schema.healthcare_institution 
      WHERE role = 'admin'
    `;
    
    const adminResult = await query(adminQuery);
    const adminNotifications = adminResult.rows.map(admin => {
      console.log(`Creating notification for admin ${admin.institution_id}`);
      return notificationService.createNotification({
        recipient_id: admin.institution_id,
        recipient_type: 'admin',
        notification_type: 'blood_request',
        notification_title: 'New Blood Request Created',
        notification_message: `New ${requestData.blood_type} request: ${requestData.units_needed} units needed.`,
        related_request_id: newRequest.request_id
      }, io);
    });

    // Execute notifications concurrently but don't fail request if they fail
    await Promise.all([...donorNotifications, ...adminNotifications]).catch(error => {
      console.error('Failed to send some notifications:', error);
    });

    return newRequest;
  } catch (error) {
    console.error('Error in createRequest:', error);
    throw new Error(`Failed to create blood request: ${error.message}`);
  }
};

/**
 * Retrieves all blood requests for a specific patient.
 * @param {string|number} patientId - The ID of the patient.
 * @returns {Promise<Object[]>} - Array of request records with institution details.
 * @throws {Error} - If the query fails.
 */
export const getRequestsByPatient = async (patientId) => {
  if (!patientId) throw new Error('Patient ID is required');

  try {
    const selectQuery = `
      SELECT 
        br.request_id,
        br.blood_type,
        br.units_needed,
        br.urgency_level,
        br.required_by_date,
        br.request_notes,
        br.request_status,
        br.request_date,
        hi.name AS institution_name,
        hi.address AS institution_address,
        hi.city AS institution_city
      FROM bloodlink_schema.blood_request br
      LEFT JOIN bloodlink_schema.healthcare_institution hi 
        ON br.institution_id = hi.institution_id
      WHERE br.patient_id = $1 
      ORDER BY br.request_date DESC;
    `;
    const result = await query(selectQuery, [patientId]);
    return result.rows;
  } catch (error) {
    console.error('Error in getRequestsByPatient:', error);
    throw new Error(`Failed to fetch patient requests: ${error.message}`);
  }
};

/**
 * Updates the status of a blood request.
 * @param {string|number} requestId - The ID of the request to update.
 * @param {string} status - The new status (e.g., 'Pending', 'Fulfilled').
 * @returns {Promise<Object>} - The updated request record.
 * @throws {Error} - If the update fails.
 */
export const updateRequestStatus = async (requestId, status) => {
  if (!requestId || !status) throw new Error('Request ID and status are required');

  try {
    const updateQuery = `
      UPDATE bloodlink_schema.blood_request 
      SET request_status = $1, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE request_id = $2 
      RETURNING *;
    `;
    const result = await query(updateQuery, [status, requestId]);
    if (result.rows.length === 0) throw new Error('Request not found');
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateRequestStatus:', error);
    throw new Error(`Failed to update request status: ${error.message}`);
  }
};

/**
 * Retrieves a blood request by its ID.
 * @param {string|number} requestId - The ID of the request.
 * @returns {Promise<Object>} - The request record.
 * @throws {Error} - If the query fails or request is not found.
 */
export const getRequestById = async (requestId) => {
  if (!requestId) throw new Error('Request ID is required');

  try {
    const selectQuery = `
      SELECT * FROM bloodlink_schema.blood_request 
      WHERE request_id = $1;
    `;
    const result = await query(selectQuery, [requestId]);
    if (result.rows.length === 0) throw new Error('Request not found');
    return result.rows[0];
  } catch (error) {
    console.error('Error in getRequestById:', error);
    throw new Error(`Failed to fetch request: ${error.message}`);
  }
};

/**
 * Retrieves all pending blood requests for donors to view.
 * @returns {Promise<Object[]>} - Array of pending request records.
 * @throws {Error} - If the query fails.
 */
export const getAllRequests = async () => {
  try {
    const selectQuery = `
      SELECT 
        request_id AS "requestId",
        blood_type AS "bloodType",
        units_needed AS "unitsNeeded",
        urgency_level AS urgency,
        institution_id,
        request_status AS status,
        request_date
      FROM bloodlink_schema.blood_request
      WHERE request_status = 'Pending'
      ORDER BY request_date DESC
      LIMIT 100; -- Prevent overload, add pagination later
    `;
    const result = await query(selectQuery);
    return result.rows.map(row => ({
      requestId: row.requestId,
      bloodType: row.bloodType,
      unitsNeeded: row.unitsNeeded,
      urgency: row.urgency,
      location: row.institution_id ? 'Institution' : 'Patient',
      status: row.status
    }));
  } catch (error) {
    console.error('Error in getAllRequests:', error);
    throw new Error(`Failed to fetch requests: ${error.message}`);
  }
};

// TODO: Implement pagination for getAllRequests
// TODO: Replace console.log with a logging library like Winston for production