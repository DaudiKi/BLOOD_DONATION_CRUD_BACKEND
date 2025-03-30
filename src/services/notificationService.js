import { query } from '../db.js';
import Joi from 'joi';

// Define notification validation schema
const notificationSchema = Joi.object({
  recipient_type: Joi.string().valid('donor', 'patient', 'healthcare_institution', 'admin').required(),
  recipient_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  notification_type: Joi.string().required(),
  notification_title: Joi.string().required(),
  notification_message: Joi.string().required(),
  related_request_id: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null),
  related_match_id: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(null)
});

/**
 * Creates a new notification in the database.
 * @param {Object} notificationData - The notification data to insert.
 * @param {Object} io - Socket.IO instance for real-time notifications.
 * @returns {Object} The created notification.
 */
export const createNotification = async (notificationData, io) => {
  // Validate input data
  const { error } = notificationSchema.validate(notificationData);
  if (error) {
    throw new Error('Invalid notification data: ' + error.details[0].message);
  }

  const {
    recipient_type,
    recipient_id,
    notification_type,
    notification_title,
    notification_message,
    related_request_id,
    related_match_id
  } = notificationData;

  const insertQuery = `
    INSERT INTO bloodlink_schema.notification 
      (recipient_type, recipient_id, notification_type, notification_title, notification_message, related_request_id, related_match_id, is_read, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, false, CURRENT_TIMESTAMP)
    RETURNING *;
  `;

  const values = [
    recipient_type,
    recipient_id,
    notification_type,
    notification_title,
    notification_message,
    related_request_id || null,
    related_match_id || null
  ];

  try {
    const { rows } = await query(insertQuery, values);
    const newNotification = rows[0];

    // Broadcast notification via Socket.IO if available
    if (io) {
      io.to(`user_${recipient_id}`).emit('notification', newNotification);
    }

    return newNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Failed to create notification: ' + error.message);
  }
};

/**
 * Gets notifications for a specific user.
 * @param {string} userId - The user's ID.
 * @param {string} userType - The user's type (patient, donor, healthcare_institution).
 * @returns {Array} List of notifications.
 */
export const getNotifications = async (userId, userType) => {
  const selectQuery = `
    SELECT * FROM bloodlink_schema.notification
    WHERE recipient_id = $1 AND recipient_type = $2
    ORDER BY created_at DESC;
  `;

  try {
    const { rows } = await query(selectQuery, [userId, userType]);
    return rows;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new Error('Failed to fetch notifications: ' + error.message);
  }
};

/**
 * Marks a notification as read.
 * @param {string} notificationId - The notification ID.
 * @returns {Object} The updated notification.
 */
export const markNotificationAsRead = async (notificationId) => {
  if (!notificationId) {
    throw new Error('Notification ID is required');
  }
  
  const updateQuery = `
    UPDATE bloodlink_schema.notification
    SET is_read = true
    WHERE notification_id = $1
    RETURNING *;
  `;

  try {
    const { rows } = await query(updateQuery, [notificationId]);
    if (rows.length === 0) {
      throw new Error('Notification not found');
    }
    return rows[0];
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read: ' + error.message);
  }
};
