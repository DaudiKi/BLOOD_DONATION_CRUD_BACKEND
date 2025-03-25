import express from 'express';
import * as instituteController from '../controllers/healthcareInstitutionController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Allow 'healthcare_institution' and 'admin' to access these routes.
router.get('/healthcare-institute', verifyToken, requireRole('healthcare_institution', 'admin'), instituteController.getHealthcareInstitutes);
router.post('/healthcare-institute', verifyToken, requireRole('healthcare_institution', 'admin'), instituteController.createHealthcareInstitutes);
router.put('/healthcare-institute/:institution_id', verifyToken, requireRole('healthcare_institution', 'admin'), instituteController.updateHealthcareInstitutes);
router.delete('/healthcare-institute/:institution_id', verifyToken, requireRole('healthcare_institution', 'admin'), instituteController.deleteHealthcareInstitutes);
router.get('/healthcare-institute/:institution_id', verifyToken, requireRole('healthcare_institution', 'admin'), instituteController.searchHealthcareInstitutes);

export default router;
