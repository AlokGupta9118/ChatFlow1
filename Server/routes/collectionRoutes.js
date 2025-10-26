import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js"
import { getUserCollection, addPlantationImage, addWasteImage, removeImage } from "../controllers/collectionController.js";
import multer from "multer";

const router = express.Router();



router.post("/plantation", protect, upload.single("image"), addPlantationImage);
router.post("/waste", protect, upload.single("image"), addWasteImage);

// Get user collection
router.get("/me", protect, getUserCollection);


// Remove image
router.delete("/remove", protect, removeImage);



export default router;
