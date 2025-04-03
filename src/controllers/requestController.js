// controllers/requestController.js
import * as requestService from "../services/requestService.js";
import Joi from 'joi';

// Existing request schema...
const requestSchema = Joi.object({
  patient_id: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
  institution_id: Joi.alternatives().try(Joi.string(), Joi.number(), null).optional().allow(null),
  blood_type: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').required(),
  units_needed: Joi.number().positive().required(),
  urgency_level: Joi.string().required(),
  required_by_date: Joi.date().required(),
  request_notes: Joi.string().optional().allow(''),
  location: Joi.string().optional().allow('')
});

// Create a new blood request
export const createRequest = async (req, res) => {
  try {
    if (req.user) {
      if (req.user.role === 'patient') {
        req.body.patient_id = req.user.userId;
      } else if (req.user.role === 'healthcare_institution') {
        req.body.institution_id = req.user.userId;
      }
    }

    const { error } = requestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const io = req.app.get('io');
    if (!io) {
      console.warn('Socket.IO instance not available; notifications may not be sent');
    }

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

// Cancel a blood request
export const cancelRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const patientId = req.user.userId; // From JWT token
    const { patient_id: bodyPatientId } = req.body;

    // Verify the request belongs to the patient
    if (patientId !== bodyPatientId) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only cancel your own requests' });
    }

    // Check if the request exists and belongs to the patient
    const request = await requestService.getRequestById(requestId);
    if (!request || request.patient_id !== patientId) {
      return res.status(404).json({ success: false, error: 'Request not found or not owned by you' });
    }

    // Only allow cancellation if the status is 'Pending'
    if (request.request_status !== 'Pending') {
      return res.status(400).json({ success: false, error: 'Only pending requests can be cancelled' });
    }

    const updatedRequest = await requestService.updateRequestStatus(requestId, 'Cancelled');

    return res.status(200).json({
      success: true,
      message: 'Blood request cancelled successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error cancelling blood request:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + (error.message || 'Unknown error')
    });
  }
};