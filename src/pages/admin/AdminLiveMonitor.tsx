import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Car, 
  Users, 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Navigation,
  IndianRupee
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ActiveRide {
  id: string;
  status: string;
  pickup_location: string;
  dropoff_location: string;
  fare: number | null;
  created_at: string;
  user_name: string;
  driver_name: string | null;
}

interface OnlineDriver {
  id: string;
  user_id: string;
  full_name: string;
  vehicle_number: string;
  rating: number;
  current_lat: number | null;
  current_lng: number | null;
}

const AdminLiveMonitor = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [activeRides, setActiveRides] = useState<ActiveRide[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Stats
  const [stats, setStats] = useState({
    totalRidesToday: 0,
    completedToday: 0,
    cancelledToday: 0,
    revenueToday: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    if (!authLoading && user && userRole === 'admin') {
      fetchData();
      
      // Set up real-time subscription for rides
      const ridesChannel = supabase
        .channel('admin-live-rides')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rides' },
          () => fetchData()
        )
        .subscribe();

      // Set up real-time subscription for drivers
      const driversChannel = supabase
        .channel('admin-live-drivers')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'drivers' },
          () => fetchOnlineDrivers()
        )
        .subscribe();

      // Auto-refresh every 30 seconds
      const interval = setInterval(() => fetchData(), 30000);

      return () => {
        supabase.removeChannel(ridesChannel);
        supabase.removeChannel(driversChannel);
        clearInterval(interval);
      };
    }
  }, [user, userRole, authLoading]);

  const fetchData = async () => {
    await Promise.all([
      fetchActiveRides(),
      fetchOnlineDrivers(),
      fetchTodayStats()
    ]);
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const fetchActiveRides = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('id, status, pickup_location, dropoff_location, fare, created_at, user_id, driver_id')
        .in('status', ['pending', 'accepted', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user and driver names
      const userIds = [...new Set((data || []).map(r => r.user_id).filter(Boolean))] as string[];
      const driverIds = [...new Set((data || []).map(r => r.driver_id).filter(Boolean))] as string[];

      const profilesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        profiles?.forEach(p => profilesMap.set(p.id, p.full_name || 'Unknown'));
      }

      const driverNamesMap = new Map<string, string>();
      if (driverIds.length > 0) {
        const { data: drivers } = await supabase
          .from('drivers')
          .select('id, user_id')
          .in('id', driverIds);
        
        if (drivers) {
          const driverUserIds = drivers.map(d => d.user_id);
          const { data: driverProfiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', driverUserIds);
          
          drivers.forEach(d => {
            const profile = driverProfiles?.find(p => p.id === d.user_id);
            driverNamesMap.set(d.id, profile?.full_name || 'Unknown Driver');
          });
        }
      }

      const formattedRides = (data || []).map(ride => ({
        id: ride.id,
        status: ride.status || 'pending',
        pickup_location: ride.pickup_location,
        dropoff_location: ride.dropoff_location,
        fare: ride.fare,
        created_at: ride.created_at!,
        user_name: ride.user_id ? (profilesMap.get(ride.user_id) || 'Unknown') : 'Unknown',
        driver_name: ride.driver_id ? (driverNamesMap.get(ride.driver_id) || null) : null
      }));

      setActiveRides(formattedRides);
    } catch (error) {
      console.error('Error fetching active rides:', error);
    }
  };

  const fetchOnlineDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, user_id, vehicle_number, rating, current_lat, current_lng')
        .eq('is_available', true)
        .eq('is_verified', true);

      if (error) throw error;

      const userIds = (data || []).map(d => d.user_id);
      const profilesMap = new Map<string, string>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        profiles?.forEach(p => profilesMap.set(p.id, p.full_name || 'Unknown'));
      }

      const formattedDrivers = (data || []).map(driver => ({
        id: driver.id,
        user_id: driver.user_id,
        full_name: profilesMap.get(driver.user_id) || 'Unknown',
        vehicle_number: driver.vehicle_number,
        rating: driver.rating || 5.0,
        current_lat: driver.current_lat,
        current_lng: driver.current_lng
      }));

      setOnlineDrivers(formattedDrivers);
    } catch (error) {
      console.error('Error fetching online drivers:', error);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Total rides today
      const { count: totalToday } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Completed today
      const { count: completedToday } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', today.toISOString());

      // Cancelled today
      const { count: cancelledToday } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('created_at', today.toISOString());

      // Revenue today
      const { data: revenueData } = await supabase
        .from('rides')
        .select('fare')
        .eq('status', 'completed')
        .gte('created_at', today.toISOString());

      const revenueToday = (revenueData || []).reduce((sum, r) => sum + (r.fare || 0), 0);

      // Pending payments
      const { count: pendingPayments } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .eq('payment_status', 'pending');

      setStats({
        totalRidesToday: totalToday || 0,
        completedToday: completedToday || 0,
        cancelledToday: cancelledToday || 0,
        revenueToday,
        pendingPayments: pendingPayments || 0
      });
    } catch (error) {
      console.error('Error fetching today stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-secondary/20 text-secondary';
      case 'accepted': return 'bg-primary/20 text-primary';
      case 'in_progress': return 'bg-accent/20 text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              Live Monitor
            </h1>
            <p className="text-muted-foreground">
              Real-time view of system activity • Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">Active Rides</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{activeRides.length}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Car className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">Online Drivers</p>
            </div>
            <p className="text-3xl font-bold text-primary">{onlineDrivers.length}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">Completed Today</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats.completedToday}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee className="w-4 h-4 text-secondary" />
              <p className="text-sm text-muted-foreground">Revenue Today</p>
            </div>
            <p className="text-3xl font-bold text-secondary">₹{stats.revenueToday.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-muted-foreground">Pending Payments</p>
            </div>
            <p className="text-3xl font-bold text-destructive">{stats.pendingPayments}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Active Rides Panel */}
          <div className="bg-gradient-card rounded-xl border border-border/50 p-6">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Active Rides ({activeRides.length})
            </h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activeRides.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No active rides at the moment</p>
                </div>
              ) : (
                activeRides.map(ride => (
                  <div key={ride.id} className="bg-background/50 rounded-lg p-4 border border-border/30">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getStatusColor(ride.status)}>
                        {ride.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(ride.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span className="truncate">{ride.pickup_location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Navigation className="w-3 h-3 text-secondary" />
                        <span className="truncate">{ride.dropoff_location}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30 text-sm">
                      <span className="text-muted-foreground">
                        <Users className="w-3 h-3 inline mr-1" />
                        {ride.user_name}
                      </span>
                      <span className="text-muted-foreground">
                        {ride.driver_name ? (
                          <>
                            <Car className="w-3 h-3 inline mr-1" />
                            {ride.driver_name}
                          </>
                        ) : (
                          <span className="text-secondary">Waiting for driver</span>
                        )}
                      </span>
                      {ride.fare && (
                        <span className="font-medium">₹{ride.fare}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Online Drivers Panel */}
          <div className="bg-gradient-card rounded-xl border border-border/50 p-6">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              Online Drivers ({onlineDrivers.length})
            </h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {onlineDrivers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <XCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No drivers online</p>
                </div>
              ) : (
                onlineDrivers.map(driver => (
                  <div key={driver.id} className="bg-background/50 rounded-lg p-4 border border-border/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Car className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{driver.full_name}</p>
                        <p className="text-sm text-muted-foreground">{driver.vehicle_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-secondary">
                        <span>★</span>
                        <span className="font-medium">{driver.rating.toFixed(1)}</span>
                      </div>
                      {driver.current_lat && driver.current_lng && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Location active
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="mt-6 bg-gradient-card rounded-xl border border-border/50 p-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Today's Summary
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-background/50 rounded-lg">
              <p className="text-3xl font-bold text-foreground">{stats.totalRidesToday}</p>
              <p className="text-sm text-muted-foreground">Total Rides</p>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{stats.completedToday}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg">
              <p className="text-3xl font-bold text-destructive">{stats.cancelledToday}</p>
              <p className="text-sm text-muted-foreground">Cancelled</p>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg">
              <p className="text-3xl font-bold text-secondary">₹{stats.revenueToday.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Revenue</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminLiveMonitor;
