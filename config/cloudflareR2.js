const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

// Debug R2 configuration
console.log("R2 Configuration:");
console.log("Endpoint:", process.env.CLOUDFLARE_R2_ENDPOINT);
console.log(
  "Access Key ID:",
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? "Set" : "Missing"
);
console.log(
  "Secret Access Key:",
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ? "Set" : "Missing"
);
console.log("Bucket Name:", process.env.CLOUDFLARE_R2_BUCKET_NAME);
console.log("Custom Domain:", process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN);

// Configure AWS SDK v3 for Cloudflare R2
const r2 = new S3Client({
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT, // e.g., https://your-account-id.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  region: "auto", // Cloudflare R2 uses 'auto' as region
  forcePathStyle: true, // Important for R2 compatibility
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const CUSTOM_DOMAIN = process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN; // Optional: your custom domain

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

  // Use custom domain if available
  if (CUSTOM_DOMAIN) {
    return `${CUSTOM_DOMAIN}/${key}`;
  }

  // Use the public development URL format for R2
  // Format: https://pub-{account-id}.r2.dev/{bucket-name}/{key}
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  if (accountId) {
    return `https://pub-${accountId}.r2.dev/${BUCKET_NAME}/${key}`;
  }

  // Fallback to direct R2 URL (may not work if bucket is private)
  return `https://${BUCKET_NAME}.r2.cloudflarestorage.com/${key}`;
};

/**
 * Upload file to Cloudflare R2
 * @param {Object} file - Multer file object
 * @param {string} folder - Folder path in bucket (optional)
 * @returns {Promise<Object>} Upload result with URL
 */
const uploadToR2 = async (file, folder = "") => {
  try {
    // Validate required environment variables
    if (!BUCKET_NAME) {
      throw new Error(
        "CLOUDFLARE_R2_BUCKET_NAME environment variable is not set"
      );
    }
    if (!process.env.CLOUDFLARE_R2_ENDPOINT) {
      throw new Error("CLOUDFLARE_R2_ENDPOINT environment variable is not set");
    }
    if (!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID) {
      throw new Error(
        "CLOUDFLARE_R2_ACCESS_KEY_ID environment variable is not set"
      );
    }
    if (!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
      throw new Error(
        "CLOUDFLARE_R2_SECRET_ACCESS_KEY environment variable is not set"
      );
    }

    const key = folder
      ? `${folder}/${Date.now()}-${file.originalname}`
      : `${Date.now()}-${file.originalname}`;

    console.log(`Uploading to R2: ${BUCKET_NAME}/${key}`);

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Remove ACL as R2 doesn't support it the same way as S3
      // Instead, we'll make the bucket public
    };

    // Use AWS SDK v3 Upload for better performance
    const upload = new Upload({
      client: r2,
      params: uploadParams,
    });

    const result = await upload.done();
    console.log("Upload successful:", result.Location);

    // Use our getFileUrl function to generate the correct URL format
    const fileUrl = getFileUrl(key);

    return {
      success: true,
      url: fileUrl,
      key: key,
      bucket: BUCKET_NAME,
    };
  } catch (error) {
    console.error("R2 upload error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
    });
    return {
      success: false,
      error: error.message,
      details: {
        code: error.code,
        statusCode: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId,
      },
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
