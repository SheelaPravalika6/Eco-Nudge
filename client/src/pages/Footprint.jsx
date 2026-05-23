import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import api from '../api';

const CATEGORY_COLORS = { transport: '#3b82f6', food: '#f97316', energy: '#eab308', shopping: '#a855f7' };
const CATEGORY_ICONS = { transport: '🚗', food: '🍽️', energy: '⚡', shopping: '🛍️' };

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed top-20 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg pop-in">
      ✅ {msg}
    </div>
  );
}

export default function Footprint() {
  const [factors, setFactors] = useState({});
  const [summary, setSummary] = useState(null);
  const [compare, setCompare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const [category, setCategory] = useState('transport');
  const [activityName, setActivityName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/activities/emission-factors'),
      api.get('/activities/summary'),
      api.get('/activities/compare')
    ]).then(([f, s, c]) => {
      setFactors(f.data);
      setSummary(s.data);
      setCompare(c.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const acts = factors[category] || [];
    setActivityName(acts[0]?.activity_name || '');
  }, [category, factors]);

  const selectedFactor = (factors[category] || []).find(f => f.activity_name === activityName);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/activities/log', { category, activity_name: activityName, amount, date });
      setToast(res.data.message);
      setAmount('');
      fetchData();
    } catch (err) {
      setToast(err.response?.data?.error || 'Error logging activity');
    } finally {
      setSubmitting(false);
    }
  };

  const getSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await api.post('/user/suggestions');
      setSuggestions(res.data.suggestions);
    } catch {
      setSuggestions(['Could not get suggestions. Check your Anthropic API key in server/.env']);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const co2Color = (val) => val < 3 ? 'text-green-600' : val < 6 ? 'text-yellow-600' : 'text-red-600';
  const co2BgColor = (val) => val < 3 ? 'bg-green-50 border-green-200' : val < 6 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  const pieData = summary ? Object.entries(summary.breakdown).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      <h1 className="text-2xl font-bold text-green-800 mb-6">🌍 My Footprint</h1>

      {/* Activity Logger */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-50 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Log an Activity</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400">
                {['transport','food','energy','shopping'].map(c => (
                  <option key={c} value={c}>{CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase()+c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
              <select value={activityName} onChange={e => setActivityName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400">
                {(factors[category] || []).map(f => (
                  <option key={f.activity_name}>{f.activity_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount {selectedFactor && <span className="text-green-600">({selectedFactor.unit})</span>}
              </label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="0.01" step="any"
                placeholder="e.g. 20"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <button type="submit" disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60">
            {submitting ? 'Logging...' : '+ Log Activity'}
          </button>
        </form>
      </div>

      {/* Today's Log */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-50 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Today's Log</h2>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : !summary?.todayActivities?.length ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <p>No activities logged today yet. Log your first one above!</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {summary.todayActivities.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{CATEGORY_ICONS[a.category]}</span>
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{a.activity_name}</div>
                      <div className="text-xs text-gray-500">{a.amount} {a.unit}</div>
                    </div>
                  </div>
                  <div className={`font-bold text-sm ${co2Color(a.co2_kg)}`}>{a.co2_kg.toFixed(2)} kg</div>
                </div>
              ))}
            </div>
            <div className={`mt-4 p-3 rounded-xl border font-bold flex justify-between items-center ${co2BgColor(summary.totalToday)}`}>
              <span className="text-gray-700">Total Today</span>
              <span className={co2Color(summary.totalToday)}>{summary.totalToday.toFixed(2)} kg CO₂</span>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      {!loading && summary && (
        <>
          {/* 14 Day Trend */}
          <div className="bg-white rounded-2xl shadow-sm border border-green-50 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">14-Day Trend</h2>
            {summary.daily14.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Log your first activity above to see your stats!</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={summary.daily14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v.toFixed(2)} kg`, 'CO₂']} />
                  {compare && <ReferenceLine y={compare.cityAvg} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'City avg', fontSize: 10, fill: '#ef4444' }} />}
                  <Line type="monotone" dataKey="co2_kg" stroke="#16a34a" strokeWidth={2} dot={{ fill: '#16a34a', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Donut + Bar side by side */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-green-50 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Category Breakdown</h2>
              {pieData.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Legend formatter={(v) => `${CATEGORY_ICONS[v] || ''} ${v}`} />
                    <Tooltip formatter={(v) => [`${v}%`]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-green-50 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Your vs Others</h2>
              {compare && (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart layout="vertical"
                      data={[
                        { name: 'You', value: parseFloat(compare.userAvg.toFixed(2)) },
                        { name: 'Your City', value: compare.cityAvg },
                        { name: 'Global', value: compare.globalAvg },
                      ]}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={65} />
                      <Tooltip formatter={v => [`${v} kg/day`]} />
                      <Bar dataKey="value" radius={6}>
                        {[0,1,2].map(i => (
                          <Cell key={i} fill={i === 0 ? (compare.percentVsCity < 0 ? '#16a34a' : '#ef4444') : '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className={`text-sm font-medium text-center mt-2 ${compare.percentVsCity < 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {compare.percentVsCity < 0
                      ? `🎉 You produce ${Math.abs(compare.percentVsCity)}% less than your city average!`
                      : `You produce ${compare.percentVsCity}% more than your city average.`}
                  </p>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Eco Coach */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🌍</span>
          <h2 className="text-lg font-semibold text-green-800">Your Eco Coach</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">3 personalised tips based on your last 7 days of activity.</p>

        {loadingSuggestions ? (
          <div className="text-green-600 text-sm animate-pulse">Analysing your activities...</div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-3 mb-4">
            {suggestions.map((s, i) => (
              <div key={i} className="flex gap-3 bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-700">{s}</p>
              </div>
            ))}
          </div>
        ) : null}

        <button onClick={getSuggestions} disabled={loadingSuggestions}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-60">
          {suggestions.length ? '🔄 Refresh Suggestions' : '✨ Get My Suggestions'}
        </button>
      </div>
    </div>
  );
}
