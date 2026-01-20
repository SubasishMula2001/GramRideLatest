import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  IndianRupee, 
  TrendingUp, 
  Calendar, 
  Car, 
  Star,
  Loader2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek, startOfMonth, endOfDay } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

interface EarningsData {
  date: string;
  earnings: number;
  rides: number;
}

interface DriverStats {
  totalEarnings: number;
  totalRides: number;
  avgRating: number;
  avgFarePerRide: number;
  totalDistance: number;
  onlineHours: number;
}

const DriverAnalytics = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DriverStats>({
    totalEarnings: 0,
    totalRides: 0,
    avgRating: 5.0,
    avgFarePerRide: 0,
    totalDistance: 0,
    onlineHours: 0,
  });
  const [chartData, setChartData] = useState<EarningsData[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    
    if (user) {
      fetchDriverId();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (driverId) {
      fetchAnalytics();
    }
  }, [driverId, period]);

  const fetchDriverId = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('drivers')
      .select('id, rating')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setDriverId(data.id);
      setStats(prev => ({ ...prev, avgRating: data.rating || 5.0 }));
    }
  };

  const fetchAnalytics = async () => {
    if (!driverId) return;

    setLoading(true);
    try {
      const now = new Date();
      const startDate = period === 'week' 
        ? startOfWeek(now)
        : startOfMonth(now);

      // Fetch rides for the period
      const { data: rides } = await supabase
        .from('rides')
        .select('fare, distance_km, created_at, status')
        .eq('driver_id', driverId)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endOfDay(now).toISOString());

      if (rides) {
        const totalEarnings = rides.reduce((sum, r) => sum + (r.fare || 0), 0);
        const totalDistance = rides.reduce((sum, r) => sum + (r.distance_km || 0), 0);
        const avgFare = rides.length > 0 ? totalEarnings / rides.length : 0;

        setStats(prev => ({
          ...prev,
          totalEarnings,
          totalRides: rides.length,
          avgFarePerRide: Math.round(avgFare),
          totalDistance: Math.round(totalDistance * 10) / 10,
        }));

        // Group by date for chart
        const groupedData: { [key: string]: EarningsData } = {};
        const days = period === 'week' ? 7 : 30;
        
        for (let i = 0; i < days; i++) {
          const date = format(subDays(now, days - 1 - i), 'MMM d');
          groupedData[date] = { date, earnings: 0, rides: 0 };
        }

        rides.forEach(ride => {
          const date = format(new Date(ride.created_at), 'MMM d');
          if (groupedData[date]) {
            groupedData[date].earnings += ride.fare || 0;
            groupedData[date].rides += 1;
          }
        });

        setChartData(Object.values(groupedData));
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero pt-16">
      <main className="pt-8 pb-12 px-4">
        <div className="container mx-auto max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Earnings Analytics</h1>
          </div>

          {/* Period Tabs */}
          <Tabs value={period} onValueChange={(v) => setPeriod(v as 'week' | 'month')} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-card rounded-2xl border border-border/50 p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <IndianRupee className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Earnings</span>
              </div>
              <div className="text-2xl font-bold text-foreground">₹{stats.totalEarnings.toLocaleString()}</div>
            </div>

            <div className="bg-gradient-card rounded-2xl border border-border/50 p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-5 h-5 text-secondary" />
                <span className="text-sm text-muted-foreground">Total Rides</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.totalRides}</div>
            </div>

            <div className="bg-gradient-card rounded-2xl border border-border/50 p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Avg. per Ride</span>
              </div>
              <div className="text-2xl font-bold text-foreground">₹{stats.avgFarePerRide}</div>
            </div>

            <div className="bg-gradient-card rounded-2xl border border-border/50 p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Rating</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.avgRating.toFixed(1)}</div>
            </div>
          </div>

          {/* Earnings Chart */}
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-5 shadow-card mb-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Earnings Trend
            </h3>
            
            {chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`₹${value}`, 'Earnings']}
                    />
                    <Bar 
                      dataKey="earnings" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data for this period
              </div>
            )}
          </div>

          {/* Rides Chart */}
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-5 shadow-card">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Car className="w-5 h-5 text-secondary" />
              Rides per Day
            </h3>
            
            {chartData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [value, 'Rides']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rides" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--secondary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No data for this period
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default DriverAnalytics;
