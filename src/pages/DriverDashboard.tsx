import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Power, 
  TrendingUp, 
  Clock, 
  Star, 
  IndianRupee, 
  Navigation,
  Bell,
  User,
  ArrowLeft,
  LogOut,
  Loader2,
  MapPin,
  CheckCircle,
  Phone,
  Package,
  Car,
  CircleDot,
  Locate,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import GramRideLogo from '@/components/GramRideLogo';
import RideCard from '@/components/RideCard';
import SecureRouteMap from '@/components/SecureRouteMap';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDriverLocationTracking } from '@/hooks/useDriverLocationTracking';

// Helper to clean Plus Codes from addresses
const cleanPlusCode = (address: string): string => {
  return address
    .replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,3},?\s*/i, '')
    .replace(/,?\s*[A-Z0-9]{4}\+[A-Z0-9]{2,3}\s*,?/gi, ',')
    .replace(/,\s*,/g, ',')
    .replace(/^,\s*/, '')
    .replace(/,\s*$/, '')
    .trim();
};

interface PendingRide {
  id: string;
  ride_type: 'passenger' | 'goods';
  pickup_location: string;
  dropoff_location: string;
  fare: number;
  distance_km: number;
  user_id: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
}

interface ActiveRide {
  id: string;
  ride_type: 'passenger' | 'goods';
  pickup_location: string;
  dropoff_location: string;
  fare: number;
  distance_km: number;
  status: 'accepted' | 'in_progress';
  user_name: string | null;
  user_phone: string | null;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  otp?: string;
}

