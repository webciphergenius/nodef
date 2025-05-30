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
    dropoff_zip,
    dropoff_location_name,
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
    !terms_acknowledged
  )
    return res.status(400).json({ msg: "Missing required shipment fields" });

  const shipment_images = req.files?.map((f) => `/uploads/${f.filename}`) || [];

  try {
    const paymentIntent = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "FreightMate Shipment Payment",
            },
            unit_amount: parseFloat(declared_value) * 100,
          },
          quantity: 1,
        },
      ],
      metadata: { shipper_id: shipper_id.toString() },
    });

    const [result] = await db.query(
      "INSERT INTO shipments (shipper_id, vehicle_type, pickup_zip, pickup_location_name, dropoff_zip, dropoff_location_name, package_instructions, shipment_images, service_level, declared_value, terms_acknowledged, stripe_payment_id, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        shipper_id,
        vehicle_type,
        pickup_zip,
        pickup_location_name,
        dropoff_zip,
        dropoff_location_name,
        package_instructions,
        JSON.stringify(shipment_images),
        service_level,
        declared_value,
        terms_acknowledged,
        paymentIntent.id,
        "pending",
      ]
    );

    res.status(201).json({
      msg: "Shipment created. Complete payment to proceed.",
      payment_url: paymentIntent.url,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to create shipment or payment link" });
  }
};
