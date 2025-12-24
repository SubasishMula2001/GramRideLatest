import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  FileText, 
  Settings, 
  LogOut,
  Activity,
  DollarSign,
  Bell
} from 'lucide-react';
import GramRideLogo from './GramRideLogo';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/drivers', icon: Car, label: 'Drivers' },
  { path: '/admin/rides', icon: Activity, label: 'Rides' },
  { path: '/admin/earnings', icon: DollarSign, label: 'Earnings' },
  { path: '/admin/logs', icon: FileText, label: 'Activity Logs' },
  { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
];

const AdminSidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <GramRideLogo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label, exact }) => {
          const isActive = exact 
            ? location.pathname === path 
            : location.pathname.startsWith(path);

          return (
            <NavLink
              key={path}
              to={path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300
                ${isActive 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-soft' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <button className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-destructive hover:bg-destructive/10 w-full transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
