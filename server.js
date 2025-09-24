const express = require("express");
const dotenv = require("dotenv");
const pool = require("./db/index");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware JSON
app.use(express.json());

// Rate limit (100 req / 15min par IP)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: "Trop de requêtes, réessayez plus tard" },
  })
);

// ✅ Health check
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "up" });
  } catch (err) {
    res.json({ status: "ok", db: "down" });
  }
});

// Exemple route test
app.get("/", (req, res) => {
  res.send("Backend Express + MySQL !");
});

// Middleware gestion erreurs
app.use(errorHandler);

// Lancer serveur
app.listen(port, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});
