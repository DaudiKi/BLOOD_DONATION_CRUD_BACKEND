import express from "express";
import { createRequest } from "../controllers/requestController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// Allow patients, healthcare institutions, and admin to create blood requests.
router.post(
  "/blood-requests",
  verifyToken,
  requireRole("patient", "healthcare_institution", "admin"),
  createRequest
);

export default router;

// TODO: Add integration tests for request routes.
