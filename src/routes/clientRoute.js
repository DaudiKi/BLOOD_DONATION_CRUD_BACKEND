/**
 * Client/Admin Routes Module
 * 
 * This module handles all admin-related routes including:
 * - Admin profile management
 * - Blood request monitoring
 * - Admin notifications
 * 
 * All routes require authentication and admin role permissions,
 * except for blood request routes which are accessible by donors as well.
 * 
 * @module clientRoute
 */

import express from 'express';
import { getAdmins, getAdminById, updateAdmin, deleteAdmin, searchAdmins, getBloodRequests, getNotifications, markNotificationAsRead } from '../controllers/clientController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

/**
 * Admin Management Routes
 * These routes handle admin profile operations
 */

/**
 * @route GET /api/admin
 * @description Get a list of all admin users
 * @access Private - Admin only
 * @returns {Array} List of admin users
 */
router.get('/admin', verifyToken, requireRole('admin'), getAdmins);

/**
 * @route GET /api/admin/search
 * @description Search for admin users based on criteria
 * @access Private - Admin only
 * @query {string} [name] - Admin name to search for
 * @query {string} [email] - Admin email to search for
 * @returns {Array} List of matching admin users
 */
router.get('/admin/search', verifyToken, requireRole('admin'), searchAdmins);

/**
 * @route GET /api/admin/:id
 * @description Get details of a specific admin user
 * @access Private - Admin only
 * @param {string} id - Admin ID
 * @returns {Object} Admin user details
 */
router.get('/admin/:id', verifyToken, requireRole('admin'), getAdminById);

/**
 * @route PUT /api/admin/:id
 * @description Update an admin user's information
 * @access Private - Admin only
 * @param {string} id - Admin ID
 * @body {Object} updateData - Updated admin details
 * @returns {Object} Updated admin user
 */
router.put('/admin/:id', verifyToken, requireRole('admin'), updateAdmin);

/**
 * @route DELETE /api/admin/:id
 * @description Delete an admin user
 * @access Private - Admin only
 * @param {string} id - Admin ID
 * @returns {Object} Deletion confirmation
 */
router.delete('/admin/:id', verifyToken, requireRole('admin'), deleteAdmin);

/**
 * Blood Request Routes
 */

/**
 * @route GET /api/blood-requests
 * @description Get all blood requests in the system
 * @access Private - Donor and Admin
 * @returns {Array} List of blood requests
 */
router.get('/blood-requests', verifyToken, requireRole('donor', 'admin'), getBloodRequests);

/**
 * Admin Notification Routes
 */

/**
 * @route GET /api/notifications
 * @description Get all notifications for admin users
 * @access Private - Admin only
 * @returns {Array} List of admin notifications
 */
router.get('/notifications', verifyToken, requireRole('admin'), getNotifications);

/**
 * @route POST /api/notifications/:id/read
 * @description Mark an admin notification as read
 * @access Private - Admin only
 * @param {string} id - Notification ID
 * @returns {Object} Updated notification status
 */
router.post('/notifications/:id/read', verifyToken, requireRole('admin'), markNotificationAsRead);

export default router;