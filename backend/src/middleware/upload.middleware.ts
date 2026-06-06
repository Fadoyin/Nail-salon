import multer from "multer";
import path from "path";
import fs from "fs";

export const UPLOADS_DIR = path.join(process.cwd(), "uploads", "logos");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    cb(null, `logo-${Date.now()}${ext}`);
  },
});

function fileFilter(
  _req: unknown,
  file: { mimetype: string; originalname: string },
  cb: multer.FileFilterCallback
) {
  const allowed = [".png", ".svg", ".jpg", ".jpeg", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext) || file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only PNG, SVG, JPG, or WEBP images are allowed"));
  }
}

export const logoUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});
