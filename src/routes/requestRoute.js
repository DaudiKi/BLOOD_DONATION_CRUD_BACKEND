// routes/requestRouter.js
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';
import { createRequest } from '../controllers/requestController.js'; // Import from controller
import * as requestService from '../services/requestService.js';

const router = express.Router();

/**
 * @route POST /blood-requests
 * @desc Creates a new blood request
 * @access Private (patient, healthcare_institution, admin)
 * @middleware verifyToken, requireRole
 */
router.post(
  '/blood-requests',
  verifyToken,
  requireRole('patient', 'healthcare_institution', 'admin'),
  createRequest // Now correctly references the imported function
);

/**
 * @route GET /blood-requests
 * @desc Retrieves all pending blood requests
 * @access Private (donor, healthcare_institution, admin)
 * @query {number} [limit] - Maximum number of requests to return (default: 100)
 * @query {number} [offset] - Number of requests to skip (default: 0)
 * @returns {Object} - { success: boolean, data: Array, message: string }
 * @middleware verifyToken, requireRole
 */
router.get(
  '/blood-requests',
  verifyToken,
  requireRole('donor', 'healthcare_institution', 'admin'),
  async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const requests = await requestService.getAllRequests(
        parseInt(limit, 10),
        parseInt(offset, 10)
      );
      res.status(200).json({
        success: true,
        data: requests,
        message: 'Blood requests fetched successfully'
      });
    } catch (error) {
      console.error('Error in GET /blood-requests:', error);
      const status = error.message.includes('not found') ? 404 : 500;
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to fetch blood requests'
      });
    }
  }
);

/**
 * @route GET /blood-requests/institution/:institutionId
 * @desc Retrieves all blood requests for a specific institution
 * @access Private (healthcare_institution)
 * @middleware verifyToken, requireRole
 */
router.get(
  '/blood-requests/institution/:institutionId',
  verifyToken,
  requireRole('healthcare_institution'),
  async (req, res) => {
    try {
      const institutionId = req.params.institutionId;
      const userId = req.user.userId;
      
      console.log('Request institutionId:', institutionId);
      console.log('Authenticated userId:', userId);
      
      if (String(userId) !== String(institutionId)) {
        return res.status(403).json({ message: "Unauthorized: You can only view your own institution's requests" });
      }
      
      const requests = await requestService.getRequestsByInstitution(institutionId);
      console.log('Found requests:', requests);
      
      res.status(200).json(requests);
    } catch (error) {
      console.error("Error fetching institution blood requests:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

export default router;

// TODO: Extract GET handler to a controller function in requestController.js
// TODO: Add integration tests for request routes