// controllers/authController.js
import * as patientService from '../services/patientServices.js';
import * as donorService from '../services/donorServices.js';
import * as institutionService from '../services/healthcareInstitutionServices.js';
import * as clientService from '../services/clientServices.js';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import bcrypt from 'bcrypt'; // Add bcrypt for password comparison

// Validation schema for patient signup
const patientSignupSchema = Joi.object({
  userType: Joi.string().valid('patient').optional().messages({
    'any.only': 'User type must be "patient" for patient signup'
  }),
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
  date_of_birth: Joi.date().required().messages({
    'date.base': 'Date of birth must be a valid date',
    'any.required': 'Date of birth is required'
  }),
  blood_type: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').required().messages({
    'any.only': 'Blood type must be one of A+, A-, B+, B-, AB+, AB-, O+, O-',
    'any.required': 'Blood type is required'
  }),
  address: Joi.string().trim().required().messages({
    'string.empty': 'Address is required',
    'any.required': 'Address is required'
  }),
  city: Joi.string().trim().required().messages({
    'string.empty': 'City is required',
    'any.required': 'City is required'
  }),
  medical_conditions: Joi.string().trim().allow('').optional(),
  emergency_contact_name: Joi.string().trim().allow('').optional(),
  emergency_contact_phone: Joi.string().trim().pattern(/^\+?[1-9]\d{1,14}$/).allow('').optional().messages({
    'string.pattern.base': 'Emergency contact phone must be a valid international number (e.g., +1234567890)'
  })
});

// Validation schema for donor signup
const donorSignupSchema = Joi.object({
  userType: Joi.string().valid('donor').optional().messages({
    'any.only': 'User type must be "donor" for donor signup'
  }),
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
  date_of_birth: Joi.date().required().messages({
    'date.base': 'Date of birth must be a valid date',
    'any.required': 'Date of birth is required'
  }),
  blood_type: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').required().messages({
    'any.only': 'Blood type must be one of A+, A-, B+, B-, AB+, AB-, O+, O-',
    'any.required': 'Blood type is required'
  }),
  weight: Joi.number().min(50).required().messages({
    'number.base': 'Weight must be a number',
    'number.min': 'Weight must be at least 50 kg',
    'any.required': 'Weight is required'
  }),
  address: Joi.string().trim().required().messages({
    'string.empty': 'Address is required',
    'any.required': 'Address is required'
  }),
  city: Joi.string().trim().required().messages({
    'string.empty': 'City is required',
    'any.required': 'City is required'
  }),
  last_donation_date: Joi.date().allow(null).optional().messages({
    'date.base': 'Last donation date must be a valid date'
  }),
  is_available: Joi.boolean().optional().messages({
    'boolean.base': 'Is available must be a boolean'
  }),
  medical_conditions: Joi.string().trim().allow('').optional()
});

// Validation schema for institution signup
const institutionSignupSchema = Joi.object({
  userType: Joi.string().valid('healthcare_institution').optional().messages({
    'any.only': 'User type must be "healthcare_institution" for institution signup'
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
  name: Joi.string().trim().required().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required'
  }),
  phone_number: Joi.string().trim().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
    'string.empty': 'Phone number is required',
    'any.required': 'Phone number is required',
    'string.base': 'Phone number must be a string',
    'string.pattern.base': 'Phone number must be a valid international number (e.g., +1234567890)'
  }),
  institution_type: Joi.string().trim().required().messages({
    'string.empty': 'Institution type is required',
    'any.required': 'Institution type is required'
  }),
  address: Joi.string().trim().required().messages({
    'string.empty': 'Address is required',
    'any.required': 'Address is required'
  }),
  city: Joi.string().trim().required().messages({
    'string.empty': 'City is required',
    'any.required': 'City is required'
  }),
  contact_person_name: Joi.string().trim().required().messages({
    'string.empty': 'Contact person name is required',
    'any.required': 'Contact person name is required'
  }),
  contact_person_phone: Joi.string().trim().pattern(/^\+?[1-9]\d{1,14}$/).allow('').optional().messages({
    'string.pattern.base': 'Contact person phone must be a valid international number (e.g., +1234567890)'
  })
});

