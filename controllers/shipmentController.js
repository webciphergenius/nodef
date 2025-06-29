const db = require("../config/db");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { sendNotification } = require("../services/notificationService");
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
        "paid",
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
    await sendNotification(
      shipper_id,
      `Your shipment (${shipment_identifier}) has been created and sent to the drivers. Waiting for the drivers to accept.`
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
      "SELECT * FROM shipments WHERE shipper_id = ? AND status = 'delivered'",
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
      "SELECT * FROM shipments WHERE payment_status = 'paid' AND driver_id IS NULL"
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

    // Get driver details
    const [[driver]] = await db.query(
      "SELECT first_name, last_name FROM users WHERE id = ?",
      [driverId]
    );

    const driverName = `${driver.first_name} ${driver.last_name}`;
    const shipmentIdentifier = shipment.shipment_identifier;

    // Update shipment: assign driver and set status to 'accepted'
    await db.query(
      "UPDATE shipments SET driver_id = ?, status = 'accepted' WHERE id = ?",
      [driverId, shipmentId]
    );

    // ✅ Send notification to shipper
    await sendNotification(
      shipment.shipper_id,
      `Your shipment (${shipmentIdentifier}) has been accepted by the driver “${driverName}”`
    );

    res.status(200).json({ msg: "Shipment accepted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to accept shipment" });
  }
};

exports.listAcceptedShipments = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = "";
    let params = [];

    if (userRole === "driver") {
      query = `
        SELECT s.*, 
               d.first_name AS driver_firstname, d.last_name AS driver_lastname, d.phone AS driver_phone, d.email AS driver_email, d.vehicle_type AS driver_vehicle_type,
               ship.id AS shipper_id, ship.first_name AS shipper_firstname, ship.last_name AS shipper_lastname, ship.phone AS shipper_phone, ship.email AS shipper_email
        FROM shipments s
        JOIN users d ON s.driver_id = d.id
        JOIN users ship ON s.shipper_id = ship.id
        WHERE s.driver_id = ? AND s.status IN ('accepted', 'picked_up', 'in_transit')
      `;
      params = [userId];
    } else if (userRole === "shipper") {
      query = `
        SELECT s.*, 
               d.id AS driver_id, d.first_name AS driver_firstname, d.last_name AS driver_lastname, d.phone AS driver_phone, d.email AS driver_email, d.vehicle_type AS driver_vehicle_type,
               ship.first_name AS shipper_firstname, ship.last_name AS shipper_lastname, ship.phone AS shipper_phone, ship.email AS shipper_email
        FROM shipments s
        JOIN users d ON s.driver_id = d.id
        JOIN users ship ON s.shipper_id = ship.id
        WHERE s.shipper_id = ? AND s.driver_id IS NOT NULL AND s.status IN ('accepted', 'picked_up', 'in_transit')
      `;
      params = [userId];
    } else {
      return res.status(403).json({ msg: "Unauthorized user role" });
    }

    const [rows] = await db.query(query, params);

    const formatted = rows.map((row) => ({
      id: row.id,
      shipment_identifier: row.shipment_identifier,
      vehicle_type: row.vehicle_type,
      pickup_zip: row.pickup_zip,
      pickup_location_name: row.pickup_location_name,
      pickup_lat: row.pickup_lat,
      pickup_lng: row.pickup_lng,
      dropoff_zip: row.dropoff_zip,
      dropoff_location_name: row.dropoff_location_name,
      dropoff_lat: row.dropoff_lat,
      dropoff_lng: row.dropoff_lng,
      package_instructions: row.package_instructions,
      service_level: row.service_level,
      declared_value: row.declared_value,
      payment_status: row.payment_status,
      stripe_payment_id: row.stripe_payment_id,
      status: row.status,
      created_at: row.created_at,
      shipment_images: Array.isArray(row.shipment_images)
        ? row.shipment_images
        : JSON.parse(row.shipment_images || "[]"),
      driver: {
        id: row.driver_id,
        firstname: row.driver_firstname,
        lastname: row.driver_lastname,
        phone: row.driver_phone,
        email: row.driver_email,
        vehicle_type: row.driver_vehicle_type,
      },
      shipper: {
        id: row.shipper_id,
        firstname: row.shipper_firstname,
        lastname: row.shipper_lastname,
        phone: row.shipper_phone,
        email: row.shipper_email,
      },
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
         SUM(CASE WHEN status IN ('accepted', 'picked_up', 'in_transit') THEN 1 ELSE 0 END) AS in_transit,
         SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
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

exports.getDriverDashboardStats = async (req, res) => {
  try {
    const driverId = req.user.id;

    const [[stats]] = await db.query(
      `SELECT 
         COUNT(*) AS total_shipments,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_shipments,
         SUM(CASE WHEN status IN ('accepted', 'picked_up', 'in_transit') THEN 1 ELSE 0 END) AS in_transit_shipments
       FROM shipments
       WHERE driver_id = ?`,
      [driverId]
    );

    res.status(200).json(stats);
  } catch (err) {
    console.error("Driver dashboard stats error:", err);
    res.status(500).json({ msg: "Failed to load dashboard stats" });
  }
};
exports.markPickedUp = async (req, res) => {
  try {
    const shipmentId = req.params.shipmentId;
    const driverId = req.user.id;

    const [rows] = await db.query(
      "SELECT * FROM shipments WHERE id = ? AND driver_id = ?",
      [shipmentId, driverId]
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ msg: "Shipment not found or not assigned to you" });

    await db.query("UPDATE shipments SET status = 'picked_up' WHERE id = ?", [
      shipmentId,
    ]);

    res.status(200).json({ msg: "Shipment marked as picked up" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to update shipment status" });
  }
};
exports.markInTransit = async (req, res) => {
  try {
    const shipmentId = req.params.shipmentId;
    const driverId = req.user.id;

    const [rows] = await db.query(
      "SELECT * FROM shipments WHERE id = ? AND driver_id = ?",
      [shipmentId, driverId]
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ msg: "Shipment not found or not assigned to you" });

    await db.query("UPDATE shipments SET status = 'in_transit' WHERE id = ?", [
      shipmentId,
    ]);

    res.status(200).json({ msg: "Shipment marked as in transit" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to update shipment status" });
  }
};
exports.markDelivered = async (req, res) => {
  try {
    const shipmentId = req.params.shipmentId;
    const driverId = req.user.id;

    const [rows] = await db.query(
      "SELECT * FROM shipments WHERE id = ? AND driver_id = ?",
      [shipmentId, driverId]
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ msg: "Shipment not found or not assigned to you" });

    await db.query("UPDATE shipments SET status = 'delivered' WHERE id = ?", [
      shipmentId,
    ]);

    res.status(200).json({ msg: "Shipment marked as delivered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to update shipment status" });
  }
};
