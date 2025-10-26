import CollectionModel from "../models/Collection.js";
import UserModel from "../models/User.js";




export const addWasteImage = async (req, res) => {
  try {
    const userId = req.user._id;

    // Validate uploaded file
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ message: "No image uploaded or file invalid" });
    }

    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
    const imageUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `${BASE_URL}${imageUrl}`;

    // Find or create user's collection
    let collection = await CollectionModel.findOne({ user: userId });
    if (!collection) {
      collection = await CollectionModel.create({ user: userId, plantation: [], wasteSegregation: [] });
    }

    // Add image and save
    collection.wasteSegregation.push(imageUrl);
    await collection.save();

    res.status(200).json({
      message: "Waste image added successfully",
      imageUrl: fullUrl,
      collection,
    });
  } catch (error) {
    console.error("Error adding waste image:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const addPlantationImage = async (req, res) => {
  try {
    const userId = req.user._id;

    // Validate uploaded file
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ message: "No image uploaded or file invalid" });
    }

    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
    const imageUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `${BASE_URL}${imageUrl}`;

    // Find or create user's collection
    let collection = await CollectionModel.findOne({ user: userId });
    if (!collection) {
      collection = await CollectionModel.create({ user: userId, plantation: [], wasteSegregation: [] });
    }

    // Add image and save
    collection.plantation.push(imageUrl);
    await collection.save();

    res.status(200).json({
      message: "Plantation image added successfully",
      imageUrl: fullUrl,
      collection,
    });
  } catch (error) {
    console.error("Error adding plantation image:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// Optional: Remove image from collection
export const removeImage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { imageUrl, type } = req.body; // type = "plantation" | "waste"

    if (!imageUrl || !type) return res.status(400).json({ message: "Image URL and type are required" });

    const collection = await CollectionModel.findOne({ user: userId });
    if (!collection) return res.status(404).json({ message: "Collection not found" });

    if (type === "plantation") {
      collection.plantation = collection.plantation.filter(img => img !== imageUrl);
    } else if (type === "waste") {
      collection.wasteSegregation = collection.wasteSegregation.filter(img => img !== imageUrl);
    } else {
      return res.status(400).json({ message: "Invalid type" });
    }

    await collection.save();
    res.status(200).json({ message: "Image removed successfully", collection });
  } catch (error) {
    console.error("Error removing image:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserCollection = async (req, res) => {
  try {
    const userId = req.user._id;
    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

    // Fetch user info
    const user = await UserModel.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    // Fetch collection
    let collection = await CollectionModel.findOne({ user: userId }).lean();
    if (!collection) {
      const newCollection = await CollectionModel.create({ user: userId, plantation: [], wasteSegregation: [] });
      collection = newCollection.toObject();
    }

    // Filter out invalid images and convert to full URLs
    const fullPlantation = (collection.plantation || [])
      .filter(img => typeof img === "string" && img.trim() !== "" && img !== "/uploads/undefined")
      .map(img => `${BASE_URL}${img}`);

    const fullWaste = (collection.wasteSegregation || [])
      .filter(img => typeof img === "string" && img.trim() !== "" && img !== "/uploads/undefined")
      .map(img => `${BASE_URL}${img}`);

    // Fetch badges
    const badges = await BadgeModel.find({ user: userId }).lean();

    // Build response
    const response = {
      user: {
        name: user.name,
        email: user.email,
        schoolCode: user.schoolCode,
        studentId: user.studentId,
        teacherId: user.teacherId,
        adminId: user.adminId,
        EcoPoints: user.EcoPoints,
        streak: user.streak,
        lastLogin: user.lastLogin,
        picture: user.picture ? `${BASE_URL}${user.picture}` : null,
        solvedList: user.solvedList || [],
      },
      collection: {
        plantation: fullPlantation,
        wasteSegregation: fullWaste,
      },
      badges: badges.map(b => ({
        name: b.name,
        icon: b.icon,
        description: b.description
      })),
      challengesDone: user.solvedList?.length || 0
    };

    res.status(200).json(response);

  } catch (error) {
    console.error("Error fetching collection:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


