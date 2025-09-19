const path = require("path");
const fs = require("fs");
const {
  uploadToR2,
  getFileUrl,
  extractKeyFromUrl,
} = require("../config/cloudflareR2");

/**
 * Check if Cloudflare R2 is configured
 */
const isR2Configured = () => {
  return !!(
    process.env.CLOUDFLARE_R2_ENDPOINT &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME
  );
};

/**
 * Get the appropriate upload path for local storage (fallback)
 */
const getLocalUploadPath = () => {
  // Use persistent storage path if available (Kinsta), otherwise fallback to local uploads
  const persistentPath = process.env.PERSISTENT_STORAGE_PATH || "/app/uploads";
  const localPath = path.resolve(process.cwd(), "uploads");

  // Check if persistent storage path exists, otherwise use local path
  try {
    if (fs.existsSync(persistentPath)) {
      console.log("Using persistent storage path:", persistentPath);
      return persistentPath;
    }
  } catch (error) {
    console.log("Persistent storage not available, using local uploads");
  }

  console.log("Using local uploads path:", localPath);
  return localPath;
};

/**
 * Ensure local upload directory exists (for fallback)
 */
const ensureLocalUploadDir = () => {
  const uploadPath = getLocalUploadPath();

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log("Created uploads directory:", uploadPath);
  }

  return uploadPath;
};

/**
 * Get multer storage configuration
 * Uses Cloudflare R2 if configured, otherwise falls back to local storage
 */
const getMulterStorage = () => {
  const multer = require("multer");

  if (isR2Configured()) {
    console.log("Using Cloudflare R2 for file storage");

    // Memory storage for R2 (files will be uploaded to R2, not saved locally)
    return multer.memoryStorage();
  } else {
    console.log("Using local storage (R2 not configured)");

    // Disk storage for local files
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = getLocalUploadPath();

        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
      },
    });
  }
};

/**
 * Upload file to appropriate storage (R2 or local)
 * @param {Object} file - Multer file object
 * @param {string} folder - Folder path (optional)
 * @returns {Promise<Object>} Upload result
 */
const uploadFile = async (file, folder = "") => {
  if (isR2Configured()) {
    // Upload to Cloudflare R2
    const result = await uploadToR2(file, folder);
    if (result.success) {
      return {
        success: true,
        filename: result.key,
        url: result.url,
        storage: "r2",
      };
    } else {
      throw new Error(`R2 upload failed: ${result.error}`);
    }
  } else {
    // Local storage - file is already saved by multer
    const filename = file.filename;
    const url = `/uploads/${filename}`;

    return {
      success: true,
      filename: filename,
      url: url,
      storage: "local",
    };
  }
};

/**
 * Get file URL from filename/key
 * @param {string} filename - File filename or key
 * @returns {string} File URL
 */
const getFileUrlFromFilename = (filename) => {
  if (!filename) return null;

  if (isR2Configured()) {
    return getFileUrl(filename);
  } else {
    return `/uploads/${filename}`;
  }
};

/**
 * Get static file serving path
 */
const getStaticPath = () => {
  if (isR2Configured()) {
    // For R2, we don't need to serve files statically
    // Files are served directly from R2 URLs
    return null;
  } else {
    return ensureLocalUploadDir();
  }
};

module.exports = {
  isR2Configured,
  getLocalUploadPath,
  ensureLocalUploadDir,
  getMulterStorage,
  uploadFile,
  getFileUrlFromFilename,
  getStaticPath,
};
