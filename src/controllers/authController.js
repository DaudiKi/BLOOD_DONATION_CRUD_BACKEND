// controllers/authController.js
import * as patientService from '../services/patientServices.js';
import * as donorService from '../services/donorServices.js';
import * as institutionService from '../services/healthcareInstitutionServices.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

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

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !phone_number || !date_of_birth || !blood_type || !address || !city) {
      return res.status(400).json({ error: 'Missing required fields for patient signup.' });
    }

    // Check for duplicate email
    const existingPatient = await patientService.getPatientByEmail(email);
    if (existingPatient) {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newPatient = await patientService.createPatients({
      first_name,
      last_name,
      email,
      password: hashedPassword, // Pass the hashed password
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

    // Generate JWT
    const token = jwt.sign(
      { userId: newPatient.patient_id, role: 'patient', email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' } // Match the expiration time with handleLogin
    );

    return res.status(201).json({
      message: 'Patient signup successful.',
      token,
      patient: {
        id: newPatient.patient_id,
        email,
        firstName: first_name,
        lastName: last_name,
        role: 'patient'
      }
    });
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

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !phone_number || !date_of_birth || !blood_type || !weight || !address || !city) {
      return res.status(400).json({ error: 'Missing required fields for donor signup.' });
    }

    // Check for duplicate email
    const existingDonor = await donorService.getDonorByEmail(email);
    if (existingDonor) {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newDonor = await donorService.createDonors({
      first_name,
      last_name,
      email,
      password: hashedPassword, // Pass the hashed password
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

    // Generate JWT
    const token = jwt.sign(
      { userId: newDonor.donor_id, role: 'donor', email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    return res.status(201).json({
      message: 'Donor signup successful.',
      token,
      donor: {
        id: newDonor.donor_id,
        email,
        firstName: first_name,
        lastName: last_name,
        role: 'donor'
      }
    });
  } catch (error) {
    console.error('Donor signup error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// controllers/authController.js
export const signupInstitution = async (req, res) => {
  try {
    const {
      email,
      password,
      name,
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

    // Validate required fields
    if (!contact_person_name) {
      return res.status(400).json({ error: 'contact_person_name is required' });
    }

    // Check for existing institution
    const existingInstitution = await institutionService.getHealthcareInstitutionByEmail(email);
    if (existingInstitution) {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Warn if optional fields are missing
    if (!contact_person_phone) {
      console.warn('Signup warning: contact_person_phone not provided for institution signup');
    }

    const newInstitution = await institutionService.createInstitution({
      name,
      email,
      password: hashedPassword,
      phone_number,
      license_number,
      address,
      city,
      latitude,
      longitude,
      institution_type,
      contact_person_name,
      contact_person_phone,
      role: 'healthcare_institution'
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: newInstitution.institution_id, role: 'healthcare_institution', email: newInstitution.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    const institutionResponse = {
      id: newInstitution.institution_id,
      email: newInstitution.email,
      name: newInstitution.name,
      type: newInstitution.institution_type,
      address: newInstitution.address,
      contact: newInstitution.phone_number,
      role: newInstitution.role
    };

    console.log(`Successfully signed up ${newInstitution.email} as ${newInstitution.role}`);
    return res.status(201).json({
      message: 'Institution signup successful.',
      token,
      institution: institutionResponse
    });
  } catch (error) {
    console.error('Institution signup error:', error.message);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// Unified signup function that delegates based on userType
export const signup = async (req, res) => {
  const { userType } = req.body; // Changed from "role" to "userType" to match authRoute.js
  if (!userType) {
    return res.status(400).json({ error: 'User type is required.' });
  }
  try {
    switch (userType) {
      case 'patient':
        return await signupPatient(req, res);
      case 'donor':
        return await signupDonor(req, res);
      case 'healthcare_institution':
        return await signupInstitution(req, res);
      default:
        return res.status(400).json({ error: 'Invalid user type provided.' });
    }
  } catch (error) {
    console.error('Unified signup error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};