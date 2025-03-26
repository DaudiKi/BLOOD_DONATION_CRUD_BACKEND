import express from 'express';
import { acceptBloodRequest, rejectBloodRequest, markNotificationRead, getNotifications, getAllBloodRequests } from '../controllers/notificationController.js';

const router = express.Router();

router.put('/blood-requests/:requestId/accept', acceptBloodRequest);
router.put('/blood-requests/:requestId/reject', rejectBloodRequest);
router.get('/blood-requests', getAllBloodRequests); // For Admin
router.put('/notifications/:notification_id/read', markNotificationRead);
router.get('/notifications', getNotifications);

export default router;