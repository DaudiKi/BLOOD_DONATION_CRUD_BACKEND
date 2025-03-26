import * as requestService from '../services/requestService.js';

export const createRequest = async (req, res) => {
  try {
    const newRequest = await requestService.createRequest(req.body);

    // Access the Socket.IO instance from the Express app
    const io = req.app.get('io');

    // Emit a 'bloodRequest' event to notify donors and admin
    io.emit('bloodRequest', {
      requestId: newRequest.request_id,
      bloodType: newRequest.blood_type,
      urgency: newRequest.urgency_level,
      patientId: newRequest.patient_id,
      institutionId: newRequest.institution_id,
      notification_message: `New blood request: ${newRequest.blood_type} (${newRequest.units_needed} units) needed`
    });

    return res.status(201).json({
      message: 'Blood request created successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('Error creating blood request:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};