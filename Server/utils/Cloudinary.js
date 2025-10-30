import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Check if Cloudinary is configured
console.log("🔍 Cloudinary Config Check:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "✅ Set" : "❌ Missing",
  api_key: process.env.CLOUDINARY_API_KEY ? "✅ Set" : "❌ Missing", 
  api_secret: process.env.CLOUDINARY_API_SECRET ? "✅ Set" : "❌ Missing"
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = async (file, resourceType = 'image') => {
  try {
    console.log("📤 Cloudinary upload starting...", {
      resourceType,
      fileSize: file.size,
      mimetype: file.mimetype
    });

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: 'chatflow',
          transformation: resourceType === 'video' ? [
            { quality: 'auto' },
            { format: 'mp4' }
          ] : [
            { quality: 'auto' },
            { format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary upload error:", error);
            reject(error);
          } else {
            console.log("✅ Cloudinary upload success:", {
              url: result.secure_url,
              publicId: result.public_id
            });
            resolve({
              success: true,
              url: result.secure_url,
              publicId: result.public_id
            });
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  } catch (error) {
    console.error('❌ Cloudinary upload exception:', error);
    return {
      success: false,
      error: error.message
    };
  }
};