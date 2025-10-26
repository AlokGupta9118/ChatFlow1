import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import {
  getProfile,
  updateProfile,
  uploadProfilePicture,
  uploadCoverPhoto,
  getUserDevices,getUserSettings,
  deleteUserAccount,updateUserSettings,logoutAllDevices,
} from "../controllers/settingController.js";

export const router = express.Router(); // named export
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });



router.get("/profile", protect, getProfile);
router.put("/update-profile", protect, updateProfile);
router.post("/upload-profile", protect, upload.single("file"), uploadProfilePicture);
router.post("/upload-cover", protect, upload.single("file"), uploadCoverPhoto);


// Settings routes
router.get("/get-settings", getUserSettings);
router.put("/update-settings", updateUserSettings);
router.post("/upload-cover", upload.single("file"), uploadCoverPhoto);

// Device & account
router.get("/devices", getUserDevices);
router.post("/logout-all", logoutAllDevices);
router.delete("/delete-account", deleteUserAccount);



export default router;
