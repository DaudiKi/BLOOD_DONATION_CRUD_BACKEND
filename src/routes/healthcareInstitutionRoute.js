// routes/healthcareInstitutionRoute.js
import express from 'express';
import * as instituteController from '../controllers/healthcareInstitutionController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Allow patients to view the list of healthcare institutions
router.get(
  '/healthcare-institutions',
  verifyToken,
  requireRole('healthcare_institution', 'admin', 'patient'),
  instituteController.getHealthcareInstitutes
);

// Restrict other operations to healthcare_institution and admin roles only
router.post(
  '/healthcare-institutions',
  verifyToken,
  requireRole('healthcare_institution', 'admin'),
  instituteController.createHealthcareInstitutes
);
router.put(
  '/healthcare-institutions/:institution_id',
  verifyToken,
  requireRole('healthcare_institution', 'admin'),
  instituteController.updateHealthcareInstitutes
);
router.delete(
  '/healthcare-institutions/:institution_id',
  verifyToken,
  requireRole('healthcare_institution', 'admin'),
  instituteController.deleteHealthcareInstitutes
);
router.get(
  '/healthcare-institutions/:institution_id',
  verifyToken,
  requireRole('healthcare_institution', 'admin'),
  instituteController.getHealthcareInstitutionById
);

export default router;
