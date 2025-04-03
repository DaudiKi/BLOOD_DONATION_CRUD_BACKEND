import * as donorService from "../services/donorServices.js";
import * as requestService from "../services/requestService.js";
import * as notificationService from "../services/notificationService.js";

// Existing donor methods (get, create, update, delete, search) remain here.

export const getDonors = async (req, res) => {
  try {
    const donors = await donorService.getDonors();
    res.status(200).json(donors);
  } catch (err) {
    console.error("Error fetching donors:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createDonors = async (req, res) => {
  try {
    const donorData = req.body;
    const newDonor = await donorService.createDonors(donorData);
    res.status(200).json(newDonor);
  } catch (err) {
    console.error("Error adding donor:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateDonors = async (req, res) => {
  try {
    const donor_id = req.params.donor_id;
    const donorData = req.body;
    const updatedDonor = await donorService.updateDonors(donorData, donor_id);
    if (!updatedDonor) {
      return res.status(404).json({ message: "Donor not found" });
    }
    res.status(200).json(updatedDonor);
  } catch (err) {
    console.error("Error updating donor:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteDonors = async (req, res) => {
  try {
    const donor_id = req.params.donor_id;
    const deleted = await donorService.deleteDonors(donor_id);
    if (!deleted) {
      return res.status(404).json({ message: "Donor not found" });
    }
    res.status(200).send();
  } catch (err) {
    console.error("Error deleting donor:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const searchDonors = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const donors = await donorService.searchDonors(searchTerm);
    res.status(200).json(donors);
  } catch (error) {
    console.error("Error searching donors:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// NEW: Donor accepts a blood request
export const acceptRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    // Retrieve donor ID from req.user (set by your auth middleware)
    const donor_id = req.user?.donor_id || req.user?.userId;
    
    // Update the request status to 'accepted'
    const updatedRequest = await requestService.updateRequestStatus(request_id, "accepted", donor_id);
    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found." });
    }

    // Notify the requester (patient or healthcare institution)
    let recipient_id, recipient_type;
    if (updatedRequest.patient_id) {
      recipient_id = updatedRequest.patient_id;
      recipient_type = "patient";
    } else if (updatedRequest.institution_id) {
      recipient_id = updatedRequest.institution_id;
      recipient_type = "healthcare_institution";
    }

    if (recipient_id) {
      await notificationService.createNotification({
        recipient_type,
        recipient_id,
        notification_type: "donor_accept",
        notification_title: "Request Accepted",
        notification_message: "Your blood request has been accepted by a donor.",
        related_request_id: request_id,
        related_match_id: donor_id
      }, null);
    }

    res.status(200).json({
      message: "Request accepted successfully.",
      request: updatedRequest
    });
  } catch (error) {
    console.error("Error accepting request:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// NEW: Donor rejects a blood request
export const rejectRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const donor_id = req.user?.donor_id || req.user?.userId;

    // Update the request status to 'rejected'
    const updatedRequest = await requestService.updateRequestStatus(request_id, "rejected", donor_id);
    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found." });
    }

    // Notify the requester (patient or healthcare institution)
    let recipient_id, recipient_type;
    if (updatedRequest.patient_id) {
      recipient_id = updatedRequest.patient_id;
      recipient_type = "patient";
    } else if (updatedRequest.institution_id) {
      recipient_id = updatedRequest.institution_id;
      recipient_type = "healthcare_institution";
    }

    if (recipient_id) {
      await notificationService.createNotification({
        recipient_type,
        recipient_id,
        notification_type: "donor_reject",
        notification_title: "Request Rejected",
        notification_message: "Your blood request has been rejected by a donor.",
        related_request_id: request_id,
        related_match_id: donor_id
      }, null);
    }

    res.status(200).json({
      message: "Request rejected successfully.",
      request: updatedRequest
    });
  } catch (error) {
    console.error("Error rejecting request:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getDonorById = async (req, res) => {
  try {
    const donorId = req.params.id || req.user.userId;
    const donor = await donorService.getDonorById(donorId);

    if (!donor) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    // Remove sensitive information
    delete donor.password;
    
    res.status(200).json(donor);
  } catch (error) {
    console.error('Error fetching donor:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateDonor = async (req, res) => {
  try {
    const donorId = req.params.id || req.user.userId;
    const updateData = req.body;

    // Prevent updating sensitive fields
    delete updateData.password;
    delete updateData.email;
    delete updateData.role;

    const updatedDonor = await donorService.updateDonor(donorId, updateData);
    if (!updatedDonor) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    // Remove sensitive information
    delete updatedDonor.password;
    
    res.status(200).json(updatedDonor);
  } catch (error) {
    console.error('Error updating donor:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDonorDashboardData = async (req, res) => {
  try {
    const donorId = req.user.userId;
    const dashboardData = await donorService.getDonorDashboardData(donorId);
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Error fetching donor dashboard data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get current donor profile
export const getCurrentDonor = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const donor = await donorService.getDonorById(userId);
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    return res.status(200).json(donor);
  } catch (error) {
    console.error('Error fetching current donor:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAvailability = async (req, res) => {
  try {
    const donorId = req.params.id;
    const { is_available } = req.body;

    if (typeof is_available !== 'boolean') {
      return res.status(400).json({ message: 'is_available must be a boolean value' });
    }

    const updatedDonor = await donorService.updateDonorAvailability(donorId, is_available);
    if (!updatedDonor) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    res.status(200).json(updatedDonor);
  } catch (error) {
    console.error('Error updating donor availability:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};