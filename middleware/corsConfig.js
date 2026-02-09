const cors = require("cors");

const allowedOrigins = [
  "http://localhost:3000",
  "https://northsquad.vercel.app",
];

const corsConfig = cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman / curl

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("❌ Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With"
  ],
});

module.exports = corsConfig;
