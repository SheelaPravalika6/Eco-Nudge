const express = require('express');
const { db } = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/user/stats
router.get('/stats', (req, res) => {
  const userId = req.userId;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  const activitiesLogged = db.prepare('SELECT COUNT(*) as count FROM activities WHERE user_id = ?').get(userId).count;
  const totalCo2 = db.prepare('SELECT COALESCE(SUM(co2_kg), 0) as total FROM activities WHERE user_id = ?').get(userId).total;
  const tasksCompleted = db.prepare('SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ?').get(userId).count;
  const totalPoints = db.prepare('SELECT COALESCE(SUM(points_earned), 0) as total FROM user_tasks WHERE user_id = ?').get(userId).total;
  const lowestDay = db.prepare(`
    SELECT MIN(daily_total) as min FROM (
      SELECT date, SUM(co2_kg) as daily_total FROM activities WHERE user_id = ? GROUP BY date
    )
  `).get(userId).min;

  res.json({
    email: user.email,
    displayName: user.display_name,
    city: user.city,
    country: user.country,
    units: user.units,
    memberSince: user.created_at,
    activitiesLogged,
    totalCo2: parseFloat((totalCo2 || 0).toFixed(2)),
    tasksCompleted,
    totalPoints,
    lowestDailyCo2: lowestDay ? parseFloat(lowestDay.toFixed(2)) : null,
    currentStreak: user.current_streak || 0,
    longestStreak: user.longest_streak || 0,
    onboarding_done: user.onboarding_done
  });
});

// PUT /api/user/profile
router.put('/profile', (req, res) => {
  const { displayName, city, country, units } = req.body;
  db.prepare(`
    UPDATE users SET display_name = ?, city = ?, country = ?, units = ? WHERE id = ?
  `).run(displayName || null, city || 'Hyderabad', country || 'India', units || 'kg', req.userId);
  res.json({ message: 'Profile updated' });
});

// PUT /api/user/onboarding
router.put('/onboarding', (req, res) => {
  db.prepare('UPDATE users SET onboarding_done = 1 WHERE id = ?').run(req.userId);
  res.json({ message: 'Onboarding complete' });
});

// DELETE /api/user/data
router.delete('/data', (req, res) => {
  db.prepare('DELETE FROM activities WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM user_tasks WHERE user_id = ?').run(req.userId);
  db.prepare('UPDATE users SET current_streak = 0, last_logged_date = NULL WHERE id = ?').run(req.userId);
  res.json({ message: 'All data deleted' });
});

