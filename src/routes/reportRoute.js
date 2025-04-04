import express from 'express';
import { getBloodRequestReport } from '../services/reportService.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get blood request report for a date range
router.get('/requests', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }

    // Validate date range
    if (startDateObj > endDateObj) {
      return res.status(400).json({ 
        error: 'Start date must be before end date' 
      });
    }

    const report = await getBloodRequestReport(startDate, endDate);
    res.json(report);
  } catch (error) {
    console.error('Error in blood request report route:', error);
    res.status(500).json({ 
      error: 'Failed to generate blood request report' 
    });
  }
});

export default router; 