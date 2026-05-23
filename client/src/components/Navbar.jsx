import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <nav className="bg-white border-b border-green-100 shadow-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/dashboard" className="flex items-center gap-2 text-green-700 font-bold text-xl">
          🌿 EcoNudge
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link to="/dashboard/footprint"
            className={`text-sm font-medium px-4 py-2 rounded-full transition ${isActive('/dashboard/footprint') ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:text-green-700'}`}>
            🌍 My Footprint
          </Link>
          <Link to="/dashboard/action"
            className={`text-sm font-medium px-4 py-2 rounded-full transition ${isActive('/dashboard/action') ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:text-green-700'}`}>
            ✅ Take Action
          </Link>
          <Link to="/dashboard/profile"
            className={`text-sm font-medium px-4 py-2 rounded-full transition ${isActive('/dashboard/profile') ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:text-green-700'}`}>
            👤 {user?.email?.split('@')[0]}
          </Link>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 font-medium">Logout</button>
        </div>
      </div>
    </nav>
  );
}
