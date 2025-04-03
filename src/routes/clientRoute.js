// routes/adminRoute.js
import express from 'express';
import { getAdmins, getAdminById, updateAdmin, deleteAdmin, searchAdmins, getBloodRequests, getNotifications, markNotificationAsRead } from '../controllers/clientController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Admin routes (protected)
router.get('/admin', verifyToken, requireRole('admin'), getAdmins);
router.get('/admin/search', verifyToken, requireRole('admin'), searchAdmins);
router.get('/admin/:id', verifyToken, requireRole('admin'), getAdminById);
router.put('/admin/:id', verifyToken, requireRole('admin'), updateAdmin);
router.delete('/admin/:id', verifyToken, requireRole('admin'), deleteAdmin);

// Blood request routes
router.get('/blood-requests', verifyToken, requireRole('donor', 'admin'), getBloodRequests);

// Notification routes
router.get('/notifications', verifyToken, requireRole('admin'), getNotifications);
router.post('/notifications/:id/read', verifyToken, requireRole('admin'), markNotificationAsRead);

export default router;