import * as requestService from "../services/requestService.js";
import * as donorService from "../services/donorServices.js";
import * as notificationService from "../services/notificationService.js";
import Joi from 'joi';

// Define schema for blood request validation
const requestSchema = Joi.object({
  patient_id: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
  institution_id: Joi.alternatives().try(Joi.string(), Joi.number(), null).optional().allow(null),
  blood_type: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').required(),
  units_needed: Joi.number().positive().required(),
  urgency_level: Joi.string().required(),
  required_by_date: Joi.date().required(),
  request_notes: Joi.string().optional().allow(''),
  location_latitude: Joi.number().optional(),
  location_longitude: Joi.number().optional(),
});

export const createRequest = async (req, res) => {
  try {
    // Override request info based on authenticated user's role.
    if (req.user && (req.user.role === "patient" || req.user.userType === "patient")) {
      req.body.patient_id = req.user.userId; // Assumes req.user.userId is the patient ID.
    }
    if (req.user && (req.user.role === "healthcare_institution" || req.user.userType === "healthcare_institution")) {
      req.body.institution_id = req.user.userId; // Assumes req.user.userId is the institution ID.
    }

    // Validate request data
    const { error } = requestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Get Socket.IO instance
    const io = req.app.get('io');
    if (!io) {
      console.warn('Socket.IO instance not available');
    }

    // Create the request and handle notifications in the service
    const newRequest = await requestService.createRequest(req.body, io);

    return res.status(201).json({
      message: "Blood request created successfully",
      request: newRequest
    });
  } catch (error) {
    console.error("Error creating blood request:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// TODO: Add tests for request controllers.
