// controllers/userController.js
import * as userService from "../services/userServices.js";

// Get all users (Donors, Patients, Healthcare Institutions)
export const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Verify a user
export const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_type } = req.body; // Expect user_type to be sent in the request body

    if (!user_type) {
      return res.status(400).json({ message: "User type is required" });
    }

    const updatedUser = await userService.verifyUser(id, user_type);
    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("Error verifying user:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Deactivate a user
export const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_type } = req.body; // Expect user_type to be sent in the request body

    if (!user_type) {
      return res.status(400).json({ message: "User type is required" });
    }

    const updatedUser = await userService.deactivateUser(id, user_type);
    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("Error deactivating user:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};