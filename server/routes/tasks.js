const express = require('express');
const { db } = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/tasks
router.get('/', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY difficulty, category').all();
  const completedToday = db.prepare(`
    SELECT task_id FROM user_tasks
    WHERE user_id = ? AND DATE(completed_at) = ?
  `).all(req.userId, today).map(r => r.task_id);

  const totalPoints = db.prepare(
    'SELECT COALESCE(SUM(points_earned), 0) as total FROM user_tasks WHERE user_id = ?'
  ).get(req.userId).total;

  res.json({
    tasks: tasks.map(t => ({ ...t, completedToday: completedToday.includes(t.id) })),
    totalPoints
  });
});

// POST /api/tasks/complete
router.post('/complete', (req, res) => {
  const { task_id } = req.body;
  if (!task_id) return res.status(400).json({ error: 'task_id required' });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const today = new Date().toISOString().split('T')[0];
  const alreadyDone = db.prepare(`
    SELECT id FROM user_tasks WHERE user_id = ? AND task_id = ? AND DATE(completed_at) = ?
  `).get(req.userId, task_id, today);

  if (alreadyDone) return res.status(409).json({ error: 'Task already completed today' });

  db.prepare(
    'INSERT INTO user_tasks (user_id, task_id, points_earned) VALUES (?, ?, ?)'
  ).run(req.userId, task_id, task.points);

  const totalPoints = db.prepare(
    'SELECT COALESCE(SUM(points_earned), 0) as total FROM user_tasks WHERE user_id = ?'
  ).get(req.userId).total;

  res.json({ message: 'Task completed!', points_earned: task.points, totalPoints });
});

module.exports = router;
