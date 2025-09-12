const db = require("./db");

const createPaymentsTable = async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shipment_id INT NOT NULL,
    shipper_id INT NOT NULL,
    driver_id INT,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(255) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
    FOREIGN KEY (shipper_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL
  )`);
};

const alterShipmentsForQrAndMobile = async () => {
  const columnExists = async (table, column) => {
    const [rows] = await db.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    return rows.length > 0;
  };

  try {
    if (!(await columnExists("shipments", "recipient_mobile"))) {
      await db.query(
        `ALTER TABLE shipments ADD COLUMN recipient_mobile VARCHAR(20) NOT NULL AFTER dropoff_lng`
      );
      console.log("DB: Added shipments.recipient_mobile");
    }
  } catch (e) {
    console.error("DB: Failed adding shipments.recipient_mobile:", e.message);
  }

  try {
    if (!(await columnExists("shipments", "qr_token"))) {
      await db.query(
        `ALTER TABLE shipments ADD COLUMN qr_token VARCHAR(64) NULL AFTER shipment_images`
      );
      console.log("DB: Added shipments.qr_token");
    }
  } catch (e) {
    console.error("DB: Failed adding shipments.qr_token:", e.message);
  }

  try {
    if (!(await columnExists("shipments", "qr_expires_at"))) {
      await db.query(
        `ALTER TABLE shipments ADD COLUMN qr_expires_at DATETIME NULL AFTER qr_token`
      );
      console.log("DB: Added shipments.qr_expires_at");
    }
  } catch (e) {
    console.error("DB: Failed adding shipments.qr_expires_at:", e.message);
  }

  // Fix status column size to accommodate new status values
  try {
    await db.query(
      `ALTER TABLE shipments MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending'`
    );
    console.log("DB: Updated shipments.status column size");
  } catch (e) {
    console.error("DB: Failed updating shipments.status column:", e.message);
  }

  // Add address fields to users table
  try {
    if (!(await columnExists("users", "city"))) {
      await db.query(
        `ALTER TABLE users ADD COLUMN city VARCHAR(100) NULL AFTER address`
      );
      console.log("DB: Added users.city");
    }
  } catch (e) {
    console.error("DB: Failed adding users.city:", e.message);
  }

  try {
    if (!(await columnExists("users", "state"))) {
      await db.query(
        `ALTER TABLE users ADD COLUMN state VARCHAR(100) NULL AFTER city`
      );
      console.log("DB: Added users.state");
    }
  } catch (e) {
    console.error("DB: Failed adding users.state:", e.message);
  }

  try {
    if (!(await columnExists("users", "apartment"))) {
      await db.query(
        `ALTER TABLE users ADD COLUMN apartment VARCHAR(100) NULL AFTER state`
      );
      console.log("DB: Added users.apartment");
    }
  } catch (e) {
    console.error("DB: Failed adding users.apartment:", e.message);
  }

  // Add device_token for push notifications
  try {
    if (!(await columnExists("users", "device_token"))) {
      await db.query(
        `ALTER TABLE users ADD COLUMN device_token VARCHAR(255) NULL AFTER apartment`
      );
      console.log("DB: Added users.device_token");
    }
  } catch (e) {
    console.error("DB: Failed adding users.device_token:", e.message);
  }

  // Add cancellation fields to shipments table
  try {
    if (!(await columnExists("shipments", "cancellation_reason"))) {
      await db.query(
        `ALTER TABLE shipments ADD COLUMN cancellation_reason TEXT NULL AFTER qr_expires_at`
      );
      console.log("DB: Added shipments.cancellation_reason");
    }
  } catch (e) {
    console.error(
      "DB: Failed adding shipments.cancellation_reason:",
      e.message
    );
  }

  try {
    if (!(await columnExists("shipments", "cancelled_by"))) {
      await db.query(
        `ALTER TABLE shipments ADD COLUMN cancelled_by INT NULL AFTER cancellation_reason`
      );
      console.log("DB: Added shipments.cancelled_by");
    }
  } catch (e) {
    console.error("DB: Failed adding shipments.cancelled_by:", e.message);
  }

  try {
    if (!(await columnExists("shipments", "cancelled_at"))) {
      await db.query(
        `ALTER TABLE shipments ADD COLUMN cancelled_at DATETIME NULL AFTER cancelled_by`
      );
      console.log("DB: Added shipments.cancelled_at");
    }
  } catch (e) {
    console.error("DB: Failed adding shipments.cancelled_at:", e.message);
  }
};

createPaymentsTable();
alterShipmentsForQrAndMobile();
