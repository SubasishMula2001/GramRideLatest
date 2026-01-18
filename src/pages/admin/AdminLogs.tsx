import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Activity, User, Car, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LogData {
  id: string;
  timestamp: string;
  type: string;
  user_name: string;
  action: string;
  ip_address: string | null;
  device_info: string | null;
  details: any;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Login': return <User className="w-4 h-4" />;
    case 'Ride': return <Car className="w-4 h-4" />;
    case 'Admin': return <Shield className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Login': return 'bg-primary/10 text-primary';
    case 'Ride': return 'bg-secondary/10 text-secondary';
    case 'Admin': return 'bg-accent/10 text-accent';
    default: return 'bg-muted text-muted-foreground';
  }
};

const AdminLogs = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (!authLoading) {
      if (!user || userRole !== 'admin') {
        navigate('/login');
        return;
      }
      fetchLogs();
    }
  }, [user, userRole, authLoading]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id,
          action,
          details,
          ip_address,
          device_info,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const userIds = Array.from(
        new Set((data || []).map((l: any) => l.user_id).filter(Boolean))
      ) as string[];

      const profilesResult = userIds.length
        ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
        : { data: [], error: null };

      const profiles = profilesResult.data as any[];
      const profilesError = profilesResult.error;

      if (profilesError) {
        console.error('Error fetching log user profiles:', profilesError);
      }

      const nameByUserId = new Map<string, string>(
        (profiles || []).map((p: any) => [p.id, p.full_name || 'System'])
      );

      const formattedLogs = (data || []).map((log: any) => {
        // Determine type from action
        let type = 'Activity';
        if (log.action.toLowerCase().includes('login') || log.action.toLowerCase().includes('logout')) {
          type = 'Login';
        } else if (log.action.toLowerCase().includes('ride') || log.action.toLowerCase().includes('booking')) {
          type = 'Ride';
        } else if (log.action.toLowerCase().includes('admin') || log.action.toLowerCase().includes('driver')) {
          type = 'Admin';
        }

        return {
          id: log.id,
          timestamp: new Date(log.created_at).toLocaleString('en-IN'),
          type,
          user_name: (log.user_id && nameByUserId.get(log.user_id)) || 'System',
          action: log.action,
          ip_address: log.ip_address,
          device_info: log.device_info,
          details: log.details
        };
      });

      setLogs(formattedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = logs.map(log => 
      `${log.timestamp},${log.type},${log.user_name},${log.action},${log.ip_address || ''},${log.device_info || ''}`
    ).join('\n');
    
    const blob = new Blob([`Timestamp,Type,User,Action,IP,Device\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gramride-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Logs exported successfully');
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || log.type === filterType;
    return matchesSearch && matchesType;
  });

  const columns = [
    { key: 'timestamp', header: 'Timestamp' },
    { 
      key: 'type', 
      header: 'Type',
      render: (item: LogData) => (
        <Badge variant="secondary" className={getTypeColor(item.type)}>
          <span className="flex items-center gap-1">
            {getTypeIcon(item.type)}
            {item.type}
          </span>
        </Badge>
      )
    },
    { 
      key: 'user_name', 
      header: 'User',
      render: (item: LogData) => (
        <p className="font-medium text-foreground">{item.user_name}</p>
      )
    },
    { key: 'action', header: 'Action' },
    { 
      key: 'ip_address', 
      header: 'IP Address',
      render: (item: LogData) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">{item.ip_address || '--'}</code>
      )
    },
    { 
      key: 'device_info', 
      header: 'Device',
      render: (item: LogData) => item.device_info || '--'
    },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const todayLogs = logs.filter(l => 
    new Date(l.timestamp).toDateString() === new Date().toDateString()
  ).length;
  const loginLogs = logs.filter(l => l.type === 'Login').length;
  const rideLogs = logs.filter(l => l.type === 'Ride').length;

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Activity Logs</h1>
            <p className="text-muted-foreground">Monitor all system activities and user actions</p>
          </div>
          
          <Button variant="outline" onClick={handleExport}>
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
            {['all', 'Login', 'Ride', 'Admin', 'Activity'].map((type) => (
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Total Logs</p>
            <p className="text-2xl font-bold text-foreground">{logs.length}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Today's Events</p>
            <p className="text-2xl font-bold text-primary">{todayLogs}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Login Events</p>
            <p className="text-2xl font-bold text-secondary">{loginLogs}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Ride Events</p>
            <p className="text-2xl font-bold text-accent">{rideLogs}</p>
          </div>
        </div>

        {/* Table */}
        {filteredLogs.length > 0 ? (
          <DataTable columns={columns} data={filteredLogs} />
        ) : (
          <div className="bg-gradient-card rounded-xl border border-border/50 p-12 text-center">
            <p className="text-muted-foreground">No logs found</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminLogs;
