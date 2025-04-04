/**
 * Client/Admin Controller Module
 * 
 * This module handles all admin-related operations including:
 * - Admin CRUD operations
 * - Blood request management
 * - Notification handling
 * - Input validation
 * 
 * @module clientController
 */

import * as clientService from '../services/clientServices.js';
import * as requestService from '../services/requestService.js';
import * as notificationService from '../services/notificationService.js';
import * as donorService from '../services/donorServices.js';
import Joi from 'joi';

/**
 * Validation Schemas
 * Define Joi validation schemas for admin operations
 */

/**
 * Admin Creation Validation Schema
 * Validates required fields for creating a new admin user
 * 
 * @constant {Object} createAdminSchema
 * @property {string} first_name - Required, admin's first name
 * @property {string} last_name - Required, admin's last name
 * @property {string} email - Required, must be valid email format
 * @property {string} password - Required, minimum 8 characters
 * @property {string} phone_number - Required, must be valid international format
 * @property {string} role - Required, must be 'admin'
 */
const createAdminSchema = Joi.object({
  first_name: Joi.string().trim().required().messages({
    'string.empty': 'First name is required',
    'any.required': 'First name is required'
  }),
  last_name: Joi.string().trim().required().messages({
    'string.empty': 'Last name is required',
    'any.required': 'Last name is required'
  }),
  email: Joi.string().email().trim().required().messages({
    'string.email': 'Email must be a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(8).required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
    'string.min': 'Password must be at least 8 characters long'
  }),
  phone_number: Joi.string().trim().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
    'string.empty': 'Phone number is required',
    'any.required': 'Phone number is required',
    'string.base': 'Phone number must be a string',
    'string.pattern.base': 'Phone number must be a valid international number (e.g., +1234567890)'
  }),
  role: Joi.string().valid('admin').required().messages({
    'any.only': 'Role must be "admin"',
    'any.required': 'Role is required'
  })
});

/**
 * Admin Update Validation Schema
 * Validates required fields for updating an existing admin user
 * 
 * @constant {Object} updateAdminSchema
 * @property {string} first_name - Required, admin's first name
 * @property {string} last_name - Required, admin's last name
 * @property {string} email - Required, must be valid email format
 * @property {string} phone_number - Required, must be valid international format
 * @property {boolean} [is_active] - Optional, admin's active status
 */
const updateAdminSchema = Joi.object({
  first_name: Joi.string().trim().required().messages({
    'string.empty': 'First name is required',
    'any.required': 'First name is required'
  }),
  last_name: Joi.string().trim().required().messages({
    'string.empty': 'Last name is required',
    'any.required': 'Last name is required'
  }),
  email: Joi.string().email().trim().required().messages({
    'string.email': 'Email must be a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required'
  }),
  phone_number: Joi.string().trim().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
    'string.empty': 'Phone number is required',
    'any.required': 'Phone number is required',
    'string.base': 'Phone number must be a string',
    'string.pattern.base': 'Phone number must be a valid international number (e.g., +1234567890)'
  }),
  is_active: Joi.boolean().optional().messages({
    'boolean.base': 'Is active must be a boolean'
  })
});

/**
 * Create New Admin
 * Creates a new admin user with the provided details
 * 
 * @async
 * @function createAdmin
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing admin details
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Created admin details
 * @throws {Error} If validation fails or database error occurs
 */
export const createAdmin = async (req, res) => {
  try {
    // Validate the request body
    const { error, value } = createAdminSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({ error: errorMessages });
    }

    // Check for duplicate email
    const existingAdmin = await clientService.getAdminByEmail(value.email);
    if (existingAdmin) {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }

    const adminData = {
      first_name: value.first_name,
      last_name: value.last_name,
      email: value.email,
      password: value.password, // Password will be hashed in clientServices.js
      phone_number: value.phone_number,
      role: value.role
    };

    const newAdmin = await clientService.createAdmin(adminData);
    console.log(`Successfully created admin: ${newAdmin.email}`);
    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: newAdmin.admin_id,
        email: newAdmin.email,
        firstName: newAdmin.first_name,
        lastName: newAdmin.last_name,
        role: newAdmin.role
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    if (error.message === 'Email already exists') {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }
    res.status(500).json({ error: 'Failed to create admin. Please try again.' });
  }
};

