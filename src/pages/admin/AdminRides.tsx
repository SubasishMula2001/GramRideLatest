import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, Navigation, Loader2, Car } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RideData {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  ride_type: string;
  status: string;
  fare: number | null;
  distance_km: number | null;
  created_at: string;
  user_name: string | null;
  driver_name: string | null;
}

const AdminRides = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [rides, setRides] = useState<RideData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!authLoading) {
      if (!user || userRole !== 'admin') {
        navigate('/login');
        return;
      }
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
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="ml-64 p-8">
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
            <p className="text-2xl font-bold text-green-600">{completedRides}</p>
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
      </main>
    </div>
  );
};

export default AdminRides;
