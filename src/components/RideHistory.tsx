import React, { useEffect, useState, useCallback } from 'react';
import { MapPin, Navigation, Clock, IndianRupee, Package, Users, Loader2, Play, CreditCard, Banknote, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface Ride {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  fare: number | null;
  distance_km: number | null;
  status: string;
  ride_type: string;
  created_at: string;
  completed_at: string | null;
  payment_status: string | null;
  payment_method: string | null;
}

interface RideHistoryProps {
  userId: string;
  userType: 'user' | 'driver';
}

const RideHistory: React.FC<RideHistoryProps> = ({ userId, userType }) => {
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);

  // Check if a ride is incomplete (can be resumed)
  const isIncompleteRide = (status: string) => {
    return ['pending', 'accepted', 'in_progress'].includes(status);
  };

  // Handle resuming an incomplete ride
  const handleResumeRide = (ride: Ride) => {
    if (userType === 'driver') {
      toast.info('Returning to dashboard with active ride...');
      navigate('/driver');
    } else {
      toast.info('Returning to booking with active ride...');
      navigate('/book', { state: { pendingRideId: ride.id } });
    }
  };

  const fetchRides = useCallback(async () => {
    try {
      let query = supabase
        .from('rides')
        .select('id, pickup_location, dropoff_location, fare, distance_km, status, ride_type, created_at, completed_at, payment_status, payment_method')
        .order('created_at', { ascending: false })
        .limit(10);

      if (userType === 'user') {
        query = query.eq('user_id', userId);
      } else {
        // For drivers, we need to get the driver_id first
        let currentDriverId = driverId;
        if (!currentDriverId) {
          const { data: driverData } = await supabase
            .from('drivers')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (driverData) {
            currentDriverId = driverData.id;
            setDriverId(currentDriverId);
          } else {
            setRides([]);
            setLoading(false);
            return;
          }
        }
        query = query.eq('driver_id', currentDriverId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRides(data || []);
    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, userType, driverId]);

  useEffect(() => {
    fetchRides();

    // Subscribe to ride updates for real-time status changes
    const channel = supabase
      .channel(`ride-history-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: userType === 'user' ? `user_id=eq.${userId}` : undefined
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Ride;
            setRides(prev => prev.map(ride => 
              ride.id === updated.id ? { ...ride, ...updated } : ride
            ));
          } else if (payload.eventType === 'INSERT') {
            // Refetch to get proper ordering
            fetchRides();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userType, fetchRides]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-primary/10 text-primary';
      case 'in_progress':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'accepted':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'pending':
        return 'bg-muted text-muted-foreground';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card">
        <h3 className="text-lg font-bold text-foreground mb-4">Ride History</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card">
        <h3 className="text-lg font-bold text-foreground mb-4">Ride History</h3>
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No rides yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card">
      <h3 className="text-lg font-bold text-foreground mb-4">Ride History</h3>
      
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {rides.map((ride) => (
          <div 
            key={ride.id} 
            className={`border rounded-xl p-4 transition-colors ${
              isIncompleteRide(ride.status) 
                ? 'border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10' 
                : 'border-border/30 bg-background/50 hover:bg-background/80'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {ride.ride_type === 'goods' ? (
                  <Package className="w-4 h-4 text-secondary" />
                ) : (
                  <Users className="w-4 h-4 text-primary" />
                )}
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {ride.ride_type === 'goods' ? 'Goods' : 'Passenger'}
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ride.status)}`}>
                {formatStatus(ride.status)}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground line-clamp-1">
                  {ride.pickup_location}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground line-clamp-1">
                  {ride.dropoff_location}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                {ride.fare && (
                  <span className="flex items-center gap-1 text-foreground font-medium">
                    <IndianRupee className="w-3 h-3" />
                    {ride.fare}
                  </span>
                )}
                {ride.distance_km && (
                  <span className="text-muted-foreground">
                    {ride.distance_km.toFixed(1)} km
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(ride.created_at), 'dd MMM, hh:mm a')}
              </span>
            </div>

            {/* Payment info for drivers */}
            {userType === 'driver' && ride.status === 'completed' && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                <div className="flex items-center gap-1.5">
                  {ride.payment_method === 'upi' ? (
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : ride.payment_method === 'cash' ? (
                    <Banknote className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : ride.payment_method === 'wallet' ? (
                    <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground capitalize">
                    {ride.payment_method || 'Not set'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {ride.payment_status === 'completed' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span className={`text-xs font-medium ${
                    ride.payment_status === 'completed' 
                      ? 'text-primary' 
                      : 'text-amber-500'
                  }`}>
                    {ride.payment_status === 'completed' ? 'Paid' : 'Payment Pending'}
                  </span>
                </div>
              </div>
            )}

            {/* Resume button for incomplete rides */}
            {isIncompleteRide(ride.status) && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                  onClick={() => handleResumeRide(ride)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume Ride
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RideHistory;
