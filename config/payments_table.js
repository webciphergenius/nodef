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
  // Add recipient_mobile if missing
  await db
    .query(
      `ALTER TABLE shipments 
     ADD COLUMN IF NOT EXISTS recipient_mobile VARCHAR(20) NOT NULL AFTER dropoff_lng`
    )
    .catch(() => {});

  // Add qr_token for confirmation flow
  await db
    .query(
      `ALTER TABLE shipments 
     ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64) NULL AFTER shipment_images`
    )
    .catch(() => {});

  // Optional expiry for QR token
  await db
    .query(
      `ALTER TABLE shipments 
     ADD COLUMN IF NOT EXISTS qr_expires_at DATETIME NULL AFTER qr_token`
    )
    .catch(() => {});
};

createPaymentsTable();
alterShipmentsForQrAndMobile();
