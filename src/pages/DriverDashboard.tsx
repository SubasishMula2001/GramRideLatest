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
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import GramRideLogo from '@/components/GramRideLogo';
import RideCard from '@/components/RideCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingRide {
  id: string;
  ride_type: 'passenger' | 'goods';
  pickup_location: string;
  dropoff_location: string;
  fare: number;
  distance_km: number;
  user_id: string;
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
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingRide, setProcessingRide] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    
    if (user) {
      fetchDriverData();
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
          user_id
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingRides((data || []) as PendingRide[]);
    } catch (error) {
      console.error('Error fetching pending rides:', error);
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
      const { error } = await supabase
        .from('rides')
        .update({ 
          driver_id: driverData.id,
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', rideId)
        .eq('status', 'pending');

      if (error) throw error;

      toast.success('Ride accepted! Navigate to pickup location.');
      setPendingRides(prev => prev.filter(r => r.id !== rideId));

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
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Not a Registered Driver</h1>
          <p className="text-muted-foreground mb-6">You need to be registered as a driver to access this page.</p>
          <Button variant="hero" asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <GramRideLogo size="md" />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/driver/profile">
                <User className="w-5 h-5" />
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12 px-4">
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

          {/* Pending Ride Requests */}
          {isOnline && pendingRides.length > 0 && (
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
