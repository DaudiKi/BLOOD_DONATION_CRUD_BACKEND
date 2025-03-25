import express from 'express';
import { markNotificationRead, getNotifications } from '../controllers/notificationController.js';

const router = express.Router();

// Endpoint to mark a notification as read
router.put('/notifications/:notification_id/read', markNotificationRead);

// Endpoint to retrieve notifications for a user (expects userId as a query parameter or from req.user)
router.get('/notifications', getNotifications);

export default router;
