require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database');

const app = express();

const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : true;
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

const PORT = process.env.PORT || 5000;

initializeDatabase().then(() => {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/activities', require('./routes/activities'));
  app.use('/api/tasks', require('./routes/tasks'));
  app.use('/api/leaderboard', require('./routes/leaderboard'));
  app.use('/api/user', require('./routes/user'));
  app.get('/', (req, res) => res.json({ message: 'EcoNudge API running 🌿' }));
  app.listen(PORT, () => console.log(`🌿 EcoNudge server running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});