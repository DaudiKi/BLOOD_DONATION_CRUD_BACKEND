import { query } from "../db.js"
import bcrypt from 'bcrypt';

const saltRounds = 10;


export const getClients = async() =>{
    const {rows} = await query('SELECT * FROM bloodlink_schema.admin');
    return rows;
}


export const createClients = async (clientData) => {
  // Destructure role with a default of 'admin'
  const { first_name, last_name, email, password, phone_number, date_created, last_login, is_active, role = 'admin' } = clientData;
  // Hash the password
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  const { rows } = await query(
    `INSERT INTO bloodlink_schema.admin 
      (first_name, last_name, email, password, phone_number, date_created, last_login, is_active, role) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [first_name, last_name, email, hashedPassword, phone_number, date_created, last_login, is_active, role]
  );
  
  return rows[0];
};


export const updateClients = async(clientData, admin_id) =>{
    const { first_name, last_name, email, password, phone_number, date_created, last_login, is_active } = clientData;
    // Hash the password
        const hashedPassword = await bcrypt.hash(password, saltRounds);
    const { rows } = await query(
        `UPDATE bloodlink_schema.admin SET first_name = $1, last_name = $2, email = $3, password = $4, phone_number = $5, date_created = $6, last_login = $7, is_active = $8
         WHERE admin_id = $9 RETURNING *`,
        [first_name, last_name, email, hashedPassword, phone_number, date_created, last_login, is_active, admin_id ]
      );
    
    return rows[0];
};

export const deleteClients = async (admin_id) => {
    const { rowCount } = await query(`DELETE FROM bloodlink_schema.admin WHERE admin_id = $1`, [admin_id]);
    return rowCount > 0; // Returns true if a row was deleted, false otherwise
};

export const searchClients = async (searchTerm) => {
    const { rows } = await query(
      `SELECT * FROM bloodlink_schema.admin WHERE first_name ILIKE $1 OR email ILIKE $1 OR password ILIKE $1`,
      [`%${searchTerm}%`]
    );
    return rows;
  };