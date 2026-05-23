import { useEffect, useState } from 'react';
import api from '../api';

const CITIES = ['Hyderabad','Mumbai','Delhi','London','New York','Berlin','Tokyo','Sydney','Lagos','Sao Paulo','Other'];

export default function Profile() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [country, setCountry] = useState('India');
  const [units, setUnits] = useState('kg');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get('/user/stats').then(res => {
      const d = res.data;
      setStats(d);
      setDisplayName(d.displayName || '');
      setCity(d.city || 'Hyderabad');
      setCountry(d.country || 'India');
      setUnits(d.units || 'kg');
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/user/profile', { displayName, city, country, units });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete('/user/data');
      setShowDeleteConfirm(false);
      alert('All your data has been deleted.');
      window.location.reload();
    } catch {
      alert('Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <h1 className="text-2xl font-bold text-green-800 mb-6">👤 Profile & Settings</h1>

      {/* Edit Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-50 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name (optional)</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400"
              placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <select value={city} onChange={e => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400">
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {city === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input type="text" value={country} onChange={e => setCountry(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400"
                placeholder="Your country" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Units</label>
            <select value={units} onChange={e => setUnits(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400">
              <option value="kg">kg CO₂</option>
              <option value="lbs">lbs CO₂</option>
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60">
            {saved ? '✅ Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Stats */}
      {stats && (
        <div className="bg-white rounded-2xl shadow-sm border border-green-50 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Member Since', value: new Date(stats.memberSince).toLocaleDateString() },
              { label: 'Activities Logged', value: stats.activitiesLogged },
              { label: 'Total CO₂ Tracked', value: `${stats.totalCo2} kg` },
              { label: 'Tasks Completed', value: stats.tasksCompleted },
              { label: 'Total Points', value: stats.totalPoints },
              { label: 'Current Streak', value: `🔥 ${stats.currentStreak} days` },
              { label: 'Longest Streak', value: `🔥 ${stats.longestStreak} days` },
              { label: 'Lowest Daily CO₂', value: stats.lowestDailyCo2 ? `${stats.lowestDailyCo2} kg` : 'N/A' },
            ].map(item => (
              <div key={item.label} className="bg-green-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className="font-bold text-gray-800">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-2">⚠️ Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">Delete all your logged activities and task history. Your account will remain.</p>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-5 py-2 rounded-xl text-sm font-medium transition">
            Delete All My Data
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700 font-medium mb-3">
              Are you sure? This will delete all your logged activities. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)}
                className="bg-white border text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
