import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Car, Activity, IndianRupee, Loader2 } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
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
    if (!authLoading) {
      if (!user) {
        navigate('/login');
        return;
      }
      if (userRole !== 'admin') {
        navigate('/');
        return;
      }
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

      // Fetch recent rides with user and driver info
      const { data: rides } = await supabase
        .from('rides')
        .select(`
          id,
          ride_type,
          status,
          fare,
          created_at,
          profiles:user_id(full_name),
          drivers:driver_id(
            profiles:user_id(full_name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (rides) {
        const formattedRides = rides.map(ride => ({
          id: ride.id.slice(0, 8).toUpperCase(),
          user_name: (ride.profiles as any)?.full_name || 'Unknown',
          driver_name: (ride.drivers as any)?.profiles?.full_name || 'Not assigned',
          ride_type: ride.ride_type === 'passenger' ? 'Passenger' : 'Goods',
          status: ride.status,
          fare: ride.fare || 0,
          created_at: getTimeAgo(new Date(ride.created_at))
        }));
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
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="ml-64 p-8">
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
      </main>
    </div>
  );
};

export default AdminDashboard;
