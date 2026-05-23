import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [compare, setCompare] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/activities/summary'),
      api.get('/activities/compare')
    ]).then(([s, c]) => {
      setSummary(s.data);
      setCompare(c.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const co2Color = (val) => {
    if (val < 3) return 'text-green-600';
    if (val < 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const pct = compare?.percentVsCity;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-green-800">
          Good day, {user?.email?.split('@')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here's your eco summary</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-50">
            <div className="text-2xl mb-1">🌍</div>
            <div className={`text-2xl font-bold ${co2Color(summary?.totalToday || 0)}`}>
              {summary?.totalToday?.toFixed(1) || '0'} kg
            </div>
            <div className="text-xs text-gray-500 mt-1">CO₂ Today</div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-50">
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-2xl font-bold text-orange-500">{summary?.streak || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Day Streak</div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-50">
            <div className="text-2xl mb-1">⭐</div>
            <div className="text-2xl font-bold text-purple-600">
              {summary ? (summary.totalWeek > 0 ? summary.totalWeek.toFixed(1) : '0') : '0'}
            </div>
            <div className="text-xs text-gray-500 mt-1">kg This Week</div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-50">
            <div className="text-2xl mb-1">{pct !== undefined && pct < 0 ? '✅' : '📈'}</div>
            <div className={`text-xl font-bold ${pct < 0 ? 'text-green-600' : 'text-red-500'}`}>
              {pct !== undefined ? `${Math.abs(pct)}% ${pct < 0 ? 'below' : 'above'}` : 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">vs City Avg</div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Link to="/dashboard/footprint"
          className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-md hover:shadow-lg transition hover:-translate-y-0.5">
          <div className="text-3xl mb-3">📊</div>
          <h2 className="text-xl font-bold mb-1">My Footprint</h2>
          <p className="text-green-100 text-sm">Log activities, view charts & compare with your city</p>
          <div className="mt-4 text-sm font-semibold">Go →</div>
        </Link>

        <Link to="/dashboard/action"
          className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-md hover:shadow-lg transition hover:-translate-y-0.5">
          <div className="text-3xl mb-3">🏆</div>
          <h2 className="text-xl font-bold mb-1">Take Action</h2>
          <p className="text-blue-100 text-sm">Complete tasks, earn points & climb the leaderboard</p>
          <div className="mt-4 text-sm font-semibold">Go →</div>
        </Link>
      </div>

      {summary?.totalToday === 0 && (
        <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">🌱</div>
          <p className="text-green-700 font-medium">No activities logged today yet.</p>
          <Link to="/dashboard/footprint" className="inline-block mt-3 bg-green-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-green-700">
            Log Your First Activity
          </Link>
        </div>
      )}
    </div>
  );
}
