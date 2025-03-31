import * as requestService from "../services/requestService.js";
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

/**
 * Creates a new blood request based on the provided data.
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user data from JWT (includes userId and role)
 * @param {Object} req.body - Request payload with blood request details
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - Responds with the created request or an error
 */
export const createRequest = async (req, res) => {
  try {
    // Set patient_id or institution_id based on user role
    if (req.user) {
      if (req.user.role === 'patient') {
        req.body.patient_id = req.user.userId;
      } else if (req.user.role === 'healthcare_institution') {
        req.body.institution_id = req.user.userId;
      }
    }

    // Validate request data
    const { error } = requestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    // Get Socket.IO instance
    const io = req.app.get('io');
    if (!io) {
      console.warn('Socket.IO instance not available; notifications may not be sent');
    }

    // Create the request
    const newRequest = await requestService.createRequest(req.body, io);

    return res.status(201).json({
      success: true,
      message: 'Blood request created successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('Error creating blood request:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + (error.message || 'Unknown error')
    });
  }
};

// TODO: Add unit and integration tests for request controllers