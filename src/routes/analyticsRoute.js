import express from 'express';
import * as analyticsService from '../services/analyticsService.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

// Middleware to validate date parameters
const validateDateParams = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Both startDate and endDate are required' });
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return res.status(400).json({ error: 'Dates must be in YYYY-MM-DD format' });
  }

  // Validate date range
  if (new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ error: 'startDate must be before or equal to endDate' });
  }

  next();
};

// Analytics endpoints router
const analyticsRouter = express.Router();

analyticsRouter.get('/user-stats', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const stats = await analyticsService.getUserStats();
    res.json(stats);
  } catch (error) {
    console.error('Error in user-stats route:', error);
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/blood-stats', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const stats = await analyticsService.getBloodStats();
    res.json(stats);
  } catch (error) {
    console.error('Error in blood-stats route:', error);
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/metrics', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const metrics = await analyticsService.getMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error in metrics route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reports endpoints router
const reportsRouter = express.Router();

reportsRouter.get('/donations', verifyToken, requireRole('admin'), validateDateParams, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await analyticsService.getDonationReport(startDate, endDate);
    res.json(report);
  } catch (error) {
    console.error('Error in donations report route:', error);
    res.status(500).json({ error: error.message });
  }
});

reportsRouter.get('/requests', verifyToken, requireRole('admin'), validateDateParams, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await analyticsService.getRequestReport(startDate, endDate);
    res.json(report);
  } catch (error) {
    console.error('Error in requests report route:', error);
    res.status(500).json({ error: error.message });
  }
});

reportsRouter.get('/inventory', verifyToken, requireRole('admin'), validateDateParams, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await analyticsService.getInventoryReport(startDate, endDate);
    res.json(report);
  } catch (error) {
    console.error('Error in inventory report route:', error);
    res.status(500).json({ error: error.message });
  }
});

export { analyticsRouter, reportsRouter };
