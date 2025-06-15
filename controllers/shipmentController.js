const db = require("../config/db");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.createShipment = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ msg: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const shipper_id = decoded.id;

  const {
    vehicle_type,
    pickup_zip,
    pickup_location_name,
    pickup_lat,
    pickup_lng,
    dropoff_zip,
    dropoff_location_name,
    dropoff_lat,
    dropoff_lng,
    package_instructions,
    service_level,
    declared_value,
    terms_acknowledged,
  } = req.body;

  if (
    !vehicle_type ||
    !pickup_zip ||
    !dropoff_zip ||
    !service_level ||
    !declared_value ||
    !terms_acknowledged ||
    !pickup_lat ||
    !pickup_lng ||
    !dropoff_lat ||
    !dropoff_lng
  ) {
    return res.status(400).json({ msg: "Missing required shipment fields" });
  }

  const shipment_images = req.files?.map((f) => `/uploads/${f.filename}`) || [];

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "FreightMate Shipment Payment" },
            unit_amount: parseFloat(declared_value) * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        shipper_id: shipper_id.toString(),
      },
      success_url:
        "https://yourdomain.com/payment-success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://yourdomain.com/payment-cancel",
    });

    // Insert shipment (without shipment_identifier yet)
    const [result] = await db.query(
      `INSERT INTO shipments (
        shipper_id, vehicle_type, pickup_zip, pickup_location_name,
        pickup_lat, pickup_lng, dropoff_zip, dropoff_location_name,
        dropoff_lat, dropoff_lng, package_instructions, shipment_images,
        service_level, declared_value, terms_acknowledged, 
        stripe_payment_id, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shipper_id,
        vehicle_type,
        pickup_zip,
        pickup_location_name,
        pickup_lat,
        pickup_lng,
        dropoff_zip,
        dropoff_location_name,
        dropoff_lat,
        dropoff_lng,
        package_instructions,
        JSON.stringify(shipment_images),
        service_level,
        declared_value,
        terms_acknowledged,
        session.id,
        "pending",
      ]
    );

    const shipmentId = result.insertId;
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const shipment_identifier = `shipment-${dateStr}-${String(
      shipmentId
    ).padStart(5, "0")}`;

    // Update with custom shipment_identifier
    await db.query(
      `UPDATE shipments SET shipment_identifier = ? WHERE id = ?`,
      [shipment_identifier, shipmentId]
    );

    res.status(201).json({
      msg: "Shipment created. Complete payment to proceed.",
      shipment_identifier,
      payment_url: session.url,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to create shipment or payment link" });
  }
};

// Get all shipments created by logged-in shipper with payment done (active)
exports.getActiveShipments = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ msg: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const shipperId = decoded.id;

    const [rows] = await db.query(
      "SELECT * FROM shipments WHERE shipper_id = ? AND payment_status = 'paid'",
      [shipperId]
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch active shipments" });
  }
};

// For now, treat delivered = shipment manually marked as completed
exports.getCompletedShipments = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ msg: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const shipperId = decoded.id;

    const [rows] = await db.query(
      "SELECT * FROM shipments WHERE shipper_id = ? AND is_completed = 1",
      [shipperId]
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch completed shipments" });
  }
};
//list available shipments for drivers
exports.listAvailableShipments = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, vehicle_type, pickup_zip, dropoff_zip, service_level, declared_value, shipment_images, created_at,shipper_id,driver_id FROM shipments WHERE payment_status = 'paid' AND driver_id IS NULL"
    );

    const formatted = rows.map((row) => ({
      ...row,
      shipment_images: Array.isArray(row.shipment_images)
        ? row.shipment_images
        : JSON.parse(row.shipment_images || "[]"),
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch available shipments" });
  }
};
exports.acceptShipment = async (req, res) => {
  try {
    const shipmentId = req.params.shipmentId;
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const driverId = decoded.id;

    const [shipments] = await db.query(
      "SELECT * FROM shipments WHERE id = ? AND payment_status = 'paid'",
      [shipmentId]
    );

    if (!shipments.length)
      return res.status(404).json({ msg: "Shipment not found or not paid" });

    const shipment = shipments[0];

    if (shipment.driver_id)
      return res
        .status(400)
        .json({ msg: "Shipment already accepted by another driver" });

    await db.query("UPDATE shipments SET driver_id = ? WHERE id = ?", [
      driverId,
      shipmentId,
    ]);

    res.status(200).json({ msg: "Shipment accepted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to accept shipment" });
  }
};
exports.listAcceptedShipments = async (req, res) => {
  try {
    const driverId = req.user.id;
    const [rows] = await db.query(
      "SELECT * FROM shipments WHERE driver_id = ? AND is_completed = 0",
      [driverId]
    );

    const formatted = rows.map((row) => ({
      ...row,
      shipment_images: Array.isArray(row.shipment_images)
        ? row.shipment_images
        : JSON.parse(row.shipment_images || "[]"),
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch accepted shipments" });
  }
};
//track shipment
exports.updateLocation = async (req, res) => {
  const { latitude, longitude } = req.body;
  const driverId = req.user.id;
  const shipmentId = req.params.shipmentId;

  try {
    await db.query(
      `INSERT INTO locations (shipment_id, driver_id, latitude, longitude) VALUES (?, ?, ?, ?)`,
      [shipmentId, driverId, latitude, longitude]
    );
    res.status(200).json({ msg: "Location updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to update location" });
  }
};
exports.getLatestLocation = async (req, res) => {
  const shipmentId = req.params.shipmentId;
  try {
    const [rows] = await db.query(
      `SELECT latitude, longitude, timestamp FROM locations WHERE shipment_id = ? ORDER BY timestamp DESC LIMIT 1`,
      [shipmentId]
    );

    if (!rows.length) {
      return res.status(404).json({ msg: "No location found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch location" });
  }
};
exports.getShipmentCounts = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ msg: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const shipperId = decoded.id;

    const [rows] = await db.query(
      `SELECT 
         COUNT(*) AS total_shipments,
         SUM(CASE WHEN driver_id IS NOT NULL AND is_completed = 0 THEN 1 ELSE 0 END) AS in_transit,
         SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN driver_id IS NULL THEN 1 ELSE 0 END) AS pending
       FROM shipments
       WHERE shipper_id = ? AND payment_status = 'paid'`,
      [shipperId]
    );

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch shipment counts" });
  }
};
