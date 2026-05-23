const express = require('express');
const { db } = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/emission-factors
router.get('/emission-factors', (req, res) => {
  const factors = db.prepare('SELECT * FROM emission_factors ORDER BY category, activity_name').all();
  const grouped = {};
  for (const f of factors) {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  }
  res.json(grouped);
});

// POST /api/activities/log
router.post('/log', (req, res) => {
  const { category, activity_name, amount, date } = req.body;
  if (!category || !activity_name || !amount || !date)
    return res.status(400).json({ error: 'All fields required' });

  const factor = db.prepare(
    'SELECT * FROM emission_factors WHERE category = ? AND activity_name = ?'
  ).get(category, activity_name);
  if (!factor) return res.status(404).json({ error: 'Activity not found' });

  const co2_kg = parseFloat(amount) * factor.factor_per_unit;

  db.prepare(`
    INSERT INTO activities (user_id, date, category, activity_name, amount, unit, co2_kg)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.userId, date, category, activity_name, amount, factor.unit, co2_kg);

  // Update streak
  updateStreak(req.userId, date);

  res.json({
    activity: activity_name,
    co2_kg: parseFloat(co2_kg.toFixed(3)),
    unit: factor.unit,
    message: `Logged! That was ${co2_kg.toFixed(2)} kg CO2`
  });
});

function updateStreak(userId, date) {
  const user = db.prepare('SELECT current_streak, longest_streak, last_logged_date FROM users WHERE id = ?').get(userId);
  const today = date;
  const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().split('T')[0];

  let newStreak = 1;
  if (user.last_logged_date === yesterday) {
    newStreak = (user.current_streak || 0) + 1;
  } else if (user.last_logged_date === today) {
    newStreak = user.current_streak || 1;
  }

  const longest = Math.max(newStreak, user.longest_streak || 0);
  db.prepare('UPDATE users SET current_streak = ?, longest_streak = ?, last_logged_date = ? WHERE id = ?')
    .run(newStreak, longest, today, userId);
}

// GET /api/activities/summary
router.get('/summary', (req, res) => {
  const userId = req.userId;
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthStart = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

  const totalToday = db.prepare(
    'SELECT COALESCE(SUM(co2_kg), 0) as total FROM activities WHERE user_id = ? AND date = ?'
  ).get(userId, today).total;

  const totalWeek = db.prepare(
    'SELECT COALESCE(SUM(co2_kg), 0) as total FROM activities WHERE user_id = ? AND date >= ?'
  ).get(userId, weekStart).total;

  const totalMonth = db.prepare(
    'SELECT COALESCE(SUM(co2_kg), 0) as total FROM activities WHERE user_id = ? AND date >= ?'
  ).get(userId, monthStart).total;

  const daily14 = db.prepare(`
    SELECT date, SUM(co2_kg) as co2_kg FROM activities
    WHERE user_id = ? AND date >= ?
    GROUP BY date ORDER BY date ASC
  `).all(userId, twoWeeksAgo);

  const categoryBreakdown = db.prepare(`
    SELECT category, SUM(co2_kg) as total FROM activities
    WHERE user_id = ? AND date >= ?
    GROUP BY category
  `).all(userId, monthStart);

  const totalCat = categoryBreakdown.reduce((s, r) => s + r.total, 0);
  const breakdown = {};
  for (const r of categoryBreakdown) {
    breakdown[r.category] = totalCat > 0 ? parseFloat(((r.total / totalCat) * 100).toFixed(1)) : 0;
  }

  // Today's activities list
  const todayActivities = db.prepare(
    'SELECT * FROM activities WHERE user_id = ? AND date = ? ORDER BY created_at DESC'
  ).all(userId, today);

  const user = db.prepare('SELECT current_streak, longest_streak FROM users WHERE id = ?').get(userId);

  res.json({
    totalToday: parseFloat(totalToday.toFixed(3)),
    totalWeek: parseFloat(totalWeek.toFixed(3)),
    totalMonth: parseFloat(totalMonth.toFixed(3)),
    daily14,
    breakdown,
    todayActivities,
    streak: user.current_streak || 0,
    longestStreak: user.longest_streak || 0
  });
});

// GET /api/activities/compare
router.get('/compare', (req, res) => {
  const userId = req.userId;
  const monthStart = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const user = db.prepare('SELECT city FROM users WHERE id = ?').get(userId);
  const cityAvg = db.prepare(
    'SELECT avg_daily_co2_kg FROM city_averages WHERE city = ?'
  ).get(user.city || 'Hyderabad');

  const userAvgRow = db.prepare(`
    SELECT AVG(daily_total) as avg FROM (
      SELECT date, SUM(co2_kg) as daily_total FROM activities
      WHERE user_id = ? AND date >= ?
      GROUP BY date
    )
  `).get(userId, monthStart);

  const userAvg = userAvgRow.avg || 0;
  const cityAvgVal = cityAvg ? cityAvg.avg_daily_co2_kg : 5.2;
  const globalAvg = 4.7;

  const percentVsCity = cityAvgVal > 0
    ? parseFloat((((userAvg - cityAvgVal) / cityAvgVal) * 100).toFixed(1))
    : 0;

  res.json({
    userAvg: parseFloat(userAvg.toFixed(3)),
    cityAvg: cityAvgVal,
    city: user.city || 'Hyderabad',
    globalAvg,
    percentVsCity
  });
});

// GET /api/activities/today
router.get('/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const activities = db.prepare(
    'SELECT * FROM activities WHERE user_id = ? AND date = ? ORDER BY created_at DESC'
  ).all(req.userId, today);
  res.json(activities);
});

module.exports = router;
