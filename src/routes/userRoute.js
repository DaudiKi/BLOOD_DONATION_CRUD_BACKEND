// routes/userRoute.js
import express from "express";
import * as userController from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// Get all users (Donors, Patients, Healthcare Institutions)
router.get("/admin/users", verifyToken, requireRole("admin"), userController.getAllUsers);

// Verify a user
router.post("/admin/users/:id/verify", verifyToken, requireRole("admin"), userController.verifyUser);

// Deactivate a user
router.post("/admin/users/:id/deactivate", verifyToken, requireRole("admin"), userController.deactivateUser);

export default router;