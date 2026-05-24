const express = require('express');
const { db } = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/emission-factors', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM emission_factors ORDER BY category, activity_name');
    const grouped = {};
    for (const f of result.rows) {
      if (!grouped[f.category]) grouped[f.category] = [];
      grouped[f.category].push(f);
    }
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch emission factors' });
  }
});

router.post('/log', async (req, res) => {
  const { category, activity_name, amount, date } = req.body;
  if (!category || !activity_name || !amount || !date) return res.status(400).json({ error: 'All fields required' });
  try {
    const factorResult = await db.execute({ sql: 'SELECT * FROM emission_factors WHERE category = ? AND activity_name = ?', args: [category, activity_name] });
    const factor = factorResult.rows[0];
    if (!factor) return res.status(404).json({ error: 'Activity not found' });
    const co2_kg = parseFloat(amount) * factor.factor_per_unit;
    await db.execute({ sql: 'INSERT INTO activities (user_id, date, category, activity_name, amount, unit, co2_kg) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [req.userId, date, category, activity_name, amount, factor.unit, co2_kg] });
    await updateStreak(req.userId, date);
    res.json({ activity: activity_name, co2_kg: parseFloat(co2_kg.toFixed(3)), unit: factor.unit, message: `Logged! That was ${co2_kg.toFixed(2)} kg CO2` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

async function updateStreak(userId, date) {
  const userResult = await db.execute({ sql: 'SELECT current_streak, longest_streak, last_logged_date FROM users WHERE id = ?', args: [userId] });
  const user = userResult.rows[0];
  const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().split('T')[0];
  let newStreak = 1;
  if (user.last_logged_date === yesterday) newStreak = (user.current_streak || 0) + 1;
  else if (user.last_logged_date === date) newStreak = user.current_streak || 1;
  const longest = Math.max(newStreak, user.longest_streak || 0);
  await db.execute({ sql: 'UPDATE users SET current_streak = ?, longest_streak = ?, last_logged_date = ? WHERE id = ?', args: [newStreak, longest, date, userId] });
}

router.get('/summary', async (req, res) => {
  const userId = req.userId;
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthStart = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
  try {
    const totalTodayRes = await db.execute({ sql: 'SELECT COALESCE(SUM(co2_kg), 0) as total FROM activities WHERE user_id = ? AND date = ?', args: [userId, today] });
    const totalWeekRes = await db.execute({ sql: 'SELECT COALESCE(SUM(co2_kg), 0) as total FROM activities WHERE user_id = ? AND date >= ?', args: [userId, weekStart] });
    const totalMonthRes = await db.execute({ sql: 'SELECT COALESCE(SUM(co2_kg), 0) as total FROM activities WHERE user_id = ? AND date >= ?', args: [userId, monthStart] });
    const daily14Res = await db.execute({ sql: 'SELECT date, SUM(co2_kg) as co2_kg FROM activities WHERE user_id = ? AND date >= ? GROUP BY date ORDER BY date ASC', args: [userId, twoWeeksAgo] });
    const categoryRes = await db.execute({ sql: 'SELECT category, SUM(co2_kg) as total FROM activities WHERE user_id = ? AND date >= ? GROUP BY category', args: [userId, monthStart] });
    const todayActivitiesRes = await db.execute({ sql: 'SELECT * FROM activities WHERE user_id = ? AND date = ? ORDER BY created_at DESC', args: [userId, today] });
    const userRes = await db.execute({ sql: 'SELECT current_streak, longest_streak FROM users WHERE id = ?', args: [userId] });
    const totalCat = categoryRes.rows.reduce((s, r) => s + r.total, 0);
    const breakdown = {};
    for (const r of categoryRes.rows) {
      breakdown[r.category] = totalCat > 0 ? parseFloat(((r.total / totalCat) * 100).toFixed(1)) : 0;
    }
    res.json({
      totalToday: parseFloat(Number(totalTodayRes.rows[0].total).toFixed(3)),
      totalWeek: parseFloat(Number(totalWeekRes.rows[0].total).toFixed(3)),
      totalMonth: parseFloat(Number(totalMonthRes.rows[0].total).toFixed(3)),
      daily14: daily14Res.rows,
      breakdown,
      todayActivities: todayActivitiesRes.rows,
      streak: userRes.rows[0].current_streak || 0,
      longestStreak: userRes.rows[0].longest_streak || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

router.get('/compare', async (req, res) => {
  const userId = req.userId;
  const monthStart = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  try {
    const userRes = await db.execute({ sql: 'SELECT city FROM users WHERE id = ?', args: [userId] });
    const city = userRes.rows[0].city || 'Hyderabad';
    const cityAvgRes = await db.execute({ sql: 'SELECT avg_daily_co2_kg FROM city_averages WHERE city = ?', args: [city] });
    const cityAvgVal = cityAvgRes.rows[0] ? cityAvgRes.rows[0].avg_daily_co2_kg : 5.2;
    const userAvgRes = await db.execute({ sql: 'SELECT AVG(daily_total) as avg FROM (SELECT date, SUM(co2_kg) as daily_total FROM activities WHERE user_id = ? AND date >= ? GROUP BY date)', args: [userId, monthStart] });
    const userAvg = userAvgRes.rows[0].avg || 0;
    const globalAvg = 4.7;
    const percentVsCity = cityAvgVal > 0 ? parseFloat((((userAvg - cityAvgVal) / cityAvgVal) * 100).toFixed(1)) : 0;
    res.json({ userAvg: parseFloat(Number(userAvg).toFixed(3)), cityAvg: cityAvgVal, city, globalAvg, percentVsCity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comparison' });
  }
});

router.get('/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const result = await db.execute({ sql: 'SELECT * FROM activities WHERE user_id = ? AND date = ? ORDER BY created_at DESC', args: [req.userId, today] });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

module.exports = router;