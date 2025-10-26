import UserModel from "../models/User.js";
import { ecoPointsRules } from "../config/ecoPoints.js";

export const updateEcoPoints = async (req, res) => {
  try {
    const { userId, action } = req.body;

    if (!ecoPointsRules[action]) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.EcoPoints += ecoPointsRules[action];
    await user.save();

    return res.json({
      success: true,
      message: `EcoPoints updated! (+${ecoPointsRules[action]})`,
      newEcoPoints: user.EcoPoints,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};
