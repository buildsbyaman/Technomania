const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/quizApp";
const SESSION_SECRET = process.env.SESSION_SECRET || "quiz-admin-secret-key";
const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE) || 86400000;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.set("trust proxy", 1);

const sessionStore = MongoStore.create({
  mongoUrl: MONGODB_URI,
  touchAfter: 24 * 3600,
  crypto: {
    secret: SESSION_SECRET,
  },
  collectionName: "sessions",
});

sessionStore.on("error", (error) => {
  console.error("Session store error:", error);
});

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: SESSION_MAX_AGE,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';",
  );
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );
  next();
});

app.use(bodyParser.urlencoded({ extended: true, limit: "1kb" }));
app.use(bodyParser.json({ limit: "1kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const quizRoutes = require("./routes/quizRoutes");
const adminRoutes = require("./routes/adminRoutes");
const treasureHuntRoutes = require("./routes/treasureHuntRoutes");

app.use("/", quizRoutes);
app.use("/admin", adminRoutes);
app.use("/treasure-hunt", treasureHuntRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
