import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder;
    if (file.fieldname === "profile") folder = "profile";
    else if (file.fieldname === "cover") folder = "cover";
    else if (file.fieldname === "story") folder = "stories"; // for stories
    else folder = "others";

    const dir = `uploads/${folder}`;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "_" + file.originalname;
    cb(null, unique);
  },
});

export const upload = multer({ storage });
