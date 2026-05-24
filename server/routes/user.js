const express = require('express');
const { db } = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const userRes = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [req.userId] });
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const pointsRes = await db.execute({ sql: 'SELECT COALESCE(SUM(points_earned), 0) as total FROM user_tasks WHERE user_id = ?', args: [req.userId] });
    const tasksRes = await db.execute({ sql: 'SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ?', args: [req.userId] });
    const activitiesRes = await db.execute({ sql: 'SELECT COUNT(*) as count FROM activities WHERE user_id = ?', args: [req.userId] });
    const totalCo2Res = await db.execute({ sql: 'SELECT COALESCE(SUM(co2_kg), 0) as total FROM activities WHERE user_id = ?', args: [req.userId] });
    const lowestRes = await db.execute({ sql: 'SELECT MIN(daily_total) as lowest FROM (SELECT date, SUM(co2_kg) as daily_total FROM activities WHERE user_id = ? GROUP BY date)', args: [req.userId] });

    res.json({
      email: user.email,
      display_name: user.display_name,
      displayName: user.display_name,
      city: user.city,
      country: user.country,
      units: user.units,
      onboarding_done: user.onboarding_done,
      current_streak: user.current_streak || 0,
      longest_streak: user.longest_streak || 0,
      currentStreak: user.current_streak || 0,
      longestStreak: user.longest_streak || 0,
      total_points: Number(pointsRes.rows[0].total),
      totalPoints: Number(pointsRes.rows[0].total),
      tasksCompleted: Number(tasksRes.rows[0].count),
      activitiesLogged: Number(activitiesRes.rows[0].count),
      totalCo2: parseFloat(Number(totalCo2Res.rows[0].total).toFixed(2)),
      lowestDailyCo2: lowestRes.rows[0].lowest ? parseFloat(Number(lowestRes.rows[0].lowest).toFixed(2)) : null,
      memberSince: user.created_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.put('/profile', async (req, res) => {
  const { city, country, units, display_name, displayName } = req.body;
  const name = display_name || displayName || null;
  try {
    await db.execute({
      sql: 'UPDATE users SET city = COALESCE(?, city), country = COALESCE(?, country), units = COALESCE(?, units), display_name = COALESCE(?, display_name) WHERE id = ?',
      args: [city || null, country || null, units || null, name, req.userId]
    });
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/onboarding', async (req, res) => {
  try {
    await db.execute({ sql: 'UPDATE users SET onboarding_done = 1 WHERE id = ?', args: [req.userId] });
    res.json({ message: 'Onboarding complete' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update onboarding' });
  }
});

router.delete('/data', async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM activities WHERE user_id = ?', args: [req.userId] });
    await db.execute({ sql: 'DELETE FROM user_tasks WHERE user_id = ?', args: [req.userId] });
    res.json({ message: 'All data deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

router.post('/suggestions', async (req, res) => {
  const userId = req.userId;
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  try {
    const activitiesRes = await db.execute({ sql: 'SELECT category, activity_name, amount, unit, co2_kg FROM activities WHERE user_id = ? AND date >= ? ORDER BY co2_kg DESC', args: [userId, weekStart] });
    const activities = activitiesRes.rows;
    const userRes = await db.execute({ sql: 'SELECT city FROM users WHERE id = ?', args: [userId] });
    const user = userRes.rows[0];
    const cityAvgRes = await db.execute({ sql: 'SELECT avg_daily_co2_kg FROM city_averages WHERE city = ?', args: [user.city || 'Hyderabad'] });
    const cityAvgVal = cityAvgRes.rows[0] ? cityAvgRes.rows[0].avg_daily_co2_kg : 5.2;
    const userAvgRes = await db.execute({ sql: 'SELECT AVG(daily_total) as avg FROM (SELECT date, SUM(co2_kg) as daily_total FROM activities WHERE user_id = ? AND date >= ? GROUP BY date)', args: [userId, weekStart] });
    const userAvg = userAvgRes.rows[0].avg || 0;
    const catTotals = {};
    for (const a of activities) catTotals[a.category] = (catTotals[a.category] || 0) + a.co2_kg;
    const activityNames = activities.map(a => a.activity_name);
    const bank = [
      { category: 'transport', condition: () => activityNames.some(n => n.includes('Car')), icon: '🚌', text: 'You logged car trips this week — try swapping even one trip to the bus or train. Public transport cuts per-km emissions by up to 75%.' },
      { category: 'transport', condition: () => activityNames.some(n => n.includes('Flight')), icon: '🚆', text: 'A short-haul flight generates roughly 6x more CO2 than the same journey by train. Next time, check if a train is an option.' },
      { category: 'transport', condition: () => activityNames.some(n => n.includes('Motorcycle') || n.includes('Auto')), icon: '🚶', text: 'For short trips under 2 km, walking or cycling produces zero emissions and is often just as fast in traffic.' },
      { category: 'transport', condition: () => (catTotals['transport'] || 0) > 5, icon: '🏠', text: 'Transport is your biggest emission source this week. Even one work-from-home day saves 3-4 kg CO2.' },
      { category: 'food', condition: () => activityNames.some(n => n.includes('Beef')), icon: '🥗', text: 'Beef is one of the highest-carbon foods — one beef meal emits roughly 13x more CO2 than a vegetarian meal.' },
      { category: 'food', condition: () => activityNames.some(n => n.includes('Chicken') || n.includes('Pork') || n.includes('Fish')), icon: '🌱', text: 'Trying Meatless Monday — one plant-based day — can cut your weekly food emissions by 15-20% with minimal effort.' },
      { category: 'food', condition: () => (catTotals['food'] || 0) > 10, icon: '🥦', text: 'Food is your top emission category this week. Shifting toward plant-based meals even 2-3 days a week makes a big difference.' },
      { category: 'energy', condition: () => activityNames.some(n => n.includes('Electricity')), icon: '🌙', text: 'Try running heavy appliances at night when grid demand is lower. Turning off standby devices can save up to 10% of home electricity.' },
      { category: 'energy', condition: () => activityNames.some(n => n.includes('LPG') || n.includes('Gas')), icon: '☀️', text: 'LPG cooking contributes to your footprint daily. Switching to an induction cooktop gets cleaner as the grid adds more renewable energy.' },
      { category: 'energy', condition: () => (catTotals['energy'] || 0) > 8, icon: '❄️', text: 'Setting your AC 2 degrees warmer can reduce AC energy use by around 10% with barely any comfort difference.' },
      { category: 'shopping', condition: () => activityNames.some(n => n.includes('Online Shopping')), icon: '🛒', text: 'Batching your orders — one delivery per week instead of several small ones — cuts packaging and transport emissions significantly.' },
      { category: 'shopping', condition: () => activityNames.some(n => n.includes('Clothing')), icon: '♻️', text: 'A new clothing item generates around 8 kg CO2 on average. Before buying new, check if it is available second-hand.' },
      { category: 'shopping', condition: () => activityNames.some(n => n.includes('Smartphone') || n.includes('Laptop')), icon: '🔋', text: 'Keeping devices 1-2 years longer than usual is one of the most effective ways to reduce tech emissions.' },
      { category: 'general', condition: () => userAvg > cityAvgVal * 1.2, icon: '📉', text: `Your daily average (${Number(userAvg).toFixed(1)} kg) is above the ${user.city || 'city'} average of ${cityAvgVal} kg. Focus on your top category and aim to bring it down by just 10%.` },
      { category: 'general', condition: () => userAvg > 0 && userAvg <= cityAvgVal, icon: '🏆', text: `Great work — your daily average (${Number(userAvg).toFixed(1)} kg) is already below the ${user.city || 'city'} average of ${cityAvgVal} kg. Keep logging!` },
      { category: 'general', condition: () => activities.length === 0, icon: '📝', text: 'No activities logged this week yet. Start with your daily commute and meals to see where your footprint comes from.' },
      { category: 'general', condition: () => true, icon: '🌿', text: 'Consistency is key — logging daily keeps you aware and motivated. Small actions every day add up to big change.' }
    ];
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const picked = [];
    const usedCategories = new Set();
    for (const cat of [...sortedCats, 'general']) {
      if (picked.length >= 3) break;
      const match = bank.find(s => s.category === cat && !usedCategories.has(cat) && s.condition());
      if (match) { picked.push(match); usedCategories.add(cat); }
    }
    for (const s of bank) {
      if (picked.length >= 3) break;
      if (!picked.includes(s) && s.condition()) picked.push(s);
    }
    res.json({ suggestions: picked.slice(0, 3).map(s => `${s.icon} ${s.text}`) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

module.exports = router;