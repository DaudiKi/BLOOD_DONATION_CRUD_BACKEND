import * as notificationService from '../services/notificationService.js';

/**
 * Marks a notification as read by updating the is_read column to true.
 * Expects the notification_id as a URL parameter.
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { notification_id } = req.params;
    if (!notification_id) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }
    const updatedNotification = await notificationService.markNotificationAsRead(notification_id);
    
    return res.status(200).json({
      message: 'Notification marked as read',
      notification: updatedNotification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves notifications for a given user.
 * Uses the authenticated user's ID from the JWT token.
 */
export const getNotifications = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userId = req.user.userId;
    const userType = req.user.role;

    // Validate user type
    const validUserTypes = ['patient', 'donor', 'healthcare_institution', 'admin'];
    if (!validUserTypes.includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type.' });
    }

    console.log(`Fetching notifications for user ${userId} with role ${userType}`);
    const notifications = await notificationService.getNotifications(userId, userType);
    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// TODO: Add tests for notification controllers.
