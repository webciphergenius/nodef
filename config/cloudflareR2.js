const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

// Configure AWS SDK v3 for Cloudflare R2
const r2 = new S3Client({
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT, // e.g., https://your-account-id.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  region: "auto", // Cloudflare R2 uses 'auto' as region
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const CUSTOM_DOMAIN = process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN; // Optional: your custom domain

/**
 * Upload file to Cloudflare R2
 * @param {Object} file - Multer file object
 * @param {string} folder - Folder path in bucket (optional)
 * @returns {Promise<Object>} Upload result with URL
 */
const uploadToR2 = async (file, folder = "") => {
  try {
    const key = folder
      ? `${folder}/${Date.now()}-${file.originalname}`
      : `${Date.now()}-${file.originalname}`;

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read", // Make file publicly accessible
    };

    // Use AWS SDK v3 Upload for better performance
    const upload = new Upload({
      client: r2,
      params: uploadParams,
    });

    const result = await upload.done();

    // Return URL - use custom domain if available, otherwise use R2 URL
    const fileUrl = CUSTOM_DOMAIN ? `${CUSTOM_DOMAIN}/${key}` : result.Location;

    return {
      success: true,
      url: fileUrl,
      key: key,
      bucket: BUCKET_NAME,
    };
  } catch (error) {
    console.error("R2 upload error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Delete file from Cloudflare R2
 * @param {string} key - File key in bucket
 * @returns {Promise<Object>} Delete result
 */
const deleteFromR2 = async (key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await r2.send(new DeleteObjectCommand(params));

    return {
      success: true,
      message: "File deleted successfully",
    };
  } catch (error) {
    console.error("R2 delete error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get file URL from key
 * @param {string} key - File key in bucket
 * @returns {string} File URL
 */
const getFileUrl = (key) => {
  if (!key) return null;

  // If key already contains full URL, return as is
  if (key.startsWith("http")) {
    return key;
  }

  // Construct URL from key
  return CUSTOM_DOMAIN
    ? `${CUSTOM_DOMAIN}/${key}`
    : `https://${BUCKET_NAME}.r2.cloudflarestorage.com/${key}`;
};

/**
 * Extract key from URL
 * @param {string} url - File URL
 * @returns {string} File key
 */
const extractKeyFromUrl = (url) => {
  if (!url) return null;

  // If it's already a key (no http), return as is
  if (!url.startsWith("http")) {
    return url;
  }

  // Extract key from URL
  if (CUSTOM_DOMAIN && url.includes(CUSTOM_DOMAIN)) {
    return url.replace(`${CUSTOM_DOMAIN}/`, "");
  }

  // Extract from R2 URL
  const r2UrlPattern = new RegExp(
    `https://${BUCKET_NAME}\\.r2\\.cloudflarestorage\\.com/(.+)`
  );
  const match = url.match(r2UrlPattern);
  return match ? match[1] : null;
};

module.exports = {
  r2,
  uploadToR2,
  deleteFromR2,
  getFileUrl,
  extractKeyFromUrl,
  BUCKET_NAME,
};
