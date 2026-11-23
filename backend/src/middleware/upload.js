const multer = require("multer");

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.has((file.mimetype || "").toLowerCase())) {
      cb(null, true);
    } else {
      const err = new Error("Only JPEG, PNG, and WEBP plant images are supported.");
      err.statusCode = 400;
      cb(err, false);
    }
  },
});

module.exports = upload;
