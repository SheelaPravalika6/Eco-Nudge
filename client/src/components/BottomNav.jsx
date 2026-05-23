import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const items = [
    { to: '/dashboard', icon: '🏠', label: 'Home', exact: true },
    { to: '/dashboard/footprint', icon: '📊', label: 'Log' },
    { to: '/dashboard/action', icon: '✅', label: 'Tasks' },
    { to: '/dashboard/profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-green-100 z-40 pb-safe">
      <div className="flex">
        {items.map(item => {
          const active = item.exact ? location.pathname === item.to : isActive(item.to);
          return (
            <Link key={item.to} to={item.to}
              className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition ${active ? 'text-green-700' : 'text-gray-500'}`}>
              <span className="text-xl mb-0.5">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