/**
 * Get All Admins
 * Retrieves a list of all admin users in the system
 * 
 * @async
 * @function getAdmins
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Array>} List of admin users
 * @throws {Error} If database error occurs
 */
export const getAdmins = async (req, res) => {
  try {
    const admins = await clientService.getAllAdmins();
    res.status(200).json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admins. Please try again.' });
  }
};

/**
 * Get Admin by ID
 * Retrieves details of a specific admin user
 * 
 * @async
 * @function getAdminById
 * @param {Object} req - Express request object
 * @param {string} req.params.admin_id - Admin ID to retrieve
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Admin user details
 * @throws {Error} If admin not found or database error occurs
 */
export const getAdminById = async (req, res) => {
  try {
    const { admin_id } = req.params;
    // Validate admin_id
    if (!admin_id || isNaN(admin_id)) {
      return res.status(400).json({ error: 'Invalid admin ID' });
    }

    const admin = await clientService.getAdminById(admin_id);
    res.status(200).json(admin);
  } catch (error) {
    console.error(`Error fetching admin with ID ${req.params.admin_id}:`, error);
    if (error.message === 'Invalid admin ID' || error.message === 'Admin not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch admin. Please try again.' });
  }
};

/**
 * Get Admin by Email
 * Retrieves admin details using their email address
 * 
 * @async
 * @function getAdminByEmail
 * @param {Object} req - Express request object
 * @param {string} req.query.email - Email address to search for
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Admin user details
 * @throws {Error} If admin not found or database error occurs
 */
export const getAdminByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email query parameter is required' });
    }
    const admin = await clientService.getAdminByEmail(email);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.status(200).json(admin);
  } catch (error) {
    console.error('Error fetching admin by email:', error);
    res.status(500).json({ error: 'Failed to fetch admin by email. Please try again.' });
  }
};

/**
 * Update Admin
 * Updates details of an existing admin user
 * 
 * @async
 * @function updateAdmin
 * @param {Object} req - Express request object
 * @param {string} req.params.admin_id - Admin ID to update
 * @param {Object} req.body - Updated admin details
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Updated admin details
 * @throws {Error} If validation fails or database error occurs
 */
export const updateAdmin = async (req, res) => {
  try {
    // Validate the request body
    const { error, value } = updateAdminSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({ error: errorMessages });
    }

    const { admin_id } = req.params;
    // Validate admin_id
    if (!admin_id || isNaN(admin_id)) {
      return res.status(400).json({ error: 'Invalid admin ID' });
    }

    // Check if the new email is already in use by another admin
    const existingAdmin = await clientService.getAdminByEmail(value.email);
    if (existingAdmin && existingAdmin.admin_id !== parseInt(admin_id)) {
      return res.status(400).json({ error: 'This email is already registered to another admin. Please use a different email.' });
    }

    const adminData = {
      first_name: value.first_name,
      last_name: value.last_name,
      email: value.email,
      phone_number: value.phone_number,
      is_active: value.is_active
    };
    const updatedAdmin = await clientService.updateAdmin(admin_id, adminData);
    console.log(`Successfully updated admin with ID ${admin_id}`);
    res.status(200).json({
      message: 'Admin updated successfully',
      admin: updatedAdmin
    });
  } catch (error) {
    console.error(`Error updating admin with ID ${req.params.admin_id}:`, error);
    if (error.message === 'Invalid admin ID' || error.message === 'Admin not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Email already exists') {
      return res.status(400).json({ error: 'This email is already registered to another admin. Please use a different email.' });
    }
    res.status(500).json({ error: 'Failed to update admin. Please try again.' });
  }
};

