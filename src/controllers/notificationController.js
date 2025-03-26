import { query } from '../db.js';
import { createNotification } from '../services/notificationService.js';

// Accept a Blood Request
export const acceptBloodRequest = async (req, res) => {
  const { requestId } = req.params;
  const { donorId } = req.body;
  const updateQuery = `
    UPDATE bloodlink_schema.blood_request
    SET request_status = 'Matched', matched_donor_id = $1
    WHERE request_id = $2
    RETURNING *;
  `;
  try {
    const { rows } = await query(updateQuery, [donorId, requestId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const request = rows[0];

    // Access the Socket.IO instance
    const io = req.app.get('io');

    // Emit a 'requestAction' event to notify patient, institution, and admin
    io.emit('requestAction', {
      requestId,
      action: 'accepted',
      donorId,
      patientId: request.patient_id,
      institutionId: request.institution_id,
      notification_message: `Donor accepted blood request for ${request.blood_type} (${request.units_needed} units)`
    });

    // Create notifications for patient and institution
    if (request.patient_id) {
      await createNotification({
        recipient_type: 'patient',
        recipient_id: request.patient_id,
        notification_type: 'request_accepted',
        notification_title: 'Blood Request Accepted',
        notification_message: `A donor has accepted your request for ${request.blood_type} (${request.units_needed} units)`,
        related_request_id: requestId
      }, io);
    }

    if (request.institution_id) {
      await createNotification({
        recipient_type: 'institution',
        recipient_id: request.institution_id,
        notification_type: 'request_accepted',
        notification_title: 'Blood Request Accepted',
        notification_message: `A donor has accepted the request for ${request.blood_type} (${request.units_needed} units)`,
        related_request_id: requestId
      }, io);
    }

    return res.status(200).json(request);
  } catch (error) {
    console.error('Error accepting blood request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject a Blood Request
export const rejectBloodRequest = async (req, res) => {
  const { requestId } = req.params;
  const updateQuery = `
    UPDATE bloodlink_schema.blood_request
    SET request_status = 'Pending', matched_donor_id = NULL
    WHERE request_id = $1
    RETURNING *;
  `;
  try {
    const { rows } = await query(updateQuery, [requestId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const request = rows[0];

    // Access the Socket.IO instance
    const io = req.app.get('io');

    // Emit a 'requestAction' event to notify patient, institution, and admin
    io.emit('requestAction', {
      requestId,
      action: 'rejected',
      donorId: null,
      patientId: request.patient_id,
      institutionId: request.institution_id,
      notification_message: `Donor rejected blood request for ${request.blood_type} (${request.units_needed} units)`
    });

    // Create notifications for patient and institution
    if (request.patient_id) {
      await createNotification({
        recipient_type: 'patient',
        recipient_id: request.patient_id,
        notification_type: 'request_rejected',
        notification_title: 'Blood Request Rejected',
        notification_message: `A donor has rejected your request for ${request.blood_type} (${request.units_needed} units)`,
        related_request_id: requestId
      }, io);
    }

    if (request.institution_id) {
      await createNotification({
        recipient_type: 'institution',
        recipient_id: request.institution_id,
        notification_type: 'request_rejected',
        notification_title: 'Blood Request Rejected',
        notification_message: `A donor has rejected the request for ${request.blood_type} (${request.units_needed} units)`,
        related_request_id: requestId
      }, io);
    }

    return res.status(200).json(request);
  } catch (error) {
    console.error('Error rejecting blood request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get All Blood Requests (for Admin)
export const getAllBloodRequests = async (req, res) => {
  try {
    const selectQuery = `
      SELECT br.*, 
             p.first_name AS patient_name, 
             hi.name AS institution_name, 
             d.first_name AS donor_name
      FROM bloodlink_schema.blood_request br
      LEFT JOIN bloodlink_schema.users p ON br.patient_id = p.user_id
      LEFT JOIN bloodlink_schema.healthcare_institution hi ON br.institution_id = hi.institution_id
      LEFT JOIN bloodlink_schema.users d ON br.matched_donor_id = d.user_id
      ORDER BY br.request_date DESC;
    `;
    const { rows } = await query(selectQuery);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching blood requests:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Existing Notification Functions
export const markNotificationRead = async (req, res) => {
  try {
    const { notification_id } = req.params;
    const updateQuery = `
      UPDATE bloodlink_schema.notification
      SET is_read = true
      WHERE notification_id = $1
      RETURNING *;
    `;
    const { rows } = await query(updateQuery, [notification_id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    return res.status(200).json({
      message: 'Notification marked as read',
      notification: rows[0]
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId || req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required to fetch notifications.' });
    }
    const selectQuery = `
      SELECT * FROM bloodlink_schema.notification
      WHERE recipient_id = $1
      ORDER BY created_at DESC;
    `;
    const { rows } = await query(selectQuery, [userId]);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};