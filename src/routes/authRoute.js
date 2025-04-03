// routes/authRoute.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../index.js';
import { signup } from '../controllers/authController.js';

const schema = process.env.PG_SCHEMA || 'bloodlink_schema';
const router = express.Router();

/**
 * Helper function to handle login for different user types.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {string} table - The table name to query (e.g., 'donor', 'patient', etc.).
 * @param {string} idField - The primary key field in that table (e.g., 'donor_id').
 * @param {string} roleValue - The role value to sign in the JWT (e.g., 'donor').
 */
const handleLogin = async (req, res, table, idField, roleValue) => {
  try {
    console.log('=== Login Attempt Details ===');
    console.log('Table:', table);
    console.log('Role:', roleValue);
    console.log('Email:', req.body.email);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    
    const { email, password } = req.body;
    if (!email || !password) {
      console.log('Error: Missing credentials');
      return res.status(400).json({ error: 'Missing credentials.' });
    }

    const queryText = `SELECT * FROM ${schema}.${table} WHERE email = $1`;
    console.log('Executing query:', queryText.replace(/\s+/g, ' '));
    
    const { rows } = await pool.query(queryText, [email]);
    console.log('Query results:', {
      found: rows.length > 0,
      rowCount: rows.length
    });

    if (rows.length === 0) {
      console.log('Error: No user found');
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];
    console.log('User found:', {
      id: user[idField],
      email: user.email,
      hasPassword: !!user.password,
      isActive: user.is_active
    });

    console.log('Password comparison:', {
      providedPassword: password,
      hasStoredHash: !!user.password,
      storedHashLength: user.password ? user.password.length : 0
    });

    const match = await bcrypt.compare(password, user.password);
    console.log('Password match result:', match);

    if (!match) {
      console.log('Error: Password mismatch');
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    if (table === 'admin') {
      console.log('Admin specific checks...');
      if (!user.is_active) {
        console.log('Error: Admin account inactive');
        return res.status(401).json({ error: 'Account is inactive.' });
      }
    }

    console.log('Generating token...');
    const token = jwt.sign(
      { userId: user[idField], role: roleValue, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    console.log('Generated token:', token);

    if (table === 'admin') {
      console.log('Sending admin response...');
      return res.status(200).json({
        message: `${roleValue} login successful.`,
        token,
        admin: {
          id: user.admin_id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: roleValue
        }
      });
    }

    const userData = {
      message: `${roleValue} login successful.`,
      token
    };

    switch (table) {
      case 'healthcare_institution':
        userData.institution = {
          id: user.institution_id,
          email: user.email,
          name: user.name,
          type: user.institution_type,
          address: user.address,
          contact: user.contact_number,
          role: roleValue
        };
        break;
      case 'donor':
        userData.donor = {
          id: user.donor_id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: roleValue
        };
        break;
      case 'patient':
        userData.patient = {
          id: user.patient_id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: roleValue
        };
        break;
    }

    console.log('Sending response with user data:', userData);
    return res.status(200).json(userData);
  } catch (error) {
    console.error('=== Login Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// -----------------------
// Donor Login Endpoint
// -----------------------
router.post('/login/donor', async (req, res) => {
  await handleLogin(req, res, 'donor', 'donor_id', 'donor');
});

// -----------------------
// Patient Login Endpoint
// -----------------------
router.post('/login/patient', async (req, res) => {
  await handleLogin(req, res, 'patient', 'patient_id', 'patient');
});

// -------------------------------------------
// Healthcare Institution Login Endpoint
// -------------------------------------------
router.post('/login/healthcare_institution', async (req, res) => {
  await handleLogin(req, res, 'healthcare_institution', 'institution_id', 'healthcare_institution');
});

// -----------------------
// Admin Login Endpoint
// -----------------------
router.post('/login/admin', async (req, res) => {
  console.log('=== Admin Login Route Hit ===');
  console.log('Request body:', req.body);
  console.log('Request path:', req.path);
  console.log('Request URL:', req.url);
  await handleLogin(req, res, 'admin', 'admin_id', 'admin');
});

// -----------------------
// SIGNUP Endpoint (Unified)
// -----------------------
router.post('/signup', async (req, res) => {
  console.log('=== Signup Attempt ===');
  console.log('Request body:', req.body);

  const { email, password, userType } = req.body;
  if (!email || !password || !userType) {
    console.log('Error: Missing required fields');
    return res.status(400).json({ error: 'Email, password, and user type are required.' });
  }

  const validUserTypes = ['donor', 'patient', 'healthcare_institution', 'admin'];
  if (!validUserTypes.includes(userType)) {
    console.log('Error: Invalid user type');
    return res.status(400).json({ error: 'Invalid user type.' });
  }

  try {
    await signup(req, res);
  } catch (error) {
    console.error('=== Signup Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// -----------------------
// Password Reset Endpoints
// -----------------------
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, userType } = req.body;
    if (!email || !userType) {
      return res.status(400).json({ error: 'Email and user type are required.' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { email, userType },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    // Store reset token in database
    const queryText = `UPDATE ${schema}.${userType} 
                      SET reset_token = $1, reset_token_expires = NOW() + INTERVAL '1 hour'
                      WHERE email = $2 RETURNING email`;
    const { rows } = await pool.query(queryText, [resetToken, email]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No account found with that email.' });
    }

    // TODO: Send email with reset link
    // For now, just return the token in the response
    return res.status(200).json({ 
      message: 'Password reset instructions sent to your email.',
      resetToken // In production, remove this and only send via email
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, userType } = req.body;
    if (!token || !newPassword || !userType) {
      return res.status(400).json({ error: 'Token, new password, and user type are required.' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    const queryText = `UPDATE ${schema}.${userType}
                      SET password = $1, reset_token = NULL, reset_token_expires = NULL
                      WHERE email = $2 AND reset_token = $3
                      AND reset_token_expires > NOW()
                      RETURNING email`;
    const { rows } = await pool.query(queryText, [hashedPassword, decoded.email, token]);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    return res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;