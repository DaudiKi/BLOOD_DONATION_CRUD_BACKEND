import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { pool } from '../index.js';

// Middleware to validate date parameters
const validateDateParams = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return res.status(400).json({ message: 'Dates must be in YYYY-MM-DD format' });
  }
  
  if (new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ message: 'Start date must be before or equal to end date' });
  }
  
  next();
};

const router = express.Router();

// Get blood requests report based on date range
router.get('/requests', verifyToken, validateDateParams, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const query = `
            SELECT 
                br.*,
                u.name as requester_name,
                u.email as requester_email,
                u.phone_number as requester_phone
            FROM blood_requests br
            LEFT JOIN users u ON br.user_id = u.id
            WHERE br.created_at BETWEEN $1 AND $2
            ORDER BY br.created_at DESC
        `;
        const result = await pool.query(query, [startDate, endDate]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching blood requests report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
