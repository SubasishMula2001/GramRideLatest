import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2, Wallet, IndianRupee, CheckCircle, Clock, AlertCircle, Ban } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Driver {
  id: string;
  user_id: string;
  vehicle_number: string;
  earnings?: number;
  profile?: {
    full_name: string | null;
    phone: string | null;
  };
}

interface Payout {
  id: string;
  driver_id: string;
  amount: number;
  payout_method: string;
  status: string;
  reference_number: string | null;
  notes: string | null;
  period_start: string | null;
  period_end: string | null;
  processed_at: string | null;
  created_at: string;
  driver?: Driver;
}

const AdminPayouts = () => {
  const { user, loading: authLoading } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    driver_id: '',
    amount: '',
    payout_method: 'upi' as 'bank_transfer' | 'upi' | 'cash',
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    fetchPayouts();
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data: driversData, error } = await supabase
        .from('drivers')
        .select('id, user_id, vehicle_number, earnings')
        .eq('is_verified', true);

      if (error) throw error;

      // Fetch profiles for drivers
      const driverIds = (driversData || []).map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', driverIds);

      const driversWithProfiles = (driversData || []).map(driver => ({
        ...driver,
        profile: profiles?.find(p => p.id === driver.user_id) || null,
      }));

      setDrivers(driversWithProfiles as Driver[]);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const fetchPayouts = async () => {
    try {
      const { data: payoutsData, error } = await supabase
        .from('driver_payouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch driver details
      const driverIds = [...new Set((payoutsData || []).map(p => p.driver_id))];
      
      if (driverIds.length > 0) {
        const { data: driversData } = await supabase
          .from('drivers')
          .select('id, user_id, vehicle_number')
          .in('id', driverIds);

        const userIds = (driversData || []).map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', userIds);

        const payoutsWithDrivers = (payoutsData || []).map(payout => {
          const driver = driversData?.find(d => d.id === payout.driver_id);
          const profile = driver ? profiles?.find(p => p.id === driver.user_id) : null;
          return {
            ...payout,
            driver: driver ? { ...driver, profile } : undefined,
          };
        });

        setPayouts(payoutsWithDrivers);
      } else {
        setPayouts((payoutsData || []) as Payout[]);
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayout = async () => {
    if (!formData.driver_id || !formData.amount) {
      toast.error('Driver and amount are required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('driver_payouts').insert({
        driver_id: formData.driver_id,
        amount: parseFloat(formData.amount),
        payout_method: formData.payout_method,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Payout created successfully');
      setIsAddDialogOpen(false);
      setFormData({
        driver_id: '',
        amount: '',
        payout_method: 'upi',
        reference_number: '',
        notes: '',
      });
      fetchPayouts();
    } catch (error: any) {
      console.error('Error creating payout:', error);
      toast.error(error.message || 'Failed to create payout');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (payoutId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.processed_at = new Date().toISOString();
        updateData.processed_by = user?.id;
      }

      const { error } = await supabase
        .from('driver_payouts')
        .update(updateData)
        .eq('id', payoutId);

      if (error) throw error;

      toast.success(`Payout marked as ${newStatus}`);
      fetchPayouts();
    } catch (error: any) {
      console.error('Error updating payout:', error);
      toast.error('Failed to update payout');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="flex items-center gap-1 text-yellow-600"><Loader2 className="w-3 h-3 animate-spin" /> Processing</Badge>;
      case 'completed':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-500"><CheckCircle className="w-3 h-3" /> Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1"><Ban className="w-3 h-3" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredPayouts = payouts.filter(p => {
    const matchesSearch = p.driver?.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: 'driver',
      header: 'Driver',
      render: (item: Payout) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{item.driver?.profile?.full_name || 'Unknown Driver'}</p>
            <p className="text-sm text-muted-foreground">{item.driver?.vehicle_number}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: Payout) => (
        <div className="flex items-center gap-1 font-bold text-secondary">
          <IndianRupee className="w-4 h-4" />
          {item.amount.toLocaleString('en-IN')}
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (item: Payout) => (
        <Badge variant="outline" className="capitalize">
          {item.payout_method.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (item: Payout) => (
        <span className="font-mono text-sm">{item.reference_number || '--'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Payout) => getStatusBadge(item.status),
    },
    {
      key: 'date',
      header: 'Date',
      render: (item: Payout) => (
        <span className="text-sm">
          {new Date(item.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Payout) => (
        <div className="flex items-center gap-2">
          {item.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateStatus(item.id, 'processing')}
              >
                Process
              </Button>
              <Button
                size="sm"
                variant="default"
                className="bg-green-500 hover:bg-green-600"
                onClick={() => handleUpdateStatus(item.id, 'completed')}
              >
                Complete
              </Button>
            </>
          )}
          {item.status === 'processing' && (
            <>
              <Button
                size="sm"
                variant="default"
                className="bg-green-500 hover:bg-green-600"
                onClick={() => handleUpdateStatus(item.id, 'completed')}
              >
                Mark Completed
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleUpdateStatus(item.id, 'failed')}
              >
                Mark Failed
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingAmount = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);
  const completedAmount = payouts
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Wallet className="h-8 w-8 text-primary" />
              Driver Payouts
            </h1>
            <p className="text-muted-foreground">Manage driver earnings and payouts</p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4" />
                Create Payout
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Payout</DialogTitle>
                <DialogDescription>
                  Create a payout record for a driver
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="driver">Driver *</Label>
                  <Select
                    value={formData.driver_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, driver_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{driver.profile?.full_name || 'Unknown'}</span>
                            <span className="text-muted-foreground ml-2">
                              (₹{driver.earnings?.toLocaleString('en-IN') || 0})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">Payout Method</Label>
                  <Select
                    value={formData.payout_method}
                    onValueChange={(value: 'bank_transfer' | 'upi' | 'cash') => 
                      setFormData(prev => ({ ...prev, payout_method: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Reference Number</Label>
                  <Input
                    id="reference"
                    placeholder="Transaction ID or reference"
                    value={formData.reference_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="hero" className="flex-1" onClick={handleCreatePayout} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Payout'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Total Payouts</p>
            <p className="text-2xl font-bold text-foreground">{payouts.length}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Pending Amount</p>
            <p className="text-2xl font-bold text-yellow-500">₹{pendingAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Completed Amount</p>
            <p className="text-2xl font-bold text-green-500">₹{completedAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Active Drivers</p>
            <p className="text-2xl font-bold text-primary">{drivers.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by driver name or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredPayouts.length > 0 ? (
          <DataTable columns={columns} data={filteredPayouts} />
        ) : (
          <div className="bg-gradient-card rounded-xl border border-border/50 p-12 text-center">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No payouts found</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPayouts;
