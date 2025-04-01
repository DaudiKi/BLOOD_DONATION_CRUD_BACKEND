// routes/healthcareInstitutionRoute.js
import express from 'express';
import * as instituteController from '../controllers/healthcareInstitutionController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Allow patients, healthcare_institution, and admin to view the list of healthcare institutions
router.get(
  '/healthcare-institutions',
  verifyToken,
  requireRole('healthcare_institution', 'admin', 'patient'),
  instituteController.getHealthcareInstitutes
);

// Allow patients, healthcare_institution, and admin to view a specific healthcare institution
router.get(
  '/healthcare-institutions/:institution_id',
  verifyToken,
  requireRole('healthcare_institution', 'admin', 'patient'),
  instituteController.getHealthcareInstitutionById
);

// Allow patients, healthcare_institution, and admin to search healthcare institutions
router.get(
  '/healthcare-institutions/search',
  verifyToken,
  requireRole('healthcare_institution', 'admin', 'patient'),
  instituteController.searchHealthcareInstitutes
);

// Restrict create, update, and delete operations to admin role only
router.post(
  '/healthcare-institutions',
  verifyToken,
  requireRole('admin'), // Restrict to admin
  instituteController.createHealthcareInstitutes
);

router.put(
  '/healthcare-institutions/:institution_id',
  verifyToken,
  requireRole('admin'), // Restrict to admin
  instituteController.updateHealthcareInstitutes
);

router.delete(
  '/healthcare-institutions/:institution_id',
  verifyToken,
  requireRole('admin'), // Restrict to admin
  instituteController.deleteHealthcareInstitutes
);

export default router;