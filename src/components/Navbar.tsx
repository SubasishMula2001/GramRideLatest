import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GramRideLogo from './GramRideLogo';
import LanguageToggle from './LanguageToggle';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Car, 
  User, 
  LogOut, 
  LayoutDashboard, 
  MapPin,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const Navbar: React.FC = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
    // Force a page reload to ensure all state is cleared
    window.location.reload();
  };

  const isActive = (path: string) => location.pathname === path;

  // Define navigation items based on user role
  const getNavItems = () => {
    if (!user) {
      return [
        { path: '/', label: 'Home', icon: Home },
      ];
    }

    switch (userRole) {
      case 'admin':
        return [
          { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/admin/users', label: 'Users', icon: User },
          { path: '/admin/drivers', label: 'Drivers', icon: Car },
          { path: '/admin/rides', label: 'Rides', icon: MapPin },
        ];
      case 'driver':
        return [
          { path: '/driver', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/driver/profile', label: 'Profile', icon: User },
        ];
      case 'user':
      default:
        return [
          { path: '/', label: 'Home', icon: Home },
          { path: '/book', label: 'Book Ride', icon: MapPin },
          { path: '/profile', label: 'Profile', icon: User },
        ];
    }
  };

  const navItems = getNavItems();

  // Hide navbar on admin pages (they have sidebar) and login page
  if ((location.pathname.startsWith('/admin') && userRole === 'admin') || location.pathname === '/login') {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={userRole === 'admin' ? '/admin' : userRole === 'driver' ? '/driver' : '/'}>
            <GramRideLogo size="sm" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                  isActive(path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons & Language Toggle */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageToggle size="sm" showLabel={false} />
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground capitalize">
                  {userRole === 'user' ? t.user : userRole === 'driver' ? t.driver : t.admin}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t.signIn === 'লগইন করুন' ? 'বাহির' : 'Sign Out'}
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="hero" size="sm">
                  {t.signIn}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive(path)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              ))}
              
              {/* Language toggle in mobile menu */}
              <div className="px-4 py-2">
                <LanguageToggle size="sm" />
              </div>
              
              {user ? (
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  {t.signIn === 'লগইন করুন' ? 'বাহির' : 'Sign Out'}
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium bg-primary text-primary-foreground"
                >
                  {t.signIn}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
