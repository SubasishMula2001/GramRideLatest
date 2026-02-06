import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import GramRideLogo from './GramRideLogo';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { path: '/admin', emoji: '📊', label: 'Dashboard', exact: true },
  { path: '/admin/live', emoji: '🔴', label: 'Live Monitor' },
  { path: '/admin/users', emoji: '👥', label: 'Users' },
  { path: '/admin/drivers', emoji: '🚗', label: 'Drivers' },
  { path: '/admin/rides', emoji: '🛣️', label: 'Rides' },
  { path: '/admin/payments', emoji: '💳', label: 'Payment Settings' },
  { path: '/admin/reports', emoji: '📈', label: 'Reports' },
  { path: '/admin/logs', emoji: '📋', label: 'Activity Logs' },
];

interface AdminSidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ 
  collapsed: controlledCollapsed, 
  onCollapsedChange 
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const toggleCollapsed = () => {
    const newValue = !collapsed;
    if (onCollapsedChange) {
      onCollapsedChange(newValue);
    } else {
      setInternalCollapsed(newValue);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={`
          fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border 
          flex flex-col z-50 transition-all duration-300 ease-in-out
          ${collapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Logo & Collapse Button */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          {!collapsed && <GramRideLogo size="md" />}
          {collapsed && <span className="text-2xl mx-auto">🚀</span>}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-8 w-8 rounded-lg hover:bg-sidebar-accent"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ path, emoji, label, exact }) => {
            const isActive = exact 
              ? location.pathname === path 
              : location.pathname.startsWith(path);

            const navContent = (
              <NavLink
                key={path}
                to={path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300
                  ${collapsed ? 'justify-center' : ''}
                  ${isActive 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-soft' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }
                `}
              >
                <span className="text-xl">{emoji}</span>
                {!collapsed && <span>{label}</span>}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={path}>
                  <TooltipTrigger asChild>
                    {navContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navContent;
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-sidebar-border">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={handleLogout}
                  className="flex items-center justify-center w-full px-4 py-3 rounded-xl font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <span className="text-xl">🚪</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Logout
              </TooltipContent>
            </Tooltip>
          ) : (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-destructive hover:bg-destructive/10 w-full transition-colors"
            >
              <span className="text-xl">🚪</span>
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default AdminSidebar;
