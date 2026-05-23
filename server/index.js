require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database');

const app = express();

// Allow requests from your Vercel frontend
// Locally: allows everything. On Railway: set FRONTEND_URL to your Vercel URL
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : true; // true = allow all origins (safe for local dev)

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Initialize DB
initializeDatabase();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/user', require('./routes/user'));

app.get('/', (req, res) => res.json({ message: 'EcoNudge API running 🌿' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🌿 EcoNudge server running on port ${PORT}`));