// Validation schema for admin signup
const adminSignupSchema = Joi.object({
  userType: Joi.string().valid('admin').optional().messages({
    'any.only': 'User type must be "admin" for admin signup'
  }),
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
  date_created: Joi.date().optional().messages({
    'date.base': 'Date created must be a valid date'
  }),
  is_active: Joi.boolean().optional().messages({
    'boolean.base': 'Is active must be a boolean'
  })
});

// Validation schema for login
const loginSchema = Joi.object({
  email: Joi.string().email().trim().required().messages({
    'string.email': 'Email must be a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  })
});

// Signup for patients
export const signupPatient = async (req, res) => {
  try {
    // Validate the request body
    const { error, value } = patientSignupSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({ error: errorMessages });
    }

    // Check for duplicate email
    const existingPatient = await patientService.getPatientByEmail(value.email);
    if (existingPatient) {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }

    const newPatient = await patientService.createPatients({
      first_name: value.first_name,
      last_name: value.last_name,
      email: value.email,
      password: value.password, // Password will be hashed in patientServices.js
      phone_number: value.phone_number,
      date_of_birth: value.date_of_birth,
      blood_type: value.blood_type,
      address: value.address,
      city: value.city,
      medical_conditions: value.medical_conditions,
      emergency_contact_name: value.emergency_contact_name,
      emergency_contact_phone: value.emergency_contact_phone,
      role: 'patient'
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: newPatient.patient_id, role: 'patient', email: value.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    console.log(`Successfully signed up ${newPatient.email} as ${newPatient.role}`);

    return res.status(201).json({
      message: 'Patient signup successful.',
      token,
      patient: {
        id: newPatient.patient_id,
        email: value.email,
        firstName: value.first_name,
        lastName: value.last_name,
        phoneNumber: value.phone_number,
        role: 'patient'
      }
    });
  } catch (error) {
    console.error('Patient signup error:', error);
    if (error.message === 'Email already exists') {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }
    return res.status(500).json({ error: 'Failed to sign up patient. Please try again.' });
  }
};

// Signup for donors
export const signupDonor = async (req, res) => {
  try {
    // Validate the request body
    const { error, value } = donorSignupSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({ error: errorMessages });
    }

    // Check for duplicate email
    const existingDonor = await donorService.getDonorByEmail(value.email);
    if (existingDonor) {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }

    const newDonor = await donorService.createDonors({
      first_name: value.first_name,
      last_name: value.last_name,
      email: value.email,
      password: value.password, // Password will be hashed in donorServices.js
      phone_number: value.phone_number,
      date_of_birth: value.date_of_birth,
      blood_type: value.blood_type,
      weight: value.weight,
      address: value.address,
      city: value.city,
      last_donation_date: value.last_donation_date,
      is_available: value.is_available,
      medical_conditions: value.medical_conditions,
      role: 'donor'
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: newDonor.donor_id, role: 'donor', email: value.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    console.log(`Successfully signed up ${newDonor.email} as ${newDonor.role}`);

    return res.status(201).json({
      message: 'Donor signup successful.',
      token,
      donor: {
        id: newDonor.donor_id,
        email: value.email,
        firstName: value.first_name,
        lastName: value.last_name,
        phoneNumber: value.phone_number,
        role: 'donor'
      }
    });
  } catch (error) {
    console.error('Donor signup error:', error);
    if (error.message === 'Email already exists') {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }
    return res.status(500).json({ error: 'Failed to sign up donor. Please try again.' });
  }
};

// Signup for institutions
export const signupInstitution = async (req, res) => {
  try {
    console.log('Institution signup request body:', req.body);

    // Validate the request body
    const { error, value } = institutionSignupSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.error('Validation error:', error.details);
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({ error: errorMessages });
    }

    // Check for existing institution
    const existingInstitution = await institutionService.getHealthcareInstitutionByEmail(value.email);
    if (existingInstitution) {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }

    // Prepare institution data
    const institutionData = {
      name: value.name,
      email: value.email,
      password: value.password,
      phone_number: value.phone_number,
      address: value.address,
      city: value.city,
      institution_type: value.institution_type,
      contact_person_name: value.contact_person_name || null,
      contact_person_phone: value.contact_person_phone || null,
      date_registered: new Date(),
      is_active: true,
      role: 'healthcare_institution'
    };

    console.log('Creating institution with data:', {
      ...institutionData,
      password: '[REDACTED]'
    });

    const newInstitution = await institutionService.createInstitution(institutionData);

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: newInstitution.institution_id, 
        role: 'healthcare_institution', 
        email: value.email 
      },
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

    console.log('Institution signup successful:', {
      id: newInstitution.institution_id,
      email: newInstitution.email,
      role: newInstitution.role
    });

    return res.status(201).json({
      message: 'Institution signup successful.',
      token,
      institution: institutionResponse
    });
  } catch (error) {
    console.error('Institution signup error:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.message.includes('duplicate key') || error.message === 'Email already exists') {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }
    
    if (error.message.includes('Missing required fields')) {
      return res.status(400).json({ error: 'Missing required fields. Please fill in all required information.' });
    }

    return res.status(500).json({ 
      error: 'Failed to sign up institution. Please try again.',
      details: error.message
    });
  }
};

// Signup for admins
export const signupAdmin = async (req, res) => {
  try {
    // Validate the request body
    const { error, value } = adminSignupSchema.validate(req.body, { abortEarly: false });
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
      date_created: value.date_created,
      is_active: value.is_active, // This will be set to false by default in clientServices.js  
      role: 'admin'
    };

      const newAdmin = await clientService.createAdmin(adminData);

    // Generate JWT
    const token = jwt.sign(
      { userId: newAdmin.admin_id, role: 'admin', email: value.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    console.log(`Successfully signed up ${newAdmin.email} as ${newAdmin.role}`);

    return res.status(201).json({
      message: 'Admin signup successful.',
      token,
      admin: {
        id: newAdmin.admin_id,
        email: value.email,
        firstName: value.first_name,
        lastName: value.last_name,
        phoneNumber: value.phone_number,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin signup error:', error);
    if (error.message === 'Email already exists') {
      return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
    }
    return res.status(500).json({ error: 'Failed to sign up admin. Please try again.' });
  }
};

// Unified signup function that delegates based on userType
export const signup = async (req, res) => {
  const { userType } = req.body;
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
      case 'admin':
        return await signupAdmin(req, res);
      default:
        return res.status(400).json({ error: 'Invalid user type provided.' });
    }
  } catch (error) {
    console.error('Unified signup error:', error);
    return res.status(500).json({ error: `Failed to sign up user of type ${userType}. Please try again.` });
  }
};

// Login function
export const login = async (req, res) => {
  const { userType } = req.params;
  const { email, password } = req.body;

  // Validate request body
  const { error } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json({ error: errorMessages });
  }

  try {
    let user;
    let role;

    // Fetch user based on userType
    switch (userType) {
      case 'patient':
        user = await patientService.getPatientByEmail(email);
        role = 'patient';
        break;
      case 'donor':
        user = await donorService.getDonorByEmail(email);
        role = 'donor';
        break;
      case 'healthcare_institution':
        user = await institutionService.getHealthcareInstitutionByEmail(email);
        role = 'healthcare_institution';
        break;
      case 'admin':
        user = await clientService.getAdminByEmail(email);
        role = 'admin';
        break;
      default:
        return res.status(400).json({ error: 'Invalid user type provided.' });
    }

    // Check if user exists
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT
    const userIdKey = userType === 'patient' ? 'patient_id' :
                     userType === 'donor' ? 'donor_id' :
                     userType === 'healthcare_institution' ? 'institution_id' :
                     'admin_id';
    const token = jwt.sign(
      { userId: user[userIdKey], role, email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    console.log(`Successfully logged in ${email} as ${role}`);

    // Prepare response
    const responseData = {
      message: 'Login successful.',
      token,
      [userType]: {
        id: user[userIdKey],
        email: user.email,
        role
      }
    };

    // Add additional fields based on user type
    if (userType === 'admin') {
      responseData[userType].firstName = user.first_name;
      responseData[userType].lastName = user.last_name;
      responseData[userType].phoneNumber = user.phone_number;
    } else if (userType === 'patient' || userType === 'donor') {
      responseData[userType].firstName = user.first_name;
      responseData[userType].lastName = user.last_name;
      responseData[userType].phoneNumber = user.phone_number;
    } else if (userType === 'healthcare_institution') {
      responseData[userType].name = user.name;
      responseData[userType].phoneNumber = user.phone_number;
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to log in. Please try again.' });
  }
};