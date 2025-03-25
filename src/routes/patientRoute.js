import express from 'express';
import * as patientController from '../controllers/patientController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Allow 'patient' and 'admin' to access patient routes.
router.get('/patient', verifyToken, requireRole('patient', 'admin'), patientController.getPatients);
router.post('/patient', verifyToken, requireRole('patient', 'admin'), patientController.createPatients);
router.put('/patient/:patient_id', verifyToken, requireRole('patient', 'admin'), patientController.updatePatients);
router.delete('/patient/:patient_id', verifyToken, requireRole('patient', 'admin'), patientController.deletePatients);
router.get('/patient/:patient_id', verifyToken, requireRole('patient', 'admin'), patientController.searchPatients);

export default router;
