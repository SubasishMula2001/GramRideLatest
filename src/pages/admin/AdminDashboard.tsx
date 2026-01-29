import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Car, Activity, IndianRupee, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import AdminStatsCard from '@/components/AdminStatsCard';
import DataTable from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface RecentRide {
  id: string;
  user_name: string;
  driver_name: string;
  ride_type: string;
  status: string;
  fare: number;
  created_at: string;
}

interface DashboardStats {
  totalUsers: number;
  activeDrivers: number;
  todayRides: number;
  todayRevenue: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [recentRides, setRecentRides] = useState<RecentRide[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeDrivers: 0,
    todayRides: 0,
    todayRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ProtectedRoute already handles auth and role checks
    // Only fetch data when auth is loaded and user has access
    if (!authLoading && user && userRole === 'admin') {
      fetchDashboardData();
    }
  }, [user, userRole, authLoading]);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const [usersResult, driversResult, ridesResult] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('is_available', true),
        supabase.from('rides').select('fare, status').gte('created_at', new Date().toISOString().split('T')[0])
      ]);

      const todayRides = ridesResult.data || [];
      const completedRides = todayRides.filter(r => r.status === 'completed');
      const todayRevenue = completedRides.reduce((sum, r) => sum + (r.fare || 0), 0);

      setStats({
        totalUsers: usersResult.count || 0,
        activeDrivers: driversResult.count || 0,
        todayRides: todayRides.length,
        todayRevenue
      });

      // Fetch recent rides (no embedded joins; fetch names separately)
      const { data: rides, error: ridesError } = await supabase
        .from('rides')
        .select('id, ride_type, status, fare, created_at, user_id, driver_id')
        .order('created_at', { ascending: false })
        .limit(10);

      if (ridesError) throw ridesError;

      const userIds = Array.from(new Set((rides || []).map((r: any) => r.user_id).filter(Boolean))) as string[];
      const driverIds = Array.from(new Set((rides || []).map((r: any) => r.driver_id).filter(Boolean))) as string[];

      const userProfilesResult = userIds.length
        ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
        : { data: [], error: null };

      const userProfiles = userProfilesResult.data as any[];
      const userNameById = new Map<string, string>((userProfiles || []).map((p: any) => [p.id, p.full_name || 'Unknown']));

      const driversResult2 = driverIds.length
        ? await supabase.from('drivers').select('id, user_id').in('id', driverIds)
        : { data: [], error: null };

      const drivers = driversResult2.data as any[];
      const driverById = new Map<string, any>((drivers || []).map((d: any) => [d.id, d]));
      const driverUserIds = Array.from(new Set((drivers || []).map((d: any) => d.user_id).filter(Boolean))) as string[];

      const driverProfilesResult = driverUserIds.length
        ? await supabase.from('profiles').select('id, full_name').in('id', driverUserIds)
        : { data: [], error: null };

      const driverProfiles = driverProfilesResult.data as any[];
      const driverNameByUserId = new Map<string, string>((driverProfiles || []).map((p: any) => [p.id, p.full_name || 'Unknown Driver']));

      if (rides) {
        const formattedRides = rides.map((ride: any) => {
          const driver = ride.driver_id ? driverById.get(ride.driver_id) : null;
          const driverName = driver?.user_id ? driverNameByUserId.get(driver.user_id) : null;

          return {
            id: ride.id.slice(0, 8).toUpperCase(),
            user_name: (ride.user_id && userNameById.get(ride.user_id)) || 'Unknown',
            driver_name: driverName || 'Not assigned',
            ride_type: ride.ride_type === 'passenger' ? 'Passenger' : 'Goods',
            status: ride.status,
            fare: ride.fare || 0,
            created_at: getTimeAgo(new Date(ride.created_at))
          };
        });
        setRecentRides(formattedRides);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }; 

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const columns = [
    { key: 'id', header: 'Ride ID' },
    { key: 'user_name', header: 'User' },
    { key: 'driver_name', header: 'Driver' },
    { 
      key: 'ride_type', 
      header: 'Type',
      render: (item: RecentRide) => (
        <Badge variant={item.ride_type === 'Passenger' ? 'default' : 'secondary'}>
          {item.ride_type}
        </Badge>
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: RecentRide) => (
        <Badge 
          variant={
            item.status === 'completed' ? 'default' : 
            item.status === 'in_progress' || item.status === 'accepted' ? 'secondary' : 
            item.status === 'pending' ? 'outline' :
            'destructive'
          }
          className={
            item.status === 'completed' ? 'bg-primary/10 text-primary hover:bg-primary/20' :
            item.status === 'in_progress' || item.status === 'accepted' ? 'bg-secondary/10 text-secondary hover:bg-secondary/20' :
            ''
          }
        >
          {item.status}
        </Badge>
      )
    },
    { 
      key: 'fare', 
      header: 'Fare',
      render: (item: RecentRide) => (
        <span className="font-medium">₹{item.fare}</span>
      )
    },
    { key: 'created_at', header: 'Time' },
  ];

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with GramRide.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminStatsCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            change="+12% from last month"
            changeType="positive"
            icon={Users}
            iconBg="primary"
          />
          <AdminStatsCard
            title="Active Drivers"
            value={stats.activeDrivers.toString()}
            change="+8% from last month"
            changeType="positive"
            icon={Car}
            iconBg="secondary"
          />
          <AdminStatsCard
            title="Today's Rides"
            value={stats.todayRides.toString()}
            change="Live count"
            changeType="neutral"
            icon={Activity}
            iconBg="accent"
          />
          <AdminStatsCard
            title="Today's Revenue"
            value={`₹${stats.todayRevenue.toLocaleString()}`}
            change="+18% from yesterday"
            changeType="positive"
            icon={IndianRupee}
            iconBg="primary"
          />
        </div>

        {/* Recent Rides Table */}
        <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Recent Rides</h3>
            <button 
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => navigate('/admin/logs')}
            >
              View All
            </button>
          </div>
          
          {recentRides.length > 0 ? (
            <DataTable columns={columns} data={recentRides} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No rides yet
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