// POST /api/user/suggestions  — no API key needed, pure data-driven logic
router.post('/suggestions', (req, res) => {
  const userId = req.userId;
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  // Fetch last 7 days of activities
  const activities = db.prepare(`
    SELECT category, activity_name, amount, unit, co2_kg
    FROM activities WHERE user_id = ? AND date >= ?
    ORDER BY co2_kg DESC
  `).all(userId, weekStart);

  // Fetch user city and city average
  const user = db.prepare('SELECT city FROM users WHERE id = ?').get(userId);
  const cityAvg = db.prepare('SELECT avg_daily_co2_kg FROM city_averages WHERE city = ?').get(user.city || 'Hyderabad');
  const cityAvgVal = cityAvg ? cityAvg.avg_daily_co2_kg : 5.2;

  // Calculate user daily average
  const userAvgRow = db.prepare(`
    SELECT AVG(daily_total) as avg FROM (
      SELECT date, SUM(co2_kg) as daily_total FROM activities
      WHERE user_id = ? AND date >= ? GROUP BY date
    )
  `).get(userId, weekStart);
  const userAvg = userAvgRow.avg || 0;

  // Sum CO2 per category over the week
  const catTotals = {};
  for (const a of activities) {
    catTotals[a.category] = (catTotals[a.category] || 0) + a.co2_kg;
  }

  const activityNames = activities.map(a => a.activity_name);

  // Suggestion bank — each entry has a category, condition fn, icon, and text
  const bank = [
    // TRANSPORT
    {
      category: 'transport',
      condition: () => activityNames.some(n => n.includes('Car')),
      icon: '🚌',
      text: 'You logged car trips this week — try swapping even one trip to the bus or train. Public transport cuts per-km emissions by up to 75% and costs far less.'
    },
    {
      category: 'transport',
      condition: () => activityNames.some(n => n.includes('Flight')),
      icon: '🚆',
      text: 'A short-haul flight generates roughly 6x more CO2 than the same journey by train. Next time, check if a train is an option — it makes a huge difference.'
    },
    {
      category: 'transport',
      condition: () => activityNames.some(n => n.includes('Motorcycle') || n.includes('Auto')),
      icon: '🚶',
      text: 'For short trips under 2 km, walking or cycling produces zero emissions and is often just as fast in traffic. Your daily footprint could drop noticeably with this swap.'
    },
    {
      category: 'transport',
      condition: () => (catTotals['transport'] || 0) > 5,
      icon: '🏠',
      text: 'Transport is your biggest emission source this week. If your work allows it, even one work-from-home day saves 3-4 kg CO2 and reduces fuel costs at the same time.'
    },

    // FOOD
    {
      category: 'food',
      condition: () => activityNames.some(n => n.includes('Beef')),
      icon: '🥗',
      text: 'Beef is one of the highest-carbon foods — one beef meal emits roughly 13x more CO2 than a vegetarian meal. Replacing even two beef meals a week makes a real impact.'
    },
    {
      category: 'food',
      condition: () => activityNames.some(n => n.includes('Chicken') || n.includes('Pork') || n.includes('Fish')),
      icon: '🌱',
      text: 'You ate meat several times this week. Trying "Meatless Monday" — one plant-based day — can cut your weekly food emissions by 15-20% with minimal effort.'
    },
    {
      category: 'food',
      condition: () => (catTotals['food'] || 0) > 10,
      icon: '🥦',
      text: 'Food is your top emission category this week. Shifting toward plant-based meals even 2-3 days a week is one of the highest-impact personal changes you can make.'
    },

    // ENERGY
    {
      category: 'energy',
      condition: () => activityNames.some(n => n.includes('Electricity')),
      icon: '🌙',
      text: 'Try running heavy appliances like washing machines at night when grid demand is lower. Turning off standby devices alone can save up to 10% of home electricity use.'
    },
    {
      category: 'energy',
      condition: () => activityNames.some(n => n.includes('LPG') || n.includes('Gas')),
      icon: '☀️',
      text: 'LPG cooking contributes to your footprint daily. Switching to an induction cooktop runs on electricity and gets cleaner as the grid adds more renewable energy.'
    },
    {
      category: 'energy',
      condition: () => (catTotals['energy'] || 0) > 8,
      icon: '❄️',
      text: 'Energy is a big part of your footprint this week. Setting your AC 2°C warmer (e.g. 26°C instead of 24°C) can reduce AC energy use by around 10% with barely any comfort difference.'
    },

    // SHOPPING
    {
      category: 'shopping',
      condition: () => activityNames.some(n => n.includes('Online Shopping')),
      icon: '🛒',
      text: 'Each online order generates 3-5 kg CO2 from delivery alone. Batching your orders — one delivery per week instead of several small ones — cuts packaging and transport emissions significantly.'
    },
    {
      category: 'shopping',
      condition: () => activityNames.some(n => n.includes('Clothing')),
      icon: '♻️',
      text: 'A new clothing item generates ~8 kg CO2 on average. Before buying new, check if it is available second-hand — it is cheaper and far lower in emissions.'
    },
    {
      category: 'shopping',
      condition: () => activityNames.some(n => n.includes('Smartphone') || n.includes('Laptop')),
      icon: '🔋',
      text: 'Electronics carry very high embedded carbon — a smartphone is ~70 kg CO2, a laptop ~300 kg. Keeping devices 1-2 years longer than usual is one of the most effective tech emission reductions.'
    },

    // CITY COMPARISON
    {
      category: 'general',
      condition: () => userAvg > cityAvgVal * 1.2,
      icon: '📉',
      text: `Your daily average (${userAvg.toFixed(1)} kg) is above the ${user.city || 'city'} average of ${cityAvgVal} kg. Focus on your top category this week and aim to bring it down by just 10% — small steps add up fast.`
    },
    {
      category: 'general',
      condition: () => userAvg > 0 && userAvg <= cityAvgVal,
      icon: '🏆',
      text: `Great work — your daily average (${userAvg.toFixed(1)} kg) is already below the ${user.city || 'city'} average of ${cityAvgVal} kg. Keep logging to maintain your streak and climb the leaderboard!`
    },

    // FALLBACK
    {
      category: 'general',
      condition: () => activities.length === 0,
      icon: '📝',
      text: 'No activities logged this week yet. Start with your daily commute and meals — even a few entries give you a clear picture of where your footprint comes from.'
    },
    {
      category: 'general',
      condition: () => true,
      icon: '🌿',
      text: 'Consistency is key — logging daily keeps you aware and motivated. Users who log 5+ days a week tend to reduce their footprint 30% faster than those who log occasionally.'
    }
  ];

  // Pick 3 suggestions: one per highest-emission category, then fill from general
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const picked = [];
  const usedCategories = new Set();

  for (const cat of [...sortedCats, 'general']) {
    if (picked.length >= 3) break;
    const match = bank.find(s => s.category === cat && !usedCategories.has(cat) && s.condition());
    if (match) { picked.push(match); usedCategories.add(cat); }
  }

  // Fill any remaining slots
  for (const s of bank) {
    if (picked.length >= 3) break;
    if (!picked.includes(s) && s.condition()) picked.push(s);
  }

  const suggestions = picked.slice(0, 3).map(s => `${s.icon} ${s.text}`);
  res.json({ suggestions });
});

module.exports = router;
