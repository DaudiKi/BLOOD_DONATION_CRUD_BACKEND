import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

// Get notifications for a user
router.get('/notifications', verifyToken, notificationController.getNotifications);

// Mark notification as read
router.put('/notifications/:notification_id', verifyToken, notificationController.markNotificationRead);

export default router;

// TODO: Add integration tests for notification routes.
