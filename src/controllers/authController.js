// controllers/authController.js
import { createDonors } from '../services/donorServices.js';
import { createPatients } from '../services/patientServices.js';
import { createHealthcareInstitutes } from '../services/healthcareInstitutionServices.js';
import { createClients } from '../services/clientServices.js';

export const signup = async (req, res) => {
  try {
    const { userType } = req.body;
    if (!userType) {
      return res.status(400).json({ error: 'User type is required.' });
    }
    
    let user;
    // Depending on the userType, call the appropriate service function.
    if (userType === 'donor') {
      user = await createDonors(req.body);
    } else if (userType === 'patient') {
      user = await createPatients(req.body);
    } else if (userType === 'healthcare_institution') {
      user = await createHealthcareInstitutes(req.body);
    } else if (userType === 'admin') {
      user = await createClients(req.body);
    } else {
      return res.status(400).json({ error: 'Invalid user type.' });
    }
    
    // Optionally, you could generate a token here to log the user in immediately.
    return res.status(201).json({ message: 'Signup successful.', user });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
