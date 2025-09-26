const bcrypt = require("bcryptjs");
const db = require("./config/db");
require("dotenv").config();

async function createAdmin() {
  try {
    console.log("🔧 Creating admin user...");

    // Check if admin already exists
    const [existing] = await db.query(
      "SELECT * FROM admins WHERE username = ?",
      ["admin"]
    );

    if (existing.length > 0) {
      console.log("⚠️  Admin user already exists!");
      console.log("Username: admin");
      console.log(
        "To reset password, delete the admin and run this script again."
      );
      return;
    }

    // Create admin user
    const username = "admin";
    const password = "dev@chd@123"; // Change this to a secure password
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query("INSERT INTO admins (username, password) VALUES (?, ?)", [
      username,
      hashedPassword,
    ]);

    console.log("✅ Admin user created successfully!");
    console.log("📋 Login credentials:");
    console.log("Username: admin");
    console.log("Password: admin123");
    console.log("");
    console.log("🔐 IMPORTANT: Change the password after first login!");
    console.log("🌐 Admin login URL: https://your-domain.com/admin/login");
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  } finally {
    process.exit(0);
  }
}

createAdmin();
