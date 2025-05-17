const express = require("express");
const app = express();
const shipperRoutes = require("./routes/shipperRoutes");
const driverRoutes = require("./routes/driverRoutes");
const path = require("path");

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/shipper", shipperRoutes);
app.use("/api/driver", driverRoutes);

module.exports = app;