interface DriverData {
  id: string;
  is_available: boolean;
  is_verified: boolean;
  rating: number;
  total_rides: number;
  earnings: number;
}

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  
  const [isOnline, setIsOnline] = useState(false);
  const [pendingRides, setPendingRides] = useState<PendingRide[]>([]);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingRide, setProcessingRide] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState(false);

  // Track driver location during active rides
  useDriverLocationTracking({
    driverId: driverData?.id || null,
    isActive: !!activeRide,
    updateIntervalMs: 10000 // Update every 10 seconds
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    
    if (user) {
      fetchDriverData();
      fetchActiveRide();
    }
  }, [user, authLoading]);

  // Subscribe to pending rides when online
  useEffect(() => {
    if (!isOnline || !driverData?.is_verified) return;

    fetchPendingRides();

    const channel = supabase
      .channel('pending-rides')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rides',
          filter: 'status=eq.pending'
        },
        (payload) => {
          console.log('New ride:', payload);
          fetchPendingRides();
          toast.info('New ride request available!');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides'
        },
        () => {
          fetchPendingRides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, driverData]);

  const fetchDriverData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, is_available, is_verified, rating, total_rides, earnings')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDriverData(data);
        setIsOnline(data.is_available);
      }
    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRides = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          id,
          ride_type,
          pickup_location,
          dropoff_location,
          fare,
          distance_km,
          user_id,
          pickup_lat,
          pickup_lng,
          dropoff_lat,
          dropoff_lng
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingRides((data || []) as PendingRide[]);
    } catch (error) {
      console.error('Error fetching pending rides:', error);
    }
  };

  const fetchActiveRide = async () => {
    if (!driverData) return;

    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          id,
          ride_type,
          pickup_location,
          dropoff_location,
          fare,
          distance_km,
          status,
          user_id,
          pickup_lat,
          pickup_lng,
          dropoff_lat,
          dropoff_lng,
          otp
        `)
        .eq('driver_id', driverData.id)
        .in('status', ['accepted', 'in_progress'])
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Fetch user profile separately
        let userName = 'Customer';
        let userPhone: string | null = null;
        if (data.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', data.user_id)
            .maybeSingle();
          
          if (profileData?.full_name) {
            userName = profileData.full_name;
          }
          if (profileData?.phone) {
            userPhone = profileData.phone;
          }
        }

        setActiveRide({
          id: data.id,
          ride_type: data.ride_type,
          pickup_location: data.pickup_location,
          dropoff_location: data.dropoff_location,
          fare: data.fare || 0,
          distance_km: data.distance_km || 0,
          status: data.status as 'accepted' | 'in_progress',
          user_name: userName,
          user_phone: userPhone,
          pickup_lat: data.pickup_lat,
          pickup_lng: data.pickup_lng,
          dropoff_lat: data.dropoff_lat,
          dropoff_lng: data.dropoff_lng,
          otp: data.otp || undefined
        });
      } else {
        setActiveRide(null);
      }
    } catch (error) {
      console.error('Error fetching active ride:', error);
    }
  };

  const handleToggleOnline = async () => {
    if (!driverData) return;

    const newStatus = !isOnline;
    
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ is_available: newStatus })
        .eq('id', driverData.id);

      if (error) throw error;

      setIsOnline(newStatus);
      
      if (newStatus) {
        toast.success("You're now online! Waiting for ride requests.");
      } else {
        toast.info("You're now offline.");
        setPendingRides([]);
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user?.id,
        action: newStatus ? 'Driver went online' : 'Driver went offline',
        details: { driver_id: driverData.id }
      });

    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    if (!driverData) return;

    setProcessingRide(rideId);
    try {
      // Get ride details first
      const { data: rideData, error: fetchError } = await supabase
        .from('rides')
        .select(`
          id,
          ride_type,
          pickup_location,
          dropoff_location,
          fare,
          distance_km,
          user_id,
          pickup_lat,
          pickup_lng,
          dropoff_lat,
          dropoff_lng,
          otp
        `)
        .eq('id', rideId)
        .single();

      if (fetchError) throw fetchError;

      // Fetch user profile separately
      let userName = 'Customer';
      let userPhone: string | null = null;
      if (rideData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', rideData.user_id)
          .maybeSingle();
        
        if (profileData?.full_name) {
          userName = profileData.full_name;
        }
        if (profileData?.phone) {
          userPhone = profileData.phone;
        }
      }

      // Use atomic RPC function to prevent race conditions
      const { data: success, error } = await supabase.rpc('accept_ride', {
        _ride_id: rideId,
        _driver_id: driverData.id
      });

      if (error) throw error;

      if (!success) {
        toast.error('This ride was already accepted by another driver');
        setPendingRides(prev => prev.filter(r => r.id !== rideId));
        return;
      }

      toast.success('Ride accepted! Navigate to pickup location.');
      setPendingRides(prev => prev.filter(r => r.id !== rideId));

      // Set active ride
      setActiveRide({
        id: rideData.id,
        ride_type: rideData.ride_type,
        pickup_location: rideData.pickup_location,
        dropoff_location: rideData.dropoff_location,
        fare: rideData.fare || 0,
        distance_km: rideData.distance_km || 0,
        status: 'accepted',
        user_name: userName,
        user_phone: userPhone,
        pickup_lat: rideData.pickup_lat,
        pickup_lng: rideData.pickup_lng,
        dropoff_lat: rideData.dropoff_lat,
        dropoff_lng: rideData.dropoff_lng,
        otp: rideData.otp || undefined
      });

      // Update driver stats
      await supabase
        .from('drivers')
        .update({ total_rides: (driverData.total_rides || 0) + 1 })
        .eq('id', driverData.id);

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user?.id,
        action: 'Ride Accepted',
        details: { ride_id: rideId, driver_id: driverData.id }
      });

    } catch (error) {
      console.error('Error accepting ride:', error);
      toast.error('Failed to accept ride');
    } finally {
      setProcessingRide(null);
    }
  };

  const handleStartRide = async () => {
    if (!activeRide || !driverData) return;

    // Validate OTP
    if (activeRide.otp && otpInput !== activeRide.otp) {
      setOtpError(true);
      toast.error('Invalid OTP. Please check with the customer.');
      return;
    }

    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'in_progress' })
        .eq('id', activeRide.id);

      if (error) throw error;

      setActiveRide(prev => prev ? { ...prev, status: 'in_progress' } : null);
      setOtpInput('');
      setOtpError(false);
      toast.success('Ride started!');

      await supabase.from('activity_logs').insert({
        user_id: user?.id,
        action: 'Ride Started',
        details: { ride_id: activeRide.id, driver_id: driverData.id }
      });
    } catch (error) {
      console.error('Error starting ride:', error);
      toast.error('Failed to start ride');
    }
  };

  const handleFinishRide = async () => {
    if (!activeRide || !driverData) return;

    try {
      const { error } = await supabase
        .from('rides')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', activeRide.id);

      if (error) throw error;

      // Update earnings
      await supabase
        .from('drivers')
        .update({ earnings: (driverData.earnings || 0) + activeRide.fare })
        .eq('id', driverData.id);

      toast.success('Ride completed! Fare collected: ₹' + activeRide.fare);
      setActiveRide(null);
      
      // Refresh driver data
      fetchDriverData();

      await supabase.from('activity_logs').insert({
        user_id: user?.id,
        action: 'Ride Completed',
        details: { ride_id: activeRide.id, driver_id: driverData.id, fare: activeRide.fare }
      });
    } catch (error) {
      console.error('Error finishing ride:', error);
      toast.error('Failed to complete ride');
    }
  };

  const handleDeclineRide = (rideId: string) => {
    setPendingRides(prev => prev.filter(r => r.id !== rideId));
  };

  const handleLogout = async () => {
    try {
      // Go offline before logout
      if (driverData && isOnline) {
        await supabase
          .from('drivers')
          .update({ is_available: false })
          .eq('id', driverData.id);
      }
      
      await signOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!driverData) {
    // Redirect to registration page
    navigate('/driver/register');
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero pt-16">
      <main className="pt-8 pb-12 px-4">
        <div className="container mx-auto max-w-lg">
          
          {/* Verification Warning */}
          {!driverData.is_verified && (
            <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 mb-6">
              <p className="text-secondary font-medium">⚠️ Your account is pending verification</p>
              <p className="text-sm text-muted-foreground">You cannot receive rides until verified by admin.</p>
            </div>
          )}

          {/* Online Toggle Card */}
          <div className={`
            rounded-2xl p-6 mb-6 transition-all duration-500
            ${isOnline 
              ? 'bg-gradient-primary shadow-glow' 
              : 'bg-gradient-card border border-border/50 shadow-card'
            }
          `}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-bold ${isOnline ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {isOnline ? "You're Online" : "You're Offline"}
                </h2>
                <p className={`text-sm ${isOnline ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {isOnline ? 'Waiting for ride requests...' : 'Go online to receive rides'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Power className={`w-6 h-6 ${isOnline ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                <Switch
                  checked={isOnline}
                  onCheckedChange={handleToggleOnline}
                  disabled={!driverData.is_verified}
                  className="data-[state=checked]:bg-secondary"
                />
              </div>
            </div>

            {isOnline && (
              <div className="mt-4 pt-4 border-t border-primary-foreground/20 flex items-center gap-2 text-primary-foreground/80 text-sm">
                <Navigation className="w-4 h-4 animate-pulse" />
                <span>GPS Active • {pendingRides.length} pending requests</span>
              </div>
            )}
          </div>

          {/* Active Ride Card with Animation */}
          <AnimatePresence mode="wait">
            {activeRide && (
              <motion.div
                key={`active-ride-${activeRide.status}`}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`bg-gradient-card rounded-2xl border-2 shadow-elevated overflow-hidden mb-6 ${
                  activeRide.status === 'in_progress' ? 'border-green-500' : 'border-primary'
                }`}
              >
                <motion.div 
                  className={`px-5 py-3 flex items-center justify-between ${
                    activeRide.status === 'in_progress' ? 'bg-green-600' : 'bg-gradient-primary'
                  }`}
                  layoutId="ride-header"
                >
                  <div className="flex items-center gap-2 text-white">
                    {activeRide.ride_type === 'passenger' ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <Package className="w-5 h-5" />
                    )}
                    <span className="font-semibold">
                      {activeRide.status === 'accepted' ? 'Go to Pickup Location' : 'Heading to Drop Location'}
                    </span>
                  </div>
                  <motion.div 
                    className="flex items-center gap-1 text-white/90 text-sm"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <CircleDot className="w-4 h-4" />
                    <span>{activeRide.status === 'accepted' ? 'Picking Up' : 'On Trip'}</span>
                  </motion.div>
                </motion.div>

                {/* Route Info */}
                <div className="p-4 border-b border-border/50">
                  <SecureRouteMap
                    pickupLat={activeRide.pickup_lat}
                    pickupLng={activeRide.pickup_lng}
                    dropLat={activeRide.dropoff_lat}
                    dropLng={activeRide.dropoff_lng}
                  />
                </div>

                <div className="p-5 space-y-4">
                  {/* Customer Info */}
                  <motion.div 
                    className="flex items-center gap-3 pb-4 border-b border-border/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{activeRide.user_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {activeRide.ride_type === 'passenger' ? 'Passenger' : 'Goods Delivery'}
                      </p>
                    </div>
                  </motion.div>

                  {/* Locations with status indicator */}
                  <div className="space-y-3">
                    <motion.div 
                      className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-300 ${
                        activeRide.status === 'accepted' ? 'bg-primary/10 border border-primary/30 shadow-sm' : 'bg-muted/30'
                      }`}
                      animate={activeRide.status === 'accepted' ? { scale: [1, 1.01, 1] } : {}}
                      transition={{ duration: 1.5, repeat: activeRide.status === 'accepted' ? Infinity : 0 }}
                    >
                      <div className="mt-0.5 p-1.5 rounded-full bg-primary/20">
                        <Navigation className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          {activeRide.status === 'accepted' ? '📍 Navigate Here' : 'Pickup'}
                        </p>
                        <p className="text-foreground font-medium">{cleanPlusCode(activeRide.pickup_location)}</p>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-300 ${
                        activeRide.status === 'in_progress' ? 'bg-green-500/10 border border-green-500/30 shadow-sm' : 'bg-muted/30'
                      }`}
                      animate={activeRide.status === 'in_progress' ? { scale: [1, 1.01, 1] } : {}}
                      transition={{ duration: 1.5, repeat: activeRide.status === 'in_progress' ? Infinity : 0 }}
                    >
                      <div className="mt-0.5 p-1.5 rounded-full bg-secondary/20">
                        <MapPin className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          {activeRide.status === 'in_progress' ? '📍 Navigate Here' : 'Drop'}
                        </p>
                        <p className="text-foreground font-medium">{cleanPlusCode(activeRide.dropoff_location)}</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Stats */}
                  <motion.div 
                    className="flex items-center justify-between py-4 px-4 bg-muted/50 rounded-xl"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Distance</p>
                      <p className="font-bold text-foreground">{activeRide.distance_km} km</p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Fare</p>
                      <p className="font-bold text-foreground flex items-center">
                        <IndianRupee className="w-4 h-4" />
                        {activeRide.fare}
                      </p>
                    </div>
                  </motion.div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3 pt-2">
                    {/* Navigate Button */}
                    <Button 
                      variant="outline" 
                      className="w-full border-primary text-primary hover:bg-primary/10"
                      onClick={() => {
                        const lat = activeRide.status === 'accepted' ? activeRide.pickup_lat : activeRide.dropoff_lat;
                        const lng = activeRide.status === 'accepted' ? activeRide.pickup_lng : activeRide.dropoff_lng;
                        
                        if (lat && lng) {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                          window.open(url, '_blank');
                        } else {
                          toast.error('Location coordinates not available');
                        }
                      }}
                    >
                      <Locate className="w-4 h-4 mr-2" />
                      Navigate to {activeRide.status === 'accepted' ? 'Pickup' : 'Drop-off'}
                    </Button>

                    <AnimatePresence mode="wait">
                      {activeRide.status === 'accepted' ? (
                        <motion.div 
                          key="pickup-section"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          {/* OTP Input with Customer Name */}
                          {activeRide.otp && (
                            <div className="bg-secondary/10 rounded-xl p-4 border border-secondary/30">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <KeyRound className="w-5 h-5 text-secondary" />
                                  <span className="font-semibold text-foreground">Enter Customer OTP</span>
                                </div>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3 mb-3">
                                <p className="text-xs text-muted-foreground">Customer Name</p>
                                <p className="font-semibold text-foreground">{activeRide.user_name}</p>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                Ask {activeRide.user_name} for their 4-digit OTP
                              </p>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                placeholder="Enter 4-digit OTP"
                                value={otpInput}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '');
                                  setOtpInput(value);
                                  setOtpError(false);
                                }}
                                className={`text-center text-xl font-bold tracking-widest ${
                                  otpError ? 'border-destructive focus-visible:ring-destructive' : ''
                                }`}
                              />
                              {otpError && (
                                <p className="text-destructive text-sm mt-2">Invalid OTP. Please try again.</p>
                              )}
                            </div>
                          )}
                          <Button 
                            variant="hero" 
                            className="w-full bg-primary hover:bg-primary/90"
                            onClick={handleStartRide}
                            disabled={activeRide.otp ? otpInput.length !== 4 : false}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Picked Up Customer
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="dropoff-section"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                        >
                          <Button 
                            variant="hero" 
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={handleFinishRide}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            End Ride
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pending Ride Requests */}
          {isOnline && !activeRide && pendingRides.length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-bold text-foreground">Ride Requests</h3>
              {pendingRides.map((ride) => (
                <RideCard
                  key={ride.id}
                  id={ride.id}
                  type={ride.ride_type}
                  pickup={ride.pickup_location}
                  drop={ride.dropoff_location}
                  distance={`${ride.distance_km || 0} km`}
                  estimatedFare={ride.fare || 0}
                  customerName="Customer"
                  customerRating={4.5}
                  onAccept={() => handleAcceptRide(ride.id)}
                  onDecline={() => handleDeclineRide(ride.id)}
                />
              ))}
            </div>
          )}

          {/* Today's Stats */}
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card mb-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Your Stats</h3>
            
            <div className="flex items-center justify-center mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center text-4xl font-bold text-primary">
                  <IndianRupee className="w-8 h-8" />
                  <span>{driverData.earnings?.toLocaleString() || 0}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Total Earnings</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="text-xl font-bold text-foreground">{driverData.total_rides || 0}</div>
                <div className="text-xs text-muted-foreground">Rides</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="text-xl font-bold text-foreground flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" />
                  --
                </div>
                <div className="text-xs text-muted-foreground">Online</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="text-xl font-bold text-foreground flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 text-secondary" />
                  {driverData.rating?.toFixed(1) || '5.0'}
                </div>
                <div className="text-xs text-muted-foreground">Rating</div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;
