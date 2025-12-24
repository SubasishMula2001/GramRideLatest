import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, User, Car, Loader2, Phone, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import GramRideLogo from '@/components/GramRideLogo';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';

type UserType = 'user' | 'driver' | 'admin';
type AuthMethod = 'email' | 'phone';
type PhoneStep = 'enter' | 'verify';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const phoneSchema = z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Please enter a valid phone number (e.g., +919876543210)');

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithPhone, verifyPhoneOtp, user, loading: authLoading, userRole } = useAuth();
  
  const [userType, setUserType] = useState<UserType>('user');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string; phone?: string }>({});

  // Redirect if already logged in
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
      navigate('/');
    }
  };

  const validateEmailForm = () => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (!isLogin && !fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePhoneForm = () => {
    const newErrors: { phone?: string } = {};
    
    try {
      phoneSchema.parse(phone);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.phone = e.errors[0].message;
      }
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
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password. Please try again.');
          } else if (error.message.includes('Email not confirmed')) {
            toast.error('Please confirm your email before logging in.');
          } else {
            toast.error(error.message);
          }
          return;
        }
        
        toast.success('Welcome back!');
      } else {
        const { error } = await signUp(email, password, fullName);
        
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('An account with this email already exists. Please sign in instead.');
          } else {
            toast.error(error.message);
          }
          return;
        }
        
        toast.success('Account created successfully! You can now sign in.');
        setIsLogin(true);
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhoneForm()) return;
    
    setLoading(true);
    
    try {
      const { error } = await signInWithPhone(phone);
      
      if (error) {
        toast.error(error.message || 'Failed to send OTP. Please try again.');
        return;
      }
      
      setPhoneStep('verify');
      toast.success('OTP sent to your phone!');
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await verifyPhoneOtp(phone, otp);
      
      if (error) {
        toast.error(error.message || 'Invalid OTP. Please try again.');
        return;
      }
      
      toast.success('Welcome!');
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    
    try {
      const { error } = await signInWithPhone(phone);
      
      if (error) {
        toast.error('Failed to resend OTP. Please try again.');
        return;
      }
      
      toast.success('OTP resent successfully!');
    } catch (error) {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <GramRideLogo size="lg" />
          </Link>
          <p className="text-muted-foreground mt-2">Your Village's Trusted Ride Partner</p>
        </div>

        {/* Card */}
        <div className="bg-gradient-card rounded-2xl border border-border/50 shadow-elevated p-8">
          {/* User Type Tabs */}
          <Tabs value={userType} onValueChange={(v) => setUserType(v as UserType)} className="mb-6">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="user" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                User
              </TabsTrigger>
              <TabsTrigger value="driver" className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                Driver
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Admin
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Auth Method Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={authMethod === 'email' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setAuthMethod('email');
                setPhoneStep('enter');
                setErrors({});
              }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button
              type="button"
              variant={authMethod === 'phone' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setAuthMethod('phone');
                setIsLogin(true);
                setErrors({});
              }}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Phone OTP
            </Button>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">
            {authMethod === 'phone' 
              ? (phoneStep === 'enter' ? 'Login with Phone' : 'Verify OTP')
              : (isLogin ? 'Welcome Back!' : 'Create Account')
            }
          </h2>
          <p className="text-muted-foreground mb-6">
            {authMethod === 'phone'
              ? (phoneStep === 'enter' 
                  ? 'We will send a verification code to your phone' 
                  : `Enter the 6-digit code sent to ${phone}`
                )
              : (isLogin 
                  ? `Sign in to your ${userType} account` 
                  : `Register as a new ${userType}`
                )
            }
          </p>

          {/* Email/Password Form */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-11 h-12"
                      disabled={loading}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-destructive text-sm mt-1">{errors.fullName}</p>
                  )}
                </div>
              )}

              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12"
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12"
                    disabled={loading}
                  />
                </div>
                {errors.password && (
                  <p className="text-destructive text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <Button variant="hero" size="xl" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Phone OTP Form */}
          {authMethod === 'phone' && phoneStep === 'enter' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-11 h-12"
                    disabled={loading}
                  />
                </div>
                {errors.phone && (
                  <p className="text-destructive text-sm mt-1">{errors.phone}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Enter your phone number with country code (e.g., +919876543210)
                </p>
              </div>

              <Button variant="hero" size="xl" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send OTP
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* OTP Verification */}
          {authMethod === 'phone' && phoneStep === 'verify' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP 
                  maxLength={6} 
                  value={otp} 
                  onChange={setOtp}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button 
                variant="hero" 
                size="xl" 
                className="w-full" 
                onClick={handleOtpVerify}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Verify & Login
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>

              <div className="flex justify-between items-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setPhoneStep('enter');
                    setOtp('');
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  ← Change Number
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-primary font-medium hover:underline"
                  disabled={loading}
                >
                  Resend OTP
                </button>
              </div>
            </div>
          )}

          {/* Email Sign Up/In Toggle */}
          {authMethod === 'email' && (
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="text-primary font-medium hover:underline ml-1"
                  disabled={loading}
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          )}

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <h3 className="font-semibold text-sm text-foreground mb-2">Demo Credentials:</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>User:</strong> user@gramride.com / password123</p>
              <p><strong>Driver:</strong> driver@gramride.com / password123</p>
              <p><strong>Admin:</strong> admin@gramride.com / password123</p>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;