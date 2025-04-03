// services/userServices.js
import { query } from "../db.js";

// Fetch all users (Donors, Patients, and Healthcare Institutions)
export const getAllUsers = async () => {
  try {
    // Fetch Donors
    const donorQuery = `
      SELECT 
        donor_id AS id,
        first_name || ' ' || last_name AS name,
        blood_type,
        role,
        email,
        phone_number,
        is_active AS status,
        last_login,
        is_verified AS verified,
        date_created
      FROM bloodlink_schema.donor
      ORDER BY donor_id ASC
    `;
    const donorResult = await query(donorQuery);
    const donors = donorResult.rows.map(user => ({ 
      ...user, 
      user_type: 'donor',
      blood_type: user.blood_type || 'N/A'
    }));

    // Fetch Patients
    const patientQuery = `
      SELECT 
        patient_id AS id,
        first_name || ' ' || last_name AS name,
        role,
        email,
        phone_number,
        is_active AS status,
        last_login,
        is_verified AS verified,
        date_created,
        medical_condition
      FROM bloodlink_schema.patient
      ORDER BY patient_id ASC
    `;
    const patientResult = await query(patientQuery);
    const patients = patientResult.rows.map(user => ({ 
      ...user, 
      user_type: 'patient'
    }));

    // Fetch Healthcare Institutions
    const institutionQuery = `
      SELECT 
        institution_id AS id,
        name,
        role,
        email,
        phone_number,
        address,
        is_active AS status,
        last_login,
        is_verified AS verified,
        date_created,
        license_number
      FROM bloodlink_schema.healthcare_institution
      ORDER BY institution_id ASC
    `;
    const institutionResult = await query(institutionQuery);
    const institutions = institutionResult.rows.map(user => ({ 
      ...user, 
      user_type: 'healthcare_institution'
    }));

    // Combine all users and ensure all fields are properly formatted
    const allUsers = [...donors, ...patients, ...institutions].map(user => ({
      ...user,
      status: user.status || false,
      verified: user.verified || false,
      last_login: user.last_login ? new Date(user.last_login).toISOString() : null,
      date_created: user.date_created ? new Date(user.date_created).toISOString() : null,
      role: user.role || 'user'
    }));

    return allUsers;
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
};

// Verify a user (generic function for all user types)
export const verifyUser = async (id, userType) => {
  try {
    let queryText;
    let params;

    switch (userType) {
      case 'donor':
        queryText = `UPDATE bloodlink_schema.donor SET is_verified = true WHERE donor_id = $1 RETURNING *`;
        params = [id];
        break;
      case 'patient':
        queryText = `UPDATE bloodlink_schema.patient SET is_verified = true WHERE patient_id = $1 RETURNING *`;
        params = [id];
        break;
      case 'healthcare_institution':
        queryText = `UPDATE bloodlink_schema.healthcare_institution SET is_verified = true WHERE institution_id = $1 RETURNING *`;
        params = [id];
        break;
      default:
        throw new Error('Invalid user type');
    }

    const { rows } = await query(queryText, params);
    if (rows.length === 0) {
      throw new Error('User not found');
    }
    return rows[0];
  } catch (error) {
    console.error(`Error verifying ${userType}:`, error);
    throw new Error(`Failed to verify ${userType}`);
  }
};

// Deactivate a user (generic function for all user types)
export const deactivateUser = async (id, userType) => {
  try {
    let queryText;
    let params;

    switch (userType) {
      case 'donor':
        queryText = `UPDATE bloodlink_schema.donor SET is_active = false WHERE donor_id = $1 RETURNING *`;
        params = [id];
        break;
      case 'patient':
        queryText = `UPDATE bloodlink_schema.patient SET is_active = false WHERE patient_id = $1 RETURNING *`;
        params = [id];
        break;
      case 'healthcare_institution':
        queryText = `UPDATE bloodlink_schema.healthcare_institution SET is_active = false WHERE institution_id = $1 RETURNING *`;
        params = [id];
        break;
      default:
        throw new Error('Invalid user type');
    }

    const { rows } = await query(queryText, params);
    if (rows.length === 0) {
      throw new Error('User not found');
    }
    return rows[0];
  } catch (error) {
    console.error(`Error deactivating ${userType}:`, error);
    throw new Error(`Failed to deactivate ${userType}`);
  }
};