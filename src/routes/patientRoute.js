// routes/patientRoute.js
import express from "express";
import * as patientController from "../controllers/patientController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// Endpoints for current patient profile and notifications.
// (Note: You may consider using the dedicated notificationRoute.js for notifications to avoid duplication.)
router.get("/patients/me", verifyToken, requireRole("patient"), patientController.getCurrentPatient);

// Updated parameter name to match our notification controller expectations.
router.get("/notifications", verifyToken, requireRole("patient"), patientController.getNotifications);
router.put("/notifications/:notification_id/read", verifyToken, requireRole("patient"), patientController.markNotificationAsRead);

// Allow 'patient' and 'admin' to access patient routes.
router.get("/patient", verifyToken, requireRole("patient", "admin"), patientController.getPatients);
router.post("/patient", verifyToken, requireRole("patient", "admin"), patientController.createPatients);
router.put("/patient/:patient_id", verifyToken, requireRole("patient", "admin"), patientController.updatePatients);
router.delete("/patient/:patient_id", verifyToken, requireRole("patient", "admin"), patientController.deletePatients);
router.get("/patient/:patient_id", verifyToken, requireRole("patient", "admin"), patientController.searchPatients);

export default router;
