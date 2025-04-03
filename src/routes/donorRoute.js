// routes/donorRoute.js
import express from 'express';
import * as donorController from '../controllers/donorController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Get current donor profile (must come before :id routes)
router.get('/donors/me', verifyToken, requireRole('donor'), donorController.getCurrentDonor);

// Get donor dashboard data
router.get('/donors/dashboard', verifyToken, requireRole('donor'), donorController.getDonorDashboardData);

// Endpoints for donors to accept or reject blood requests
router.put('/blood-requests/:request_id/accept', verifyToken, requireRole('donor'), donorController.acceptRequest);
router.put('/blood-requests/:request_id/reject', verifyToken, requireRole('donor'), donorController.rejectRequest);

// Other donor routes with :id parameter
router.get('/donors/:id', verifyToken, requireRole('donor'), donorController.getDonorById);
router.put('/donors/:id', verifyToken, requireRole('donor'), donorController.updateDonor);
router.put('/donors/:id/availability', verifyToken, requireRole('donor'), donorController.updateAvailability);

// Admin routes
router.get('/donors', verifyToken, requireRole('donor', 'admin'), donorController.getDonors);
router.post('/donors', verifyToken, requireRole('donor', 'admin'), donorController.createDonors);
router.put('/donors/:donor_id', verifyToken, requireRole('donor', 'admin'), donorController.updateDonors);
router.delete('/donors/:donor_id', verifyToken, requireRole('donor', 'admin'), donorController.deleteDonors);
router.get('/donors/search', verifyToken, requireRole('donor', 'admin'), donorController.searchDonors);

export default router;
