import { query } from '../db.js';
import dotenv from 'dotenv';
import * as notificationService from './notificationService.js';

dotenv.config();

/**
 * Creates a new blood request record in the database.
 * @param {Object} requestData - The data needed to create a blood request.
 * @param {Object} io - Socket.IO instance for real-time notifications.
 * @returns {Object} - The newly created request record.
 */
export const createRequest = async (requestData, io) => {
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
      requestData.patient_id,
      requestData.institution_id || null,
      requestData.blood_type,
      requestData.units_needed,
      requestData.urgency_level,
      requestData.required_by_date,
      requestData.request_notes,
      'Pending', // Initial status
      requestData.location_latitude || 0.0,
      requestData.location_longitude || 0.0
    ];

    console.log('Creating blood request with values:', values);

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
        CURRENT_DATE - last_donation_date as days_since_donation
      FROM bloodlink_schema.donor 
      WHERE blood_type = $1 
      AND (is_active IS NULL OR is_active = true)
      AND (last_donation_date IS NULL OR last_donation_date < CURRENT_DATE - INTERVAL '3 months')`;
    
    const compatibleDonors = await query(compatibleDonorsQuery, [requestData.blood_type]);
    console.log('Compatible donors query result:', compatibleDonors.rows);
    console.log(`Found ${compatibleDonors.rows.length} compatible donors for blood type ${requestData.blood_type}`);

    // Create notifications for compatible donors
    const donorNotificationPromises = compatibleDonors.rows.map(donor => {
      console.log(`Creating notification for donor ${donor.donor_id} with blood type ${donor.blood_type}`);
      return notificationService.createNotification({
        recipient_id: donor.donor_id,
        recipient_type: 'donor',
        notification_type: 'blood_request',
        notification_title: 'New Blood Request',
        notification_message: `Urgent blood request for ${requestData.blood_type} blood type. ${requestData.units_needed} units needed by ${new Date(requestData.required_by_date).toLocaleDateString()}`,
        related_request_id: newRequest.request_id
      }, io);
    });

    // Find admin users
    const adminQuery = `
      SELECT institution_id 
      FROM bloodlink_schema.healthcare_institution 
      WHERE role = 'admin'`;
    
    try {
      const [adminResult] = await Promise.all([
        query(adminQuery),
        Promise.all(donorNotificationPromises)
      ]);

      // Create notifications for all admin users
      const adminNotificationPromises = adminResult.rows.map(admin =>
        notificationService.createNotification({
          recipient_id: admin.institution_id,
          recipient_type: 'admin',
          notification_type: 'blood_request',
          notification_title: 'New Blood Request Created',
          notification_message: `New ${requestData.blood_type} blood request created. ${requestData.units_needed} units needed.`,
          related_request_id: newRequest.request_id
        }, io)
      );

      await Promise.all(adminNotificationPromises);
    } catch (error) {
      // Log error but don't fail the request creation
      console.error('Error creating admin notifications:', error);
    }

    return newRequest;

  } catch (error) {
    console.error('Error in createRequest:', error);
    throw new Error('Failed to create blood request: ' + error.message);
  }
};

export const getRequestsByPatient = async (patientId) => {
  try {
    const selectQuery = `
      SELECT 
        br.*,
        hi.name as institution_name,
        hi.address as institution_address,
        hi.city as institution_city
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
    throw new Error('Failed to fetch patient requests: ' + error.message);
  }
};

export const updateRequestStatus = async (requestId, status) => {
  try {
    const updateQuery = `
      UPDATE bloodlink_schema.blood_request 
      SET request_status = $1, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE request_id = $2 
      RETURNING *;
    `;

    const result = await query(updateQuery, [status, requestId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateRequestStatus:', error);
    throw new Error('Failed to update request status: ' + error.message);
  }
};

export const getRequestById = async (requestId) => {
  try {
    const selectQuery = `
      SELECT * FROM bloodlink_schema.blood_request 
      WHERE request_id = $1;
    `;
    const result = await query(selectQuery, [requestId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error in getRequestById:', error);
    throw new Error('Failed to fetch request: ' + error.message);
  }
};

// TODO: Integrate a more robust logging mechanism for production (e.g., using Winston)
