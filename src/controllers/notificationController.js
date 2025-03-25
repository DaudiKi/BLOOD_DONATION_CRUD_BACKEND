import { query } from '../db.js';

/**
 * Marks a notification as read by updating the is_read column to true.
 * Expects the notification_id as a URL parameter.
 */
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

/**
 * Retrieves notifications for a given user.
 * Expects the userId either from req.user (if authenticated) or from query parameter.
 */
export const getNotifications = async (req, res) => {
  try {
    // Preferably, use req.user.userId if available
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
