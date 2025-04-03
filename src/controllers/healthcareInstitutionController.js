import * as instituteService from "../services/healthcareInstitutionServices.js";
import bcrypt from 'bcrypt';

// Get all healthcare institutions (with pagination)
export const getHealthcareInstitutes = async (req, res) => {
  try {
    // Add pagination
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Note: Service doesn't support pagination yet; this is a placeholder for future improvement
    const institutes = await instituteService.getHealthcareInstitutes();
    console.log(`Fetched ${institutes.length} healthcare institutes`);
    res.status(200).json(institutes);
  } catch (err) {
    console.error('Error fetching healthcare institutes:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Create a new healthcare institution
export const createHealthcareInstitutes = async (req, res) => {
  try {
    const instituteData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'email', 'password', 'address', 'city', 'institution_type'];
    const missingFields = requiredFields.filter(field => !instituteData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}` });
    }

    // Hash the password if provided (for non-signup use cases)
    if (instituteData.password) {
      instituteData.password = await bcrypt.hash(instituteData.password, 10);
    }

    // Optionally, check req.user for authorization (e.g., only admins can create)
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized: Only admins can create healthcare institutes' });
    }

    const newInstitute = await instituteService.createInstitution(instituteData);
    console.log(`Created healthcare institute with ID: ${newInstitute.institution_id}`);
    res.status(201).json(newInstitute); // Use 201 for creation
  } catch (err) {
    console.error('Error adding healthcare institute:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Update an existing healthcare institution
export const updateHealthcareInstitutes = async (req, res) => {
  try {
    const institution_id = parseInt(req.params.institution_id);
    if (isNaN(institution_id)) {
      return res.status(400).json({ message: 'Invalid institution ID' });
    }

    const instituteData = req.body;

    // Validate that at least one field is provided for update
    if (Object.keys(instituteData).length === 0) {
      return res.status(400).json({ message: 'No data provided for update' });
    }

    // Hash the password if provided
    if (instituteData.password) {
      instituteData.password = await bcrypt.hash(instituteData.password, 10);
    }

    // Optionally, check req.user for authorization
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized: Only admins can update healthcare institutes' });
    }

    const updatedInstitute = await instituteService.updateInstitution(instituteData, institution_id);
    if (!updatedInstitute) {
      return res.status(404).json({ message: 'Healthcare institute not found' });
    }

    console.log(`Updated healthcare institute with ID: ${institution_id}`);
    res.status(200).json(updatedInstitute);
  } catch (err) {
    console.error('Error updating healthcare institute:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Delete a healthcare institution
export const deleteHealthcareInstitutes = async (req, res) => {
  try {
    const institution_id = parseInt(req.params.institution_id);
    if (isNaN(institution_id)) {
      return res.status(400).json({ message: 'Invalid institution ID' });
    }

    // Optionally, check req.user for authorization
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized: Only admins can delete healthcare institutes' });
    }

    const deleted = await instituteService.deleteInstitution(institution_id);
    if (!deleted) {
      return res.status(404).json({ message: 'Healthcare institute not found' });
    }

    console.log(`Deleted healthcare institute with ID: ${institution_id}`);
    res.status(204).send(); // Use 204 for successful deletion with no content
  } catch (err) {
    console.error('Error deleting healthcare institute:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Search healthcare institutions
export const searchHealthcareInstitutes = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    if (!searchTerm) {
      // If no search term, return all institutes (or add pagination)
      const institutes = await instituteService.getHealthcareInstitutes();
      return res.status(200).json(institutes);
    }

    const institutes = await instituteService.searchHealthcareInstitutes(searchTerm);
    console.log(`Found ${institutes.length} healthcare institutes matching search term: ${searchTerm}`);
    res.status(200).json(institutes);
  } catch (error) {
    console.error('Error searching healthcare institutes:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get a specific healthcare institution by ID
export const getHealthcareInstitutionById = async (req, res) => {
  try {
    const institution_id = parseInt(req.params.institution_id);
    if (isNaN(institution_id)) {
      return res.status(400).json({ message: 'Invalid institution ID' });
    }

    const institute = await instituteService.getHealthcareInstitutionById(institution_id);
    if (!institute) {
      return res.status(404).json({ message: 'Healthcare institute not found' });
    }

    console.log(`Fetched healthcare institute with ID: ${institution_id}`);
    res.status(200).json(institute);
  } catch (error) {
    console.error('Error fetching healthcare institute by ID:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};