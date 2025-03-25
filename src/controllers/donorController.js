import * as donorService from "../services/donorServices.js";

// verifyToken middleware ensures req.user is available
export const getDonors = async (req, res) => {
  try {
    // Optionally, check req.user.role to tailor logic here if needed.
    const donors = await donorService.getDonors();
    res.status(200).json(donors);
  } catch (err) {
    console.error('Error fetching donors:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const createDonors = async (req, res) => {
  try {
    const donorData = req.body;
    // Optionally, verify that req.user.userType is 'donor' or 'admin'
    const newDonor = await donorService.createDonors(donorData);
    res.status(200).json(newDonor);
  } catch (err) {
    console.error('Error adding donor:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const updateDonors = async (req, res) => {
  try {
    const donor_id = req.params.donor_id;
    const donorData = req.body;
    
    // Optionally, compare req.user.userId with donor_id if needed.
    const updatedDonor = await donorService.updateDonors(donorData, donor_id);
    if (!updatedDonor) {
      return res.status(404).json({ message: 'Donor not found' });
    }
    res.status(200).json(updatedDonor);
  } catch (err) {
    console.error('Error updating donor:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteDonors = async (req, res) => {
  try {
    const donor_id = req.params.donor_id;
    const deleted = await donorService.deleteDonors(donor_id);
    if (!deleted) {
      return res.status(404).json({ message: 'Donor not found' });
    }
    res.status(200).send();
  } catch (err) {
    console.error('Error deleting donor:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const searchDonors = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const donors = await donorService.searchDonors(searchTerm);
    res.status(200).json(donors);
  } catch (error) {
    console.error('Error searching donors:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
