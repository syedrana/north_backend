const cors = require("cors");

const allowedOrigins = [
  "http://localhost:3000",
  "https://haatseba.vercel.app",
  "https://www.haatseba.com",
];

const corsConfig = cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // e.g. Postman, curl

    if (allowedOrigins.includes(origin)) {
      callback(null, true); // allow
    } else {
      console.warn("❌ Blocked by CORS:", origin);
      callback(null, false); // ❌ Don't throw Error
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

module.exports = corsConfig;
