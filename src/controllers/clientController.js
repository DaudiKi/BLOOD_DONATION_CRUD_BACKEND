import * as clientService from "../services/clientServices.js";

// Since verifyToken middleware has run, req.user is available here
export const getClients = async (req, res) => {
   try {
      // Optional: You could check req.user.role here if needed.
      const admin = await clientService.getClients();
      res.status(200).json(admin);
   } catch (err) {
      console.error('Error fetching admin:', err);
      res.status(500).json({ message: 'Internal Server Error' });
   }
};

export const createClients = async (req, res) => {
   try {
      // You can use req.user if you need to validate who is creating this record.
      const adminData = req.body;
      const newAdmin = await clientService.createClients(adminData);
      res.status(200).json(newAdmin);
   } catch (err) {
      console.error('Error adding admin:', err);
      res.status(500).json({ message: 'Internal Server Error' });
   }
};

export const updateClients = async (req, res) => {
   try {
      const admin_id = req.params.admin_id;
      const adminData = req.body;
      
      // Optionally, check if req.user.userType or req.user.userId matches the admin record if needed.
      const updatedClients = await clientService.updateClients(adminData, admin_id);
      if (!updatedClients) {
         return res.status(404).json({ message: 'Client not found' });
      }
      res.status(200).json(updatedClients);
   } catch (err) {
      console.error('Error updating admin:', err);
      res.status(500).json({ message: 'Internal Server Error' });
   }
};

export const deleteClients = async (req, res) => {
   try {
      const admin_id = req.params.admin_id;
      const deleted = await clientService.deleteClients(admin_id);
      if (!deleted) {
         return res.status(404).json({ message: 'Client not found' });
      }
      res.status(200).send();
   } catch (err) { 
      console.error('Error deleting admin:', err);
      res.status(500).json({ message: 'Internal Server Error' });
   }
};

export const searchClients = async (req, res) => {
   try {
      const searchTerm = req.query.q; // Get the search term from the query parameters
      const admin = await clientService.searchClients(searchTerm);
      res.status(200).json(admin);
   } catch (error) {
      console.error('Error searching clients:', error);
      res.status(500).json({ message: 'Internal Server Error' });
   }
};
