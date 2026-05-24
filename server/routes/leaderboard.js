const express = require('express');
const { db } = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Points leaderboard
router.get('/points', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT u.id, u.display_name, u.city,
        COALESCE(SUM(ut.points_earned), 0) as total_points,
        COUNT(ut.id) as tasks_completed
      FROM users u
      LEFT JOIN user_tasks ut ON u.id = ut.user_id
      GROUP BY u.id
      ORDER BY total_points DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Emissions leaderboard
router.get('/emissions', async (req, res) => {
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  try {
    const result = await db.execute({
      sql: `
        SELECT u.id, u.display_name, u.city,
          COALESCE(SUM(a.co2_kg), 0) as co2_this_week
        FROM users u
        LEFT JOIN activities a ON u.id = a.user_id AND a.date >= ?
        GROUP BY u.id
        HAVING co2_this_week > 0
        ORDER BY co2_this_week ASC
        LIMIT 20
      `,
      args: [weekStart]
    });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Default route
router.get('/', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT u.id, u.display_name, u.city,
        COALESCE(SUM(ut.points_earned), 0) as total_points,
        COUNT(ut.id) as tasks_completed
      FROM users u
      LEFT JOIN user_tasks ut ON u.id = ut.user_id
      GROUP BY u.id
      ORDER BY total_points DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;