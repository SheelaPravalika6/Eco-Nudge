const express = require('express');
const { db } = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const tasksRes = await db.execute('SELECT * FROM tasks ORDER BY difficulty, points');
    const completedRes = await db.execute({ sql: 'SELECT task_id FROM user_tasks WHERE user_id = ?', args: [req.userId] });
    const completedIds = completedRes.rows.map(r => Number(r.task_id));
    const tasks = tasksRes.rows.map(t => ({ ...t, completed: completedIds.includes(Number(t.id)) }));
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.post('/complete', async (req, res) => {
  const { taskId } = req.body;
  try {
    const taskRes = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [taskId] });
    const task = taskRes.rows[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const alreadyRes = await db.execute({ sql: 'SELECT id FROM user_tasks WHERE user_id = ? AND task_id = ?', args: [req.userId, taskId] });
    if (alreadyRes.rows.length > 0) return res.status(400).json({ error: 'Task already completed' });
    await db.execute({ sql: 'INSERT INTO user_tasks (user_id, task_id, points_earned) VALUES (?, ?, ?)', args: [req.userId, taskId, task.points] });
    res.json({ message: `Task completed! +${task.points} points`, points: task.points });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

module.exports = router;