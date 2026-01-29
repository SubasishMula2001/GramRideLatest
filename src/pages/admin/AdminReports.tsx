import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  TrendingUp, 
  Car, 
  Users,
  Download,
  Loader2,
  Calendar
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek, startOfMonth, endOfDay, eachDayOfInterval } from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend
} from 'recharts';

interface RevenueData {
  date: string;
  revenue: number;
  rides: number;
}

interface RideTypeData {
  name: string;
  value: number;
}

const AdminReports = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalRides: 0,
    totalUsers: 0,
    totalDrivers: 0,
    avgFare: 0,
    completionRate: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [rideTypeData, setRideTypeData] = useState<RideTypeData[]>([]);

  useEffect(() => {
    // ProtectedRoute already handles auth and role checks
    // Only fetch data when auth is loaded and user has access
    if (!authLoading && user && userRole === 'admin') {
      fetchReportData();
    }
  }, [user, userRole, authLoading, period]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startDate = period === 'week' 
        ? startOfWeek(now)
        : startOfMonth(now);
      const days = period === 'week' ? 7 : 30;

      // Fetch all rides for the period
      const { data: rides } = await supabase
        .from('rides')
        .select('fare, ride_type, status, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endOfDay(now).toISOString());

      // Fetch user counts
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: driverCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true });

      if (rides) {
        const completedRides = rides.filter(r => r.status === 'completed');
        const totalRevenue = completedRides.reduce((sum, r) => sum + (r.fare || 0), 0);
        const avgFare = completedRides.length > 0 ? totalRevenue / completedRides.length : 0;
        const completionRate = rides.length > 0 ? (completedRides.length / rides.length) * 100 : 0;

        setStats({
          totalRevenue,
          totalRides: rides.length,
          totalUsers: userCount || 0,
          totalDrivers: driverCount || 0,
          avgFare: Math.round(avgFare),
          completionRate: Math.round(completionRate),
        });

        // Generate revenue chart data
        const dateRange = eachDayOfInterval({
          start: subDays(now, days - 1),
          end: now,
        });

        const groupedData: { [key: string]: RevenueData } = {};
        dateRange.forEach(date => {
          const key = format(date, 'MMM d');
          groupedData[key] = { date: key, revenue: 0, rides: 0 };
        });

        completedRides.forEach(ride => {
          const date = format(new Date(ride.created_at), 'MMM d');
          if (groupedData[date]) {
            groupedData[date].revenue += ride.fare || 0;
            groupedData[date].rides += 1;
          }
        });

        setRevenueData(Object.values(groupedData));

        // Ride type distribution
        const passengerRides = rides.filter(r => r.ride_type === 'passenger').length;
        const goodsRides = rides.filter(r => r.ride_type === 'goods').length;
        setRideTypeData([
          { name: 'Passenger', value: passengerRides },
          { name: 'Goods', value: goodsRides },
        ]);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      'Date,Revenue,Rides',
      ...revenueData.map(d => `${d.date},${d.revenue},${d.rides}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))'];

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
            <h1 className="text-3xl font-bold text-foreground">Revenue Reports</h1>
            <p className="text-muted-foreground">Analytics and insights for your business</p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Period Tabs */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as 'week' | 'month')} className="mb-6">
          <TabsList>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-5 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Total Revenue</span>
            </div>
            <div className="text-3xl font-bold text-foreground">₹{stats.totalRevenue.toLocaleString()}</div>
          </div>

          <div className="bg-gradient-card rounded-2xl border border-border/50 p-5 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Car className="w-5 h-5 text-secondary" />
              </div>
              <span className="text-sm text-muted-foreground">Total Rides</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{stats.totalRides}</div>
          </div>

          <div className="bg-gradient-card rounded-2xl border border-border/50 p-5 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-sm text-muted-foreground">Avg. Fare</span>
            </div>
            <div className="text-3xl font-bold text-foreground">₹{stats.avgFare}</div>
          </div>

          <div className="bg-gradient-card rounded-2xl border border-border/50 p-5 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-sm text-muted-foreground">Completion Rate</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{stats.completionRate}%</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-gradient-card rounded-2xl border border-border/50 p-5 shadow-card">
            <h3 className="text-lg font-bold text-foreground mb-4">Revenue Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`₹${value}`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ride Type Distribution */}
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-5 shadow-card">
            <h3 className="text-lg font-bold text-foreground mb-4">Ride Types</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rideTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {rideTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Rides per Day Chart */}
        <div className="bg-gradient-card rounded-2xl border border-border/50 p-5 shadow-card">
          <h3 className="text-lg font-bold text-foreground mb-4">Rides per Day</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="rides" 
                  fill="hsl(var(--secondary))" 
                  radius={[4, 4, 0, 0]}
                  name="Rides"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
