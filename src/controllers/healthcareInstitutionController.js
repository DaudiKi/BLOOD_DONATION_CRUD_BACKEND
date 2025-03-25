import * as instituteService from "../services/healthcareInstitutionServices.js";

// With verifyToken middleware in place, req.user is available for further role-based logic if needed.
export const getHealthcareInstitutes = async (req, res) => {
  try {
    const institutes = await instituteService.getHealthcareInstitutes();
    res.status(200).json(institutes);
  } catch (err) {
    console.error('Error fetching healthcare institutes:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const createHealthcareInstitutes = async (req, res) => {
  try {
    const instituteData = req.body;
    // Optionally, check req.user.userType if needed.
    const newInstitute = await instituteService.createHealthcareInstitutes(instituteData);
    res.status(200).json(newInstitute);
  } catch (err) {
    console.error('Error adding healthcare institute:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const updateHealthcareInstitutes = async (req, res) => {
  try {
    const institute_id = req.params.institute_id;
    const instituteData = req.body;
    
    // Optionally, check if req.user.userType or req.user.userId has permission to update.
    const updatedInstitute = await instituteService.updateHealthcareInstitutes(instituteData, institute_id);
    if (!updatedInstitute) {
      return res.status(404).json({ message: 'Healthcare institute not found' });
    }
    res.status(200).json(updatedInstitute);
  } catch (err) {
    console.error('Error updating healthcare institute:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteHealthcareInstitutes = async (req, res) => {
  try {
    const institute_id = req.params.institute_id;
    const deleted = await instituteService.deleteHealthcareInstitutes(institute_id);
    if (!deleted) {
      return res.status(404).json({ message: 'Healthcare institute not found' });
    }
    res.status(200).send();
  } catch (err) {
    console.error('Error deleting healthcare institute:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const searchHealthcareInstitutes = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const institutes = await instituteService.searchHealthcareInstitutes(searchTerm);
    res.status(200).json(institutes);
  } catch (error) {
    console.error('Error searching healthcare institutes:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
