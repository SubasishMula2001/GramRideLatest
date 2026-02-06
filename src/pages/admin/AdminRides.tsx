import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Navigation, Loader2, Car, AlertTriangle, XCircle, Clock } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

interface RideData {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  ride_type: string;
  status: string;
  fare: number | null;
  distance_km: number | null;
  created_at: string;
  raw_created_at: string;
  user_name: string | null;
  driver_name: string | null;
}

const AdminRides = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [rides, setRides] = useState<RideData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cancellingRide, setCancellingRide] = useState<string | null>(null);
  const [cancellingAll, setCancellingAll] = useState(false);

  useEffect(() => {
    // ProtectedRoute already handles auth and role checks
    // Only fetch data when auth is loaded and user has access
    if (!authLoading && user && userRole === 'admin') {
      fetchRides();
    }
  }, [user, userRole, authLoading]);

  const fetchRides = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          id,
          pickup_location,
          dropoff_location,
          ride_type,
          status,
          fare,
          distance_km,
          created_at,
          user_id,
          driver_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Collect unique user IDs and driver IDs for batch queries
      const userIds = Array.from(new Set((data || []).map(r => r.user_id).filter(Boolean))) as string[];
      const driverIds = Array.from(new Set((data || []).map(r => r.driver_id).filter(Boolean))) as string[];

      // Batch fetch all profiles at once
      const profilesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        if (profiles) {
          profiles.forEach(p => {
            profilesMap.set(p.id, p.full_name || 'Unknown');
          });
        }
      }

      // Batch fetch all drivers at once
      const driverUserIdMap = new Map<string, string>();
      if (driverIds.length > 0) {
        const { data: drivers } = await supabase
          .from('drivers')
          .select('id, user_id')
          .in('id', driverIds);
        
        if (drivers) {
          // Get unique driver user IDs for profile lookup
          const driverUserIds = Array.from(new Set(drivers.map(d => d.user_id).filter(Boolean))) as string[];
          
          if (driverUserIds.length > 0) {
            const { data: driverProfiles } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', driverUserIds);
            
            if (driverProfiles) {
              const driverProfileMap = new Map(driverProfiles.map(p => [p.id, p.full_name || 'Unknown Driver']));
              drivers.forEach(d => {
                const driverName = driverProfileMap.get(d.user_id) || 'Unknown Driver';
                driverUserIdMap.set(d.id, driverName);
              });
            }
          }
        }
      }

      // Format rides using the pre-fetched maps (O(1) lookups)
      const formattedRides = (data || []).map((ride) => ({
        id: ride.id,
        pickup_location: ride.pickup_location,
        dropoff_location: ride.dropoff_location,
        ride_type: ride.ride_type,
        status: ride.status || 'pending',
        fare: ride.fare,
        distance_km: ride.distance_km,
        raw_created_at: ride.created_at!,
        created_at: new Date(ride.created_at!).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        user_name: ride.user_id ? (profilesMap.get(ride.user_id) || 'Unknown') : 'Unknown',
        driver_name: ride.driver_id ? (driverUserIdMap.get(ride.driver_id) || null) : null
      }));

      setRides(formattedRides);
    } catch (error) {
      console.error('Error fetching rides:', error);
      toast.error('Failed to load rides');
    } finally {
      setLoading(false);
    }
  };

  // Cancel a single ride
  const handleCancelRide = async (rideId: string) => {
    setCancellingRide(rideId);
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'cancelled' })
        .eq('id', rideId);

      if (error) throw error;

      toast.success('Ride cancelled successfully');
      fetchRides();
    } catch (error) {
      console.error('Error cancelling ride:', error);
      toast.error('Failed to cancel ride');
    } finally {
      setCancellingRide(null);
    }
  };

  // Cancel all stale rides
  const handleCancelAllStaleRides = async () => {
    setCancellingAll(true);
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'cancelled' })
        .in('status', ['pending', 'accepted', 'in_progress']);

      if (error) throw error;

      toast.success('All stale rides cancelled successfully');
      fetchRides();
    } catch (error) {
      console.error('Error cancelling stale rides:', error);
      toast.error('Failed to cancel stale rides');
    } finally {
      setCancellingAll(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-secondary/10 text-secondary';
      case 'accepted': return 'bg-primary/10 text-primary';
      case 'in_progress': return 'bg-accent/10 text-accent';
      case 'completed': return 'bg-green-500/10 text-green-600';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      default: return '';
    }
  };

  const filteredRides = rides.filter(r => {
    const matchesSearch = 
      r.pickup_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.dropoff_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get stale rides (incomplete rides older than 1 hour)
  const staleRides = rides.filter(r => {
    if (!['pending', 'accepted', 'in_progress'].includes(r.status)) return false;
    const createdAt = new Date(r.raw_created_at);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return createdAt < hourAgo;
  });

  const columns = [
    { 
      key: 'id', 
      header: 'Ride ID',
      render: (item: RideData) => (
        <span className="font-mono text-sm">{item.id.slice(0, 8)}...</span>
      )
    },
    { 
      key: 'route', 
      header: 'Route',
      render: (item: RideData) => (
        <div className="space-y-1 max-w-xs">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
            <span className="truncate">{item.pickup_location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Navigation className="w-3 h-3 text-secondary flex-shrink-0" />
            <span className="truncate">{item.dropoff_location}</span>
          </div>
        </div>
      )
    },
    { key: 'user_name', header: 'Customer' },
    { 
      key: 'driver_name', 
      header: 'Driver',
      render: (item: RideData) => item.driver_name || '--'
    },
    { 
      key: 'ride_type', 
      header: 'Type',
      render: (item: RideData) => (
        <Badge variant="outline" className="capitalize">
          {item.ride_type}
        </Badge>
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: RideData) => (
        <Badge className={getStatusColor(item.status)}>
          {item.status.replace('_', ' ')}
        </Badge>
      )
    },
    { 
      key: 'fare', 
      header: 'Fare',
      render: (item: RideData) => item.fare ? `₹${item.fare}` : '--'
    },
    { key: 'created_at', header: 'Date' },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: RideData) => {
        if (!['pending', 'accepted', 'in_progress'].includes(item.status)) {
          return <span className="text-muted-foreground text-sm">--</span>;
        }
        return (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-destructive border-destructive/50 hover:bg-destructive/10"
                disabled={cancellingRide === item.id}
              >
                {cancellingRide === item.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <XCircle className="w-3 h-3 mr-1" />
                )}
                Cancel
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this ride?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will cancel the ride from {item.pickup_location} to {item.dropoff_location}. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Ride</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => handleCancelRide(item.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Cancel Ride
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      }
    },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalRides = rides.length;
  const completedRides = rides.filter(r => r.status === 'completed').length;
  const activeRides = rides.filter(r => ['pending', 'accepted', 'in_progress'].includes(r.status)).length;
  const totalRevenue = rides.reduce((sum, r) => sum + (r.fare || 0), 0);

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rides</h1>
            <p className="text-muted-foreground">View and manage all rides</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search rides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border bg-background text-foreground"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Stale Rides Warning */}
        {staleRides.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">
                    {staleRides.length} Stale Ride{staleRides.length > 1 ? 's' : ''} Detected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    These rides have been incomplete for over an hour and may need attention
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={cancellingAll}
                  >
                    {cancellingAll ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Cancel All Stale Rides
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel all stale rides?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel {staleRides.length} ride{staleRides.length > 1 ? 's' : ''} that 
                      {staleRides.length > 1 ? ' have' : ' has'} been stuck in pending/accepted/in_progress status 
                      for over an hour. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Rides</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleCancelAllStaleRides}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancel All Stale Rides
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Total Rides</p>
            <p className="text-2xl font-bold text-foreground">{totalRides}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Active Rides</p>
            <p className="text-2xl font-bold text-primary">{activeRides}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-foreground">{completedRides}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-secondary">₹{totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Table */}
        {filteredRides.length > 0 ? (
          <DataTable columns={columns} data={filteredRides} />
        ) : (
          <div className="bg-gradient-card rounded-xl border border-border/50 p-12 text-center">
            <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No rides found</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRides;
