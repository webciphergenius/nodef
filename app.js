const express = require("express");
const app = express();
const unifiedRoutes = require("./routes/userRoutes");
const path = require("path");

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api", unifiedRoutes);
module.exports = app;
