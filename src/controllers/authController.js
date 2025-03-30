// controllers/authController.js
import * as patientService from '../services/patientServices.js';
import * as donorService from '../services/donorServices.js';
import * as institutionService from '../services/healthcareInstitutionServices.js'; // Corrected filename
import jwt from 'jsonwebtoken';

// Signup for patients
export const signupPatient = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      phone_number,
      date_of_birth,
      blood_type,
      address,
      city,
      latitude,
      longitude,
      medical_conditions,
      emergency_contact_name,
      emergency_contact_phone
    } = req.body;
    
    // Check for duplicate email
    const existingPatient = await patientService.getPatientByEmail(email);
    if (existingPatient) {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }
    

    const newPatient = await patientService.createPatients({
      first_name,
      last_name,
      email,
      password,
      phone_number,
      date_of_birth,
      blood_type,
      address,
      city,
      latitude,
      longitude,
      medical_conditions,
      emergency_contact_name,
      emergency_contact_phone,
      role: 'patient'
    });
    
    // Generate JWT with property "role"
    const token = jwt.sign(
      { userId: newPatient.patient_id, role: 'patient' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1d' }
    );
    
    return res.status(201).json({ message: 'Patient signup successful.', token, userId: newPatient.patient_id });
  } catch (error) {
    console.error('Patient signup error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// Signup for donors
export const signupDonor = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      phone_number,
      date_of_birth,
      blood_type,
      weight,
      address,
      city,
      latitude,
      longitude,
      last_donation_date,
      is_available,
      medical_conditions
    } = req.body;
    
    // Check for duplicate email
    const existingDonor = await donorService.getDonorByEmail(email);
    if (existingDonor) {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }
    
    const newDonor = await donorService.createDonors({
      first_name,
      last_name,
      email,
      password,
      phone_number,
      date_of_birth,
      blood_type,
      weight,
      address,
      city,
      latitude,
      longitude,
      last_donation_date,
      is_available,
      medical_conditions,
      role: 'donor'
    });
    
    // Generate JWT using "role"
    const token = jwt.sign(
      { userId: newDonor.donor_id, role: 'donor' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1d' }
    );
    
    return res.status(201).json({ message: 'Donor signup successful.', token, userId: newDonor.donor_id });
  } catch (error) {
    console.error('Donor signup error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// Signup for institutions
export const signupInstitution = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone_number,
      license_number,
      institution_type,
      address,
      city,
      latitude,
      longitude,
      contact_person_name,
      contact_person_phone
    } = req.body;
    
    // Check for duplicate email using the correct function name
    const existingInstitution = await institutionService.getHealthcareInstitutionByEmail(email);
    if (existingInstitution) {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }
    
    const newInstitution = await institutionService.createInstitution({
      name,
      email,
      password,
      phone_number,
      license_number,
      institution_type,
      address,
      city,
      latitude,
      longitude,
      contact_person_name,
      contact_person_phone,
      role: 'healthcare_institution'
    });
    
    // Generate JWT using "role"
    const token = jwt.sign(
      { userId: newInstitution.institution_id, role: 'healthcare_institution' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1d' }
    );
    
    return res.status(201).json({ message: 'Institution signup successful.', token, userId: newInstitution.institution_id });
  } catch (error) {
    console.error('Institution signup error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// Unified signup function that delegates based on role
export const signup = async (req, res) => {
  // Expect the client to send a property named "role"
  const { role } = req.body;
  if (!role) {
    return res.status(400).json({ error: 'Role is required.' });
  }
  try {
    switch (role) {
      case 'patient':
        return await signupPatient(req, res);
      case 'donor':
        return await signupDonor(req, res);
      case 'healthcare_institution':
        return await signupInstitution(req, res);
      default:
        return res.status(400).json({ error: 'Invalid role provided.' });
    }
  } catch (error) {
    console.error('Unified signup error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
