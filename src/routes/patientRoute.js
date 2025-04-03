// routes/patientRoute.js
import express from "express";
import * as patientController from "../controllers/patientController.js";
import * as requestController from "../controllers/requestController.js";
import * as requestService from "../services/requestService.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// Patient profile and notifications
router.get("/patients/me", verifyToken, requireRole("patient"), patientController.getCurrentPatient);
router.get("/notifications", verifyToken, requireRole("patient"), patientController.getNotifications);
router.put("/notifications/:notificationId/read", verifyToken, requireRole("patient"), patientController.markNotificationAsRead);

// Patient management (patient and admin access)
router.get("/patient", verifyToken, requireRole("patient", "admin"), patientController.getPatients);
router.post("/patient", verifyToken, requireRole("patient", "admin"), patientController.createPatients);
router.put("/patient/:patient_id", verifyToken, requireRole("patient", "admin"), patientController.updatePatients);
router.delete("/patient/:patient_id", verifyToken, requireRole("patient", "admin"), patientController.deletePatients);
router.get("/patient/:patient_id", verifyToken, requireRole("patient", "admin"), patientController.searchPatients);

// Blood request endpoints
router.get("/blood-requests/patient/:patientId", verifyToken, requireRole("patient"), async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const userId = req.user.userId;
    
    console.log('Request patientId:', patientId);
    console.log('Authenticated userId:', userId);
    
    if (String(userId) !== String(patientId)) {
      return res.status(403).json({ message: "Unauthorized: You can only view your own requests" });
    }
    
    const requests = await requestService.getRequestsByPatient(patientId);
    console.log('Found requests:', requests);
    
    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching patient blood requests:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/blood-requests/:requestId/cancel", verifyToken, requireRole("patient"), requestController.cancelRequest);

export default router;