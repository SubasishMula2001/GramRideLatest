import React, { useState } from 'react';
import { Search, Filter, Download, Activity, User, Car, Shield, AlertTriangle } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';

const logs = [
  { 
    id: 'L001',
    timestamp: '2024-03-15 14:32:45',
    type: 'Login',
    user: 'Ramesh Kumar',
    userType: 'User',
    action: 'Logged in successfully',
    ip: '192.168.1.45',
    device: 'Android 13 - Chrome',
    location: 'Rampur, West Bengal',
    status: 'Success'
  },
  { 
    id: 'L002',
    timestamp: '2024-03-15 14:30:12',
    type: 'Ride',
    user: 'Suresh Mahato',
    userType: 'Driver',
    action: 'Accepted ride request R1234',
    ip: '192.168.1.78',
    device: 'Android 12 - App',
    location: 'Sundarpur, West Bengal',
    status: 'Success'
  },
  { 
    id: 'L003',
    timestamp: '2024-03-15 14:28:00',
    type: 'Payment',
    user: 'Priya Sharma',
    userType: 'User',
    action: 'Added ₹500 to wallet',
    ip: '192.168.2.12',
    device: 'iOS 17 - Safari',
    location: 'Krishnanagar, West Bengal',
    status: 'Success'
  },
  { 
    id: 'L004',
    timestamp: '2024-03-15 14:25:33',
    type: 'Login',
    user: 'Unknown',
    userType: 'User',
    action: 'Failed login attempt',
    ip: '103.45.67.89',
    device: 'Windows - Firefox',
    location: 'Unknown',
    status: 'Failed'
  },
  { 
    id: 'L005',
    timestamp: '2024-03-15 14:22:18',
    type: 'Admin',
    user: 'Admin',
    userType: 'Admin',
    action: 'Added new driver - Vijay Prasad',
    ip: '192.168.1.1',
    device: 'Windows - Chrome',
    location: 'Office, Kolkata',
    status: 'Success'
  },
  { 
    id: 'L006',
    timestamp: '2024-03-15 14:20:00',
    type: 'Ride',
    user: 'Mohan Lal',
    userType: 'Driver',
    action: 'Completed ride R1233',
    ip: '192.168.3.45',
    device: 'Android 11 - App',
    location: 'Rampur, West Bengal',
    status: 'Success'
  },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Login': return <User className="w-4 h-4" />;
    case 'Ride': return <Car className="w-4 h-4" />;
    case 'Admin': return <Shield className="w-4 h-4" />;
    case 'Payment': return <Activity className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Login': return 'bg-primary/10 text-primary';
    case 'Ride': return 'bg-secondary/10 text-secondary';
    case 'Admin': return 'bg-accent/10 text-accent';
    case 'Payment': return 'bg-purple-500/10 text-purple-500';
    default: return 'bg-muted text-muted-foreground';
  }
};

const columns = [
  { key: 'timestamp', header: 'Timestamp' },
  { 
    key: 'type', 
    header: 'Type',
    render: (item: typeof logs[0]) => (
      <Badge variant="secondary" className={getTypeColor(item.type)}>
        <span className="flex items-center gap-1">
          {getTypeIcon(item.type)}
          {item.type}
        </span>
      </Badge>
    )
  },
  { 
    key: 'user', 
    header: 'User',
    render: (item: typeof logs[0]) => (
      <div>
        <p className="font-medium text-foreground">{item.user}</p>
        <p className="text-xs text-muted-foreground">{item.userType}</p>
      </div>
    )
  },
  { key: 'action', header: 'Action' },
  { 
    key: 'ip', 
    header: 'IP Address',
    render: (item: typeof logs[0]) => (
      <code className="text-xs bg-muted px-2 py-1 rounded">{item.ip}</code>
    )
  },
  { key: 'device', header: 'Device' },
  { key: 'location', header: 'Location' },
  { 
    key: 'status', 
    header: 'Status',
    render: (item: typeof logs[0]) => (
      <Badge 
        variant={item.status === 'Success' ? 'default' : 'destructive'}
        className={item.status === 'Success' ? 'bg-primary/10 text-primary' : ''}
      >
        {item.status}
      </Badge>
    )
  },
];

const AdminLogs = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Activity Logs</h1>
            <p className="text-muted-foreground">Monitor all system activities and user actions</p>
          </div>
          
          <Button variant="outline">
            <Download className="w-4 h-4" />
            Export Logs
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            {['all', 'Login', 'Ride', 'Payment', 'Admin'].map((type) => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type)}
              >
                {type === 'all' ? 'All' : type}
              </Button>
            ))}
          </div>
          
          <Button variant="outline">
            <Filter className="w-4 h-4" />
            More Filters
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Today's Events</p>
            <p className="text-2xl font-bold text-foreground">1,234</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Login Attempts</p>
            <p className="text-2xl font-bold text-primary">456</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Ride Events</p>
            <p className="text-2xl font-bold text-secondary">678</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            <div>
              <p className="text-sm text-muted-foreground">Failed Events</p>
              <p className="text-2xl font-bold text-destructive">12</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <DataTable columns={columns} data={logs} />
      </main>
    </div>
  );
};

export default AdminLogs;
