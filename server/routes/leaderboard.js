const express = require('express');
const { db } = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/leaderboard/emissions
router.get('/emissions', (req, res) => {
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const rows = db.prepare(`
    SELECT u.id, u.email, u.city, SUM(a.co2_kg) as total_co2
    FROM users u
    JOIN activities a ON a.user_id = u.id
    WHERE a.date >= ?
    GROUP BY u.id
    ORDER BY total_co2 ASC
    LIMIT 10
  `).all(weekStart);

  res.json(rows.map((r, i) => ({
    rank: i + 1,
    name: r.email.split('@')[0],
    city: r.city || 'Unknown',
    co2_this_week: parseFloat(r.total_co2.toFixed(2)),
    isCurrentUser: r.id === req.userId
  })));
});

// GET /api/leaderboard/points
router.get('/points', (req, res) => {
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const rows = db.prepare(`
    SELECT u.id, u.email, u.city, SUM(ut.points_earned) as total_points
    FROM users u
    JOIN user_tasks ut ON ut.user_id = u.id
    WHERE DATE(ut.completed_at) >= ?
    GROUP BY u.id
    ORDER BY total_points DESC
    LIMIT 10
  `).all(weekStart);

  res.json(rows.map((r, i) => ({
    rank: i + 1,
    name: r.email.split('@')[0],
    city: r.city || 'Unknown',
    points: r.total_points,
    isCurrentUser: r.id === req.userId
  })));
});

module.exports = router;
