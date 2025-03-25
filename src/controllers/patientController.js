import * as patientService from "../services/patientServices.js";

// With verifyToken middleware already applied, req.user is safe to use here.
export const getPatients = async (req, res) => {
  try {
    const patients = await patientService.getPatients();
    res.status(200).json(patients);
  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const createPatients = async (req, res) => {
  try {
    const patientData = req.body;
    // Optionally, check req.user.userType to ensure proper role before creating a patient record.
    const newPatient = await patientService.createPatients(patientData);
    res.status(200).json(newPatient);
  } catch (err) {
    console.error('Error adding patient:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const updatePatients = async (req, res) => {
  try {
    const patient_id = req.params.patient_id;
    const patientData = req.body;
    
    // Optionally, add logic to ensure the user updating is allowed to do so by comparing req.user.userId, etc.
    const updatedPatient = await patientService.updatePatients(patientData, patient_id);
    if (!updatedPatient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.status(200).json(updatedPatient);
  } catch (err) {
    console.error('Error updating patient:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deletePatients = async (req, res) => {
  try {
    const patient_id = req.params.patient_id;
    const deleted = await patientService.deletePatients(patient_id);
    if (!deleted) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.status(200).send();
  } catch (err) {
    console.error('Error deleting patient:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const searchPatients = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const patients = await patientService.searchPatients(searchTerm);
    res.status(200).json(patients);
  } catch (error) {
    console.error('Error searching patients:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
