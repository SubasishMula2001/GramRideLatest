import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Clock, IndianRupee, Package, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

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
}

interface RideHistoryProps {
  userId: string;
  userType: 'user' | 'driver';
}

const RideHistory: React.FC<RideHistoryProps> = ({ userId, userType }) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRides();
  }, [userId, userType]);

  const fetchRides = async () => {
    try {
      let query = supabase
        .from('rides')
        .select('id, pickup_location, dropoff_location, fare, distance_km, status, ride_type, created_at, completed_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (userType === 'user') {
        query = query.eq('user_id', userId);
      } else {
        // For drivers, we need to get the driver_id first
        const { data: driverData } = await supabase
          .from('drivers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (driverData) {
          query = query.eq('driver_id', driverData.id);
        } else {
          setRides([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setRides(data || []);
    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-primary/10 text-primary';
      case 'in_progress':
        return 'bg-secondary/10 text-secondary';
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
            className="border border-border/30 rounded-xl p-4 bg-background/50 hover:bg-background/80 transition-colors"
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default RideHistory;
