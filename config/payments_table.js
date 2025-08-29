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
};

createPaymentsTable();
alterShipmentsForQrAndMobile();
