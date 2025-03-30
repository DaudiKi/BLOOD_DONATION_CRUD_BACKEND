// routes/clientRoute.js
import express from 'express';
import * as clientController from '../controllers/clientController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Only 'admin' can access these client routes.
router.get('/admin', verifyToken, requireRole('admin'), clientController.getClients);
router.post('/admin', verifyToken, requireRole('admin'), clientController.createClients);
router.put('/admin/:admin_id', verifyToken, requireRole('admin'), clientController.updateClients);
router.delete('/admin/:admin_id', verifyToken, requireRole('admin'), clientController.deleteClients);
router.get('/admin/:admin_id', verifyToken, requireRole('admin'), clientController.searchClients);

export default router;
