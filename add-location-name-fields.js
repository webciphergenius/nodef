const db = require("./config/db");
require("dotenv").config();

async function addLocationNameFields() {
  try {
    console.log("🔧 Adding location name fields to shipments table...");

    // Check if columns already exist
    const columnExists = async (table, column) => {
      const [rows] = await db.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );
      return rows.length > 0;
    };

    // Add pickup_location_name column
    if (!(await columnExists("shipments", "pickup_location_name"))) {
      await db.query(
        `ALTER TABLE shipments ADD COLUMN pickup_location_name VARCHAR(255) NULL AFTER pickup_zip`
      );
      console.log("✅ Added shipments.pickup_location_name column");
    } else {
      console.log("⚠️  shipments.pickup_location_name column already exists");
    }

    // Add pickup_name column
    if (!(await columnExists("shipments", "pickup_name"))) {
      await db.query(
        `ALTER TABLE shipments ADD COLUMN pickup_name VARCHAR(255) NULL AFTER pickup_location_name`
      );
      console.log("✅ Added shipments.pickup_name column");
    } else {
      console.log("⚠️  shipments.pickup_name column already exists");
    }

    // Add dropoff_location_name column
    if (!(await columnExists("shipments", "dropoff_location_name"))) {
      await db.query(
        `ALTER TABLE shipments ADD COLUMN dropoff_location_name VARCHAR(255) NULL AFTER dropoff_zip`
      );
      console.log("✅ Added shipments.dropoff_location_name column");
    } else {
      console.log("⚠️  shipments.dropoff_location_name column already exists");
    }

    // Add dropoff_name column
    if (!(await columnExists("shipments", "dropoff_name"))) {
      await db.query(
        `ALTER TABLE shipments ADD COLUMN dropoff_name VARCHAR(255) NULL AFTER dropoff_location_name`
      );
      console.log("✅ Added shipments.dropoff_name column");
    } else {
      console.log("⚠️  shipments.dropoff_name column already exists");
    }

    console.log("🎉 Database migration completed successfully!");
  } catch (error) {
    console.error("❌ Error adding location name fields:", error);
  } finally {
    process.exit(0);
  }
}

addLocationNameFields();
