import * as requestService from '../services/requestService.js';

export const createRequest = async (req, res) => {
  try {
    const newRequest = await requestService.createRequest(req.body);
    return res.status(201).json({
      message: 'Blood request created successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('Error creating blood request:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
