import { pool } from '../index.js';

// Get user statistics
async function getUserStats() {
  try {
    const donors = await pool.query('SELECT COUNT(*) as count FROM bloodlink_schema.donors WHERE is_active = true');
    const patients = await pool.query('SELECT COUNT(*) as count FROM bloodlink_schema.patients WHERE is_active = true');
    const institutions = await pool.query('SELECT COUNT(*) as count FROM bloodlink_schema.healthcare_institutions WHERE is_active = true');

    return {
      donors: parseInt(donors.rows[0].count),
      patients: parseInt(patients.rows[0].count),
      institutions: parseInt(institutions.rows[0].count)
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw new Error('Failed to get user statistics');
  }
}

// Get blood inventory statistics
async function getBloodStats() {
  try {
    const results = await pool.query(`
      SELECT blood_type, SUM(units) as total_units
      FROM bloodlink_schema.blood_inventory
      GROUP BY blood_type
    `);

    const inventory = {
      'A+': 0, 'A-': 0,
      'B+': 0, 'B-': 0,
      'AB+': 0, 'AB-': 0,
      'O+': 0, 'O-': 0
    };

    results.rows.forEach(result => {
      if (inventory.hasOwnProperty(result.blood_type)) {
        inventory[result.blood_type] = parseInt(result.total_units);
      }
    });

    return { inventory };
  } catch (error) {
    console.error('Error getting blood stats:', error);
    throw new Error('Failed to get blood inventory statistics');
  }
}

// Get key metrics
async function getMetrics() {
  try {
    const totalUsers = await pool.query(`
      SELECT (
        (SELECT COUNT(*) FROM bloodlink_schema.donors) +
        (SELECT COUNT(*) FROM bloodlink_schema.patients) +
        (SELECT COUNT(*) FROM bloodlink_schema.healthcare_institutions)
      ) as total
    `);

    const totalDonations = await pool.query('SELECT COUNT(*) as total FROM bloodlink_schema.donations');
    const pendingRequests = await pool.query('SELECT COUNT(*) as total FROM bloodlink_schema.blood_requests WHERE status = $1', ['pending']);
    const activeInstitutions = await pool.query('SELECT COUNT(*) as total FROM bloodlink_schema.healthcare_institutions WHERE is_active = true');

    return {
      totalUsers: parseInt(totalUsers.rows[0].total),
      totalDonations: parseInt(totalDonations.rows[0].total),
      pendingRequests: parseInt(pendingRequests.rows[0].total),
      activeInstitutions: parseInt(activeInstitutions.rows[0].total)
    };
  } catch (error) {
    console.error('Error getting metrics:', error);
    throw new Error('Failed to get system metrics');
  }
}

// Get donation reports
async function getDonationReport(startDate, endDate) {
  try {
    const donations = await pool.query(`
      SELECT 
        d.donation_id,
        CONCAT(dr.first_name, ' ', dr.last_name) as donor_name,
        dr.blood_type,
        d.units_donated,
        d.donation_date,
        hi.name as institution_name,
        d.status
      FROM bloodlink_schema.donations d
      JOIN bloodlink_schema.donors dr ON d.donor_id = dr.donor_id
      LEFT JOIN bloodlink_schema.healthcare_institutions hi ON d.institution_id = hi.institution_id
      WHERE d.donation_date BETWEEN $1 AND $2
      ORDER BY d.donation_date DESC
    `, [startDate, endDate]);

    return donations.rows;
  } catch (error) {
    console.error('Error getting donation report:', error);
    throw new Error('Failed to generate donation report');
  }
}

// Get blood request reports
async function getRequestReport(startDate, endDate) {
  try {
    const requests = await pool.query(`
      SELECT 
        br.request_id,
        CASE 
          WHEN br.requester_type = 'patient' THEN CONCAT(p.first_name, ' ', p.last_name)
          WHEN br.requester_type = 'institution' THEN hi.name
        END as requester_name,
        br.blood_type,
        br.units_needed,
        br.request_date,
        br.status,
        br.urgency_level
      FROM bloodlink_schema.blood_requests br
      LEFT JOIN bloodlink_schema.patients p ON br.requester_id = p.patient_id AND br.requester_type = 'patient'
      LEFT JOIN bloodlink_schema.healthcare_institutions hi ON br.requester_id = hi.institution_id AND br.requester_type = 'institution'
      WHERE br.request_date BETWEEN $1 AND $2
      ORDER BY br.request_date DESC
    `, [startDate, endDate]);

    return requests.rows;
  } catch (error) {
    console.error('Error getting request report:', error);
    throw new Error('Failed to generate blood request report');
  }
}

// Get inventory reports
async function getInventoryReport(startDate, endDate) {
  try {
    const inventory = await pool.query(`
      SELECT 
        bi.inventory_id,
        bi.blood_type,
        bi.units,
        hi.name as institution_name,
        bi.last_updated,
        bi.expiry_date
      FROM bloodlink_schema.blood_inventory bi
      JOIN bloodlink_schema.healthcare_institutions hi ON bi.institution_id = hi.institution_id
      WHERE bi.last_updated BETWEEN $1 AND $2
      ORDER BY bi.last_updated DESC
    `, [startDate, endDate]);

    return inventory.rows;
  } catch (error) {
    console.error('Error getting inventory report:', error);
    throw new Error('Failed to generate inventory report');
  }
}

export {
  getUserStats,
  getBloodStats,
  getMetrics,
  getDonationReport,
  getRequestReport,
  getInventoryReport
}; 