import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineHome,
  HiOutlineChartBar,
  HiOutlineUsers,
  HiOutlineClipboardList,
  HiOutlineDocumentReport,
  HiOutlineLogout,
  HiOutlineLightningBolt,
} from 'react-icons/hi';

const navItems = [
  { path: '/', label: 'Dashboard', icon: HiOutlineHome },
  { path: '/analytics', label: 'Team Analytics', icon: HiOutlineChartBar },
  { path: '/developers', label: 'Developers', icon: HiOutlineUsers },
  { path: '/tasks', label: 'Tasks', icon: HiOutlineClipboardList },
  { path: '/reports', label: 'Reports', icon: HiOutlineDocumentReport },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-light/80 backdrop-blur-xl border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <HiOutlineLightningBolt className="text-white text-xl" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary tracking-tight">TeamPulse</h1>
            <p className="text-[10px] text-text-secondary font-medium uppercase tracking-widest">Analytics</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-primary/15 text-primary-light border border-primary/20 shadow-lg shadow-primary/5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-lighter/50'
              }`}
            >
              <Icon className={`text-lg transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-primary-light' : ''}`} />
              {label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-light animate-pulse" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-text-secondary">{user?.role || 'Developer'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-text-secondary hover:text-danger hover:bg-danger/10 transition-all duration-200"
        >
          <HiOutlineLogout className="text-lg" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
