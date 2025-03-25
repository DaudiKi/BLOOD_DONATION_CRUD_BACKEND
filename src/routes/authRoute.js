// routes/authRoute.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
const { Pool } = pkg;

import { signup } from '../controllers/authController.js'; // NEW: Import the signup controller

const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'bloodlink_db',
  password: process.env.PG_PASSWORD || 'postgres',
  port: process.env.PG_PORT || 5432,
});

// Define your schema name. You can also load this from an environment variable.
const schema = process.env.PG_SCHEMA || 'bloodlink_schema';

const router = express.Router();

// -----------------------
// Donor Login Endpoint
// -----------------------
router.post('/login/donor', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials.' });
    }
    const queryText = `SELECT * FROM ${schema}.donor WHERE email = $1`;
    const { rows } = await pool.query(queryText, [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign(
      { userId: user.donor_id, userType: 'donor' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    return res.status(200).json({ message: 'Donor login successful.', token });
  } catch (error) {
    console.error('Donor login error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// -----------------------
// Patient Login Endpoint
// -----------------------
router.post('/login/patient', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials.' });
    }
    const queryText = `SELECT * FROM ${schema}.patient WHERE email = $1`;
    const { rows } = await pool.query(queryText, [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign(
      { userId: user.patient_id, userType: 'patient' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    return res.status(200).json({ message: 'Patient login successful.', token });
  } catch (error) {
    console.error('Patient login error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// -------------------------------------------
// Healthcare Institution Login Endpoint
// -------------------------------------------
router.post('/login/healthcare_institution', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials.' });
    }
    const queryText = `SELECT * FROM ${schema}.healthcare_institution WHERE email = $1`;
    const { rows } = await pool.query(queryText, [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign(
      { userId: user.institution_id, userType: 'healthcare_institution' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    return res.status(200).json({ message: 'Healthcare institution login successful.', token });
  } catch (error) {
    console.error('Healthcare institution login error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// -----------------------
// Optional: Admin Login Endpoint
// -----------------------
router.post('/login/admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials.' });
    }
    const queryText = `SELECT * FROM ${schema}.admin WHERE email = $1`;
    const { rows } = await pool.query(queryText, [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign(
      { userId: user.admin_id, userType: 'admin' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    return res.status(200).json({ message: 'Admin login successful.', token });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// -----------------------
// SIGNUP Endpoint
// -----------------------
router.post('/signup', signup);

export default router;
