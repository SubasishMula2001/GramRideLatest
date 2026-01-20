import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, User, Car, Loader2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GramRideLogo from '@/components/GramRideLogo';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

type UserType = 'user' | 'driver' | 'admin';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading, userRole } = useAuth();
  const { t, language } = useLanguage();
  
  const [userType, setUserType] = useState<UserType>('user');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  // Demo credentials - only available in development + preview environments.
  // Keep this disabled on published URLs.
  const [isDemoEnabled, setIsDemoEnabled] = useState(false);
  
  useEffect(() => {
    // Check demo availability on client side to ensure consistent behavior across browsers
    const hostname = window.location.hostname;
    const isDevOrPreview =
      import.meta.env.DEV ||
      hostname.includes('-preview--') ||
      hostname.includes('lovableproject.com') ||
      hostname.includes('lovable.app') ||
      hostname.includes('localhost') ||
      hostname.includes('127.0.0.1');
    setIsDemoEnabled(isDevOrPreview);
  }, []);
  
  const fillDemoCredentials = async () => {
    if (!isDemoEnabled) {
      toast.error('Demo credentials are not available in production');
      return;
    }
    
    setLoading(true);
    toast.info('Setting up demo accounts...');
    
    try {
      // Call the setup endpoint to ensure demo users exist with correct passwords
      const { data, error } = await supabase.functions.invoke('setup-demo-users');
      
      if (error) {
        console.error('Setup error:', error);
        toast.error('Failed to setup demo accounts');
        setLoading(false);
        return;
      }
      
      const demoEmails: Record<UserType, string> = {
        user: 'user@gramride.com',
        driver: 'driver@gramride.com', 
        admin: 'admin@gramride.com'
      };
      
      // Use the password returned from the server
      const demoPassword = data.password || 'Demo@123';
      setEmail(demoEmails[userType]);
      setPassword(demoPassword);
      setIsLogin(true);
      toast.success(`Demo ${userType} credentials ready. Click login to continue.`);
    } catch (err) {
      console.error('Demo setup failed:', err);
      toast.error('Failed to setup demo credentials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      redirectBasedOnRole();
    }
  }, [user, authLoading, userRole]);

  const redirectBasedOnRole = () => {
    if (userRole === 'admin') {
      navigate('/admin');
    } else if (userRole === 'driver') {
      navigate('/driver');
    } else {
      navigate('/book');
    }
  };

  const validateEmailForm = () => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = language === 'bn' ? t.invalidEmail : e.errors[0].message;
      }
    }

    // Only validate password complexity on signup, not login
    if (!isLogin) {
      try {
        passwordSchema.parse(password);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.password = language === 'bn' ? t.passwordRequired : e.errors[0].message;
        }
      }
    } else {
      // On login, just check that password is not empty
      if (!password.trim()) {
        newErrors.password = t.passwordRequired;
      }
    }

    if (!isLogin && !fullName.trim()) {
      newErrors.fullName = t.nameRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmailForm()) return;
    
    setLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        
        if (error) {
          toast.error(error.message.includes('Invalid login credentials') 
            ? (language === 'bn' ? 'ভুল ইমেইল বা পাসওয়ার্ড' : 'Invalid email or password')
            : error.message
          );
          return;
        }
        
        toast.success(t.welcomeMessage);
      } else {
        const { error } = await signUp(email, password, fullName);
        
        if (error) {
          toast.error(error.message);
          return;
        }
        
        toast.success(t.accountCreated);
        setIsLogin(true);
      }
    } catch (error) {
      toast.error(language === 'bn' ? 'কিছু সমস্যা হয়েছে' : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-lg text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  const userTypeConfig = [
    { type: 'user' as UserType, icon: User, label: t.user, color: 'bg-primary' },
    { type: 'driver' as UserType, icon: Car, label: t.driver, color: 'bg-secondary' },
    { type: 'admin' as UserType, icon: Lock, label: t.admin, color: 'bg-accent' },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Header with Language Toggle */}
      <div className="w-full p-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <Home className="w-6 h-6" />
          <span className="text-lg font-medium">{t.backToHome}</span>
        </Link>
        <LanguageToggle size="default" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 pb-8">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <GramRideLogo size="lg" />
            </Link>
            <p className="text-muted-foreground mt-3 text-lg">{t.tagline}</p>
          </div>

          {/* Main Card */}
          <div className="bg-card rounded-3xl border-2 border-border shadow-elevated p-6 md:p-8">
            
            {/* User Type Selection - Large Touch Friendly Buttons */}
            <div className="mb-6">
              <p className="text-center text-muted-foreground mb-4 text-lg">
                {language === 'bn' ? 'আপনি কে?' : 'Who are you?'}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {userTypeConfig.map(({ type, icon: Icon, label, color }) => (
                  <button
                    key={type}
                    onClick={() => setUserType(type)}
                    className={`
                      flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all
                      ${userType === type 
                        ? 'border-primary bg-primary/10 shadow-lg scale-105' 
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className={`w-14 h-14 rounded-full ${color} flex items-center justify-center mb-2`}>
                      <Icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <span className={`text-base font-semibold ${userType === type ? 'text-primary' : 'text-foreground'}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
              
              {/* Demo Credentials Button - Only show in dev/staging */}
              {isDemoEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 border-dashed border-2 text-muted-foreground hover:text-primary hover:border-primary"
                  onClick={fillDemoCredentials}
                  disabled={loading}
                >
                  🎯 Use Demo {userType.charAt(0).toUpperCase() + userType.slice(1)} Email
                </Button>
              )}
            </div>

            {/* Email Auth Badge */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <Mail className="w-5 h-5 text-primary" />
                <span className="text-primary font-medium">{t.emailMethod}</span>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
              {isLogin ? t.welcomeBack : t.createAccount}
            </h2>
            <p className="text-muted-foreground mb-6 text-center text-lg">
              {isLogin ? t.signIn : t.signUp}
            </p>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t.fullName}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-14 h-14 text-lg rounded-xl border-2"
                      disabled={loading}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-destructive text-base mt-2">{errors.fullName}</p>
                  )}
                </div>
              )}

              <div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder={t.email}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-14 h-14 text-lg rounded-xl border-2"
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-base mt-2">{errors.email}</p>
                )}
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder={t.password}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-14 h-14 text-lg rounded-xl border-2"
                    disabled={loading}
                  />
                </div>
                {errors.password && (
                  <p className="text-destructive text-base mt-2">{errors.password}</p>
                )}
              </div>

              <Button 
                variant="default" 
                size="lg" 
                className="w-full h-14 text-xl font-bold rounded-xl"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    {isLogin ? t.signIn : t.createAccount}
                    <ArrowRight className="w-6 h-6 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Sign Up/In Toggle */}
            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-lg">
                {isLogin ? t.noAccount : t.haveAccount}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="text-primary font-semibold hover:underline ml-2"
                  disabled={loading}
                >
                  {isLogin ? t.signUp : t.signIn}
                </button>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
