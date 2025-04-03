import { pool } from '../config/db.js';

export async function getBloodRequestReport(startDate, endDate) {
  try {
    const query = `
      SELECT 
        br.request_id,
        br.blood_type,
        br.units_needed,
        br.urgency_level,
        br.status,
        br.request_date,
        CASE 
          WHEN br.requester_type = 'patient' THEN p.name
          WHEN br.requester_type = 'healthcare_institution' THEN hi.name
          ELSE 'N/A'
        END as requester_name
      FROM blood_requests br
      LEFT JOIN patients p ON br.requester_id = p.patient_id AND br.requester_type = 'patient'
      LEFT JOIN healthcare_institutions hi ON br.requester_id = hi.institution_id AND br.requester_type = 'healthcare_institution'
      WHERE br.request_date BETWEEN $1 AND $2
      ORDER BY br.request_date DESC
    `;

    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching blood request report:', error);
    throw new Error('Failed to generate blood request report');
  }
} 