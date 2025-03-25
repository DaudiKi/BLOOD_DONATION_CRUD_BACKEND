import { query } from '../db.js';

export const createNotification = async (notificationData, io) => {
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
      (recipient_type, recipient_id, notification_type, notification_title, notification_message, related_request_id, related_match_id, is_read)
    VALUES ($1, $2, $3, $4, $5, $6, $7, false)
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

  const { rows } = await query(insertQuery, values);
  const newNotification = rows[0];

  // Broadcast notification via Socket.IO if available
  if (io) {
    io.to(`user_${recipient_id}`).emit('notification', newNotification);
  }

  return newNotification;
};
