const mysql = require("mysql2/promise");
require("dotenv").config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "nodebackendapp",
  port: process.env.DB_PORT || 3306,
};

// R2 configuration
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;

if (!BUCKET_NAME || !ACCOUNT_ID) {
  console.error("❌ Missing required environment variables:");
  console.error("CLOUDFLARE_R2_BUCKET_NAME:", BUCKET_NAME ? "Set" : "Missing");
  console.error("CLOUDFLARE_R2_ACCOUNT_ID:", ACCOUNT_ID ? "Set" : "Missing");
  process.exit(1);
}

// Function to convert old R2 URL to new public development URL
function convertR2Url(oldUrl) {
  if (!oldUrl || !oldUrl.includes("r2.cloudflarestorage.com")) {
    return oldUrl; // Not an old R2 URL, return as is
  }

  // Extract the file path from the old URL
  // Format: https://bee251bebc3feed6004b775c23605955.r2.cloudflarestorage.com/nodefrightmate/profile-images/filename
  const urlParts = oldUrl.split("/");
  if (urlParts.length < 4) {
    return oldUrl; // Invalid URL format
  }

  // Get everything after the bucket name
  const bucketIndex = urlParts.findIndex((part) => part === BUCKET_NAME);
  if (bucketIndex === -1 || bucketIndex >= urlParts.length - 1) {
    return oldUrl; // Bucket name not found or no file path
  }

  // Reconstruct with new public development URL format
  const filePath = urlParts.slice(bucketIndex + 1).join("/");
  const newUrl = `https://pub-${ACCOUNT_ID}.r2.dev/${BUCKET_NAME}/${filePath}`;

  console.log(`Converting: ${oldUrl} -> ${newUrl}`);
  return newUrl;
}

async function migrateUrls() {
  let connection;

  try {
    console.log("🔄 Connecting to database...");
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Database connected successfully");

    // Tables and columns to update
    const tablesToUpdate = [
      {
        table: "users",
        columns: [
          "profile_image",
          "license_file",
          "insurance_file",
          "registration_file",
        ],
      },
      { table: "shipments", columns: ["shipment_images"] },
    ];

    for (const { table, columns } of tablesToUpdate) {
      console.log(`\n📋 Processing table: ${table}`);

      // Check if table exists
      const [tables] = await connection.execute("SHOW TABLES LIKE ?", [table]);

      if (tables.length === 0) {
        console.log(`⚠️  Table ${table} does not exist, skipping...`);
        continue;
      }

      // Get all records from the table
      const [rows] = await connection.execute(`SELECT * FROM ${table}`);
      console.log(`📊 Found ${rows.length} records in ${table}`);

      let updatedCount = 0;

      for (const row of rows) {
        let hasChanges = false;
        const updates = [];
        const values = [];

        for (const column of columns) {
          if (row[column] && row[column].includes("r2.cloudflarestorage.com")) {
            const newUrl = convertR2Url(row[column]);
            if (newUrl !== row[column]) {
              updates.push(`${column} = ?`);
              values.push(newUrl);
              hasChanges = true;
            }
          }
        }

        if (hasChanges) {
          // Add the WHERE clause value (assuming id is the primary key)
          values.push(row.id);

          const updateQuery = `UPDATE ${table} SET ${updates.join(
            ", "
          )} WHERE id = ?`;
          await connection.execute(updateQuery, values);
          updatedCount++;

          console.log(`✅ Updated record ID ${row.id} in ${table}`);
        }
      }

      console.log(`🎉 Updated ${updatedCount} records in ${table}`);
    }

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📝 Summary:");
    console.log(`- Bucket: ${BUCKET_NAME}`);
    console.log(`- Account ID: ${ACCOUNT_ID}`);
    console.log(
      `- New URL format: https://pub-${ACCOUNT_ID}.r2.dev/${BUCKET_NAME}/...`
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 Database connection closed");
    }
  }
}

// Run the migration
console.log("🚀 Starting R2 URL migration...");
console.log(`📦 Bucket: ${BUCKET_NAME}`);
console.log(`🆔 Account ID: ${ACCOUNT_ID}`);
console.log(
  `🔗 New URL format: https://pub-${ACCOUNT_ID}.r2.dev/${BUCKET_NAME}/...`
);
console.log("");

migrateUrls().catch(console.error);