/**
 * Delete Admin
 * Removes an admin user from the system
 * 
 * @async
 * @function deleteAdmin
 * @param {Object} req - Express request object
 * @param {string} req.params.admin_id - Admin ID to delete
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Deletion confirmation
 * @throws {Error} If admin not found or database error occurs
 */
export const deleteAdmin = async (req, res) => {
  try {
    const { admin_id } = req.params;
    // Validate admin_id
    if (!admin_id || isNaN(admin_id)) {
      return res.status(400).json({ error: 'Invalid admin ID' });
    }

    await clientService.deleteAdmin(admin_id);
    console.log(`Successfully deleted admin with ID ${admin_id}`);
    res.status(200).json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error(`Error deleting admin with ID ${req.params.admin_id}:`, error);
    if (error.message === 'Invalid admin ID' || error.message === 'Admin not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete admin. Please try again.' });
  }
};

/**
 * Search Admins
 * Searches for admin users based on provided criteria
 * 
 * @async
 * @function searchAdmins
 * @param {Object} req - Express request object
 * @param {Object} req.query - Search criteria
 * @param {Object} res - Express response object
 * @returns {Promise<Array>} List of matching admin users
 * @throws {Error} If database error occurs
 */
export const searchAdmins = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query parameter (q) is required' });
    }
    const admins = await clientService.searchAdmins(q);
    res.status(200).json(admins);
  } catch (error) {
    console.error('Error searching admins:', error);
    if (error.message.includes('Invalid search query')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to search admins. Please try again.' });
  }
};

/**
 * Get Blood Requests
 * Retrieves all blood requests in the system
 * 
 * @async
 * @function getBloodRequests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Array>} List of blood requests
 * @throws {Error} If database error occurs
 */
export const getBloodRequests = async (req, res) => {
  try {
    let bloodRequests;
    
    if (req.user.role === 'donor') {
      // For donors, fetch only matching blood type requests
      const donorData = await donorService.getDonorById(req.user.userId);
      if (!donorData) {
        return res.status(404).json({ error: 'Donor not found' });
      }
      
      bloodRequests = await requestService.getRequestsByBloodType(donorData.blood_type);
    } else {
      // For admins, fetch all requests
      bloodRequests = await requestService.getAllBloodRequests();
    }

    // Map the data to match the frontend's expected format
    const formattedRequests = bloodRequests.map(request => ({
      request_id: request.request_id,
      patient_name: request.patient_name || 'Anonymous',
      blood_type: request.blood_type,
      location: request.location || (request.institution_id ? 'Institution' : 'Patient'),
      urgency_level: request.urgency_level,
      request_status: request.request_status,
      required_by_date: request.required_by_date,
      request_date: request.request_date
    }));

    res.json({ 
      success: true,
      data: formattedRequests,
      message: 'Blood requests fetched successfully'
    });
  } catch (error) {
    console.error('Error in getBloodRequests:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch blood requests' 
    });
  }
};

/**
 * Get Admin Notifications
 * Retrieves notifications for admin users
 * 
 * @async
 * @function getNotifications
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Array>} List of notifications
 * @throws {Error} If database error occurs
 */
export const getNotifications = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userId = req.user.userId;
    const userType = req.user.role;

    const validUserTypes = ['patient', 'donor', 'healthcare_institution', 'admin'];
    if (!validUserTypes.includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type.' });
    }

    console.log(`Fetching notifications for user ${userId} with role ${userType}`);
    const notifications = await notificationService.getNotifications(userId, userType);
    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mark Notification as Read
 * Updates a notification's status to read
 * 
 * @async
 * @function markNotificationAsRead
 * @param {Object} req - Express request object
 * @param {string} req.params.notification_id - Notification ID to mark as read
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Updated notification status
 * @throws {Error} If notification not found or database error occurs
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Valid Notification ID is required' });
    }
    const updatedNotification = await notificationService.markNotificationAsRead(id);
    return res.status(200).json({
      message: 'Notification marked as read',
      notification: updatedNotification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};