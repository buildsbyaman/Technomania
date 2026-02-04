const mongoose = require("mongoose");
const Admin = require("./models/Admin");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/quizApp";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

async function createAdmin() {
  try {
    const existingAdmin = await Admin.findOne({ username: ADMIN_USERNAME });

    if (existingAdmin) {
      console.log("⚠️  Admin already exists!");
      process.exit(0);
    }

    await Admin.create({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    });

    console.log("✅ Admin created!");
    console.log(`Username: ${ADMIN_USERNAME}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

createAdmin();
