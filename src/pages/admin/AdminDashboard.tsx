import React from 'react';
import { Users, Car, Activity, IndianRupee, TrendingUp, TrendingDown } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminStatsCard from '@/components/AdminStatsCard';
import DataTable from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';

const recentRides = [
  { id: 'R001', user: 'Ramesh K.', driver: 'Suresh M.', type: 'Passenger', status: 'Completed', fare: 45, date: '10 min ago' },
  { id: 'R002', user: 'Priya S.', driver: 'Mohan L.', type: 'Goods', status: 'In Progress', fare: 80, date: '15 min ago' },
  { id: 'R003', user: 'Amit R.', driver: 'Raju K.', type: 'Passenger', status: 'Completed', fare: 35, date: '25 min ago' },
  { id: 'R004', user: 'Sunita D.', driver: 'Vijay P.', type: 'Passenger', status: 'Cancelled', fare: 0, date: '30 min ago' },
  { id: 'R005', user: 'Raj M.', driver: 'Kumar S.', type: 'Goods', status: 'Completed', fare: 120, date: '45 min ago' },
];

const columns = [
  { key: 'id', header: 'Ride ID' },
  { key: 'user', header: 'User' },
  { key: 'driver', header: 'Driver' },
  { 
    key: 'type', 
    header: 'Type',
    render: (item: typeof recentRides[0]) => (
      <Badge variant={item.type === 'Passenger' ? 'default' : 'secondary'}>
        {item.type}
      </Badge>
    )
  },
  { 
    key: 'status', 
    header: 'Status',
    render: (item: typeof recentRides[0]) => (
      <Badge 
        variant={
          item.status === 'Completed' ? 'default' : 
          item.status === 'In Progress' ? 'secondary' : 
          'destructive'
        }
        className={
          item.status === 'Completed' ? 'bg-primary/10 text-primary hover:bg-primary/20' :
          item.status === 'In Progress' ? 'bg-secondary/10 text-secondary hover:bg-secondary/20' :
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
    render: (item: typeof recentRides[0]) => (
      <span className="font-medium">₹{item.fare}</span>
    )
  },
  { key: 'date', header: 'Time' },
];

const AdminDashboard = () => {
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
            value="2,847"
            change="+12% from last month"
            changeType="positive"
            icon={Users}
            iconBg="primary"
          />
          <AdminStatsCard
            title="Active Drivers"
            value="156"
            change="+8% from last month"
            changeType="positive"
            icon={Car}
            iconBg="secondary"
          />
          <AdminStatsCard
            title="Today's Rides"
            value="342"
            change="-5% from yesterday"
            changeType="negative"
            icon={Activity}
            iconBg="accent"
          />
          <AdminStatsCard
            title="Today's Revenue"
            value="₹15,240"
            change="+18% from yesterday"
            changeType="positive"
            icon={IndianRupee}
            iconBg="primary"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart Placeholder */}
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card">
            <h3 className="text-lg font-bold text-foreground mb-4">Revenue Overview</h3>
            <div className="h-64 flex items-center justify-center bg-muted/30 rounded-xl">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">Revenue chart coming soon</p>
              </div>
            </div>
          </div>

          {/* Rides Chart Placeholder */}
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card">
            <h3 className="text-lg font-bold text-foreground mb-4">Rides by Type</h3>
            <div className="h-64 flex items-center justify-center bg-muted/30 rounded-xl">
              <div className="text-center">
                <Activity className="w-12 h-12 text-secondary mx-auto mb-2" />
                <p className="text-muted-foreground">Rides chart coming soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Rides Table */}
        <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Recent Rides</h3>
            <button className="text-sm font-medium text-primary hover:underline">
              View All
            </button>
          </div>
          
          <DataTable columns={columns} data={recentRides} />
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
