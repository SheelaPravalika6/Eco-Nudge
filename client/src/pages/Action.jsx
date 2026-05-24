import { useEffect, useState, useCallback } from 'react';
import api from '../api';

const DIFFICULTY_COLORS = { easy: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' };
const CATEGORY_ICONS = { transport: '🚗', food: '🍽️', energy: '⚡', shopping: '🛍️' };
const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

function Confetti({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="text-6xl pop-in">🎉</div>
    </div>
  );
}

export default function Action() {
  const [tasks, setTasks] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [confetti, setConfetti] = useState(false);
  const [lbTab, setLbTab] = useState('points');
  const [lbData, setLbData] = useState([]);
  const [lbLoading, setLbLoading] = useState(true);

  const fetchTasks = useCallback(() => {
    api.get('/tasks').then(res => {
      const taskList = Array.isArray(res.data) ? res.data : res.data.tasks || [];
      const points = res.data.totalPoints || 0;
      setTasks(taskList);
      setTotalPoints(points);
    }).catch(() => setTasks([])).finally(() => setLoading(false));
  }, []);

  const fetchLeaderboard = useCallback(() => {
    setLbLoading(true);
    api.get(`/leaderboard/${lbTab}`).then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      setLbData(data);
    }).catch(() => setLbData([])).finally(() => setLbLoading(false));
  }, [lbTab]);

  useEffect(() => { fetchTasks(); }, []);
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const completeTask = async (task) => {
    try {
      await api.post('/tasks/complete', { taskId: task.id });
      setConfetti(true);
      fetchTasks();
      fetchLeaderboard();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  const filters = ['All', 'easy', 'medium', 'hard', 'transport', 'food', 'energy', 'shopping'];
  const filteredTasks = Array.isArray(tasks) ? tasks.filter(t => {
    if (filter === 'All') return true;
    return t.difficulty === filter || t.category === filter;
  }) : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
      {confetti && <Confetti onDone={() => setConfetti(false)} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-green-800">✅ Take Action</h1>
        <div className="bg-green-100 text-green-800 font-bold px-4 py-2 rounded-full flex items-center gap-2">
          🌿 {totalPoints} pts
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${filter === f ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border hover:border-green-400'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-gray-400 mb-8">
          <div className="text-3xl mb-2">📋</div>
          <p>No tasks found. Try a different filter.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {filteredTasks.map(task => (
            <div key={task.id}
              className={`bg-white rounded-2xl shadow-sm border p-5 transition ${task.completed ? 'border-green-300 bg-green-50' : 'border-gray-100 hover:border-green-300'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_ICONS[task.category]}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[task.difficulty]}`}>
                    {task.difficulty}
                  </span>
                </div>
                {task.completed && <span className="text-green-500 text-xl">✅</span>}
              </div>
              <h3 className="font-bold text-gray-800 mb-1">{task.title}</h3>
              <p className="text-gray-500 text-sm mb-3">{task.description}</p>
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-500">🌿 Saves ~{task.co2_saved_estimate} kg CO₂</div>
                <div className="text-green-600 font-semibold">+{task.points} pts</div>
              </div>
              <button
                onClick={() => completeTask(task)}
                disabled={task.completed}
                className={`mt-3 w-full py-2 rounded-xl text-sm font-medium transition ${task.completed ? 'bg-green-100 text-green-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                {task.completed ? '✅ Done!' : 'Mark Complete'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-green-50 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">🏆 This Week's Top Eco Warriors</h2>
        <div className="flex gap-2 mb-4">
          {['points', 'emissions'].map(tab => (
            <button key={tab} onClick={() => setLbTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${lbTab === tab ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-50'}`}>
              {tab === 'emissions' ? '🌍 Lowest Emissions' : '⭐ Most Points'}
            </button>
          ))}
        </div>

        {lbLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
        ) : lbData.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">🌱</div>
            <p className="text-sm">No data yet. Log activities and complete tasks to appear here!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-3">Rank</th>
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">City</th>
                  <th className="pb-2 pr-3">{lbTab === 'emissions' ? 'CO₂ This Week' : 'Points'}</th>
                </tr>
              </thead>
              <tbody>
                {lbData.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-3">{MEDAL[i + 1] || `#${i + 1}`}</td>
                    <td className="py-2 pr-3">{row.display_name}</td>
                    <td className="py-2 pr-3 text-gray-500">{row.city}</td>
                    <td className="py-2 pr-3">
                      {lbTab === 'emissions' ? `${Number(row.co2_this_week).toFixed(2)} kg` : `${row.total_points} pts`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}