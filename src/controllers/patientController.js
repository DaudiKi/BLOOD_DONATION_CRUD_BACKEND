// controllers/patientController.js
import * as patientService from "../services/patientServices.js";

// Get current patient's profile
export const getCurrentPatient = async (req, res) => {
  try {
    const patientId = req.user.userId; // From JWT token
    const patient = await patientService.getPatientById(patientId);
    
    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }
    
    // Remove sensitive information
    delete patient.password;
    res.status(200).json(patient);
  } catch (err) {
    console.error("Error fetching current patient:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Other functions remain unchanged...
export const getNotifications = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const notifications = await patientService.getPatientNotifications(patientId);
    res.status(200).json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const notificationId = req.params.notificationId;
    await patientService.markNotificationAsRead(notificationId, patientId);
    res.status(200).json({ message: "Notification marked as read" });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getPatients = async (req, res) => {
  try {
    const patients = await patientService.getPatients();
    res.status(200).json(patients);
  } catch (err) {
    console.error("Error fetching patients:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createPatients = async (req, res) => {
  try {
    const patientData = req.body;
    const newPatient = await patientService.createPatients(patientData);
    res.status(200).json(newPatient);
  } catch (err) {
    console.error("Error adding patient:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updatePatients = async (req, res) => {
  try {
    const patient_id = req.params.patient_id;
    const patientData = req.body;
    const updatedPatient = await patientService.updatePatients(patientData, patient_id);
    if (!updatedPatient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.status(200).json(updatedPatient);
  } catch (err) {
    console.error("Error updating patient:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deletePatients = async (req, res) => {
  try {
    const patient_id = req.params.patient_id;
    const deleted = await patientService.deletePatients(patient_id);
    if (!deleted) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.status(200).send();
  } catch (err) {
    console.error("Error deleting patient:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const searchPatients = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const patients = await patientService.searchPatients(searchTerm);
    res.status(200).json(patients);
  } catch (error) {
    console.error("Error searching patients:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};