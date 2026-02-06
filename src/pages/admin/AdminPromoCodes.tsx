import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Loader2, Tag, Percent, Calendar, Users, Copy, CheckCircle } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_fare: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminPromoCodes = () => {
  const { loading: authLoading } = useAuth();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_fare: '0',
    max_discount: '',
    usage_limit: '',
    valid_until: '',
    is_active: true,
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes((data || []) as PromoCode[]);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast.error('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_fare: '0',
      max_discount: '',
      usage_limit: '',
      valid_until: '',
      is_active: true,
    });
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'GRAM';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const handleAddPromo = async () => {
    if (!formData.code || !formData.discount_value) {
      toast.error('Code and discount value are required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('promo_codes').insert({
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_fare: parseFloat(formData.min_fare) || 0,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        valid_until: formData.valid_until || null,
        is_active: formData.is_active,
      });

      if (error) throw error;

      toast.success('Promo code created successfully');
      setIsAddDialogOpen(false);
      resetForm();
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error creating promo code:', error);
      toast.error(error.message || 'Failed to create promo code');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPromo = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value.toString(),
      min_fare: promo.min_fare.toString(),
      max_discount: promo.max_discount?.toString() || '',
      usage_limit: promo.usage_limit?.toString() || '',
      valid_until: promo.valid_until ? promo.valid_until.split('T')[0] : '',
      is_active: promo.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPromo) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({
          code: formData.code.toUpperCase(),
          description: formData.description || null,
          discount_type: formData.discount_type,
          discount_value: parseFloat(formData.discount_value),
          min_fare: parseFloat(formData.min_fare) || 0,
          max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
          usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
          valid_until: formData.valid_until || null,
          is_active: formData.is_active,
        })
        .eq('id', editingPromo.id);

      if (error) throw error;

      toast.success('Promo code updated successfully');
      setIsEditDialogOpen(false);
      setEditingPromo(null);
      resetForm();
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error updating promo code:', error);
      toast.error(error.message || 'Failed to update promo code');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePromo = async (id: string) => {
    try {
      const { error } = await supabase.from('promo_codes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Promo code deleted');
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error deleting promo code:', error);
      toast.error(error.message || 'Failed to delete promo code');
    }
  };

  const handleToggleActive = async (promo: PromoCode) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !promo.is_active })
        .eq('id', promo.id);

      if (error) throw error;
      toast.success(promo.is_active ? 'Promo code deactivated' : 'Promo code activated');
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error toggling promo code:', error);
      toast.error('Failed to update promo code');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredPromoCodes = promoCodes.filter(p =>
    p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: 'code',
      header: 'Code',
      render: (item: PromoCode) => (
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded">
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-primary">{item.code}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyCode(item.code)}
              >
                {copiedCode === item.code ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{item.description || '--'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (item: PromoCode) => (
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="font-mono">
            {item.discount_type === 'percentage' ? (
              <>{item.discount_value}%</>
            ) : (
              <>₹{item.discount_value}</>
            )}
          </Badge>
          {item.max_discount && (
            <span className="text-xs text-muted-foreground">
              (max ₹{item.max_discount})
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (item: PromoCode) => (
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{item.used_count}</span>
          <span className="text-muted-foreground">
            / {item.usage_limit || '∞'}
          </span>
        </div>
      ),
    },
    {
      key: 'validity',
      header: 'Valid Until',
      render: (item: PromoCode) => (
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            {item.valid_until
              ? new Date(item.valid_until).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'No expiry'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: PromoCode) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={item.is_active}
            onCheckedChange={() => handleToggleActive(item)}
          />
          <Badge variant={item.is_active ? 'default' : 'secondary'}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: PromoCode) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEditPromo(item)}>
            <Edit className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Promo Code?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the promo code "{item.code}". This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeletePromo(item.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  const PromoFormContent = () => (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="code">Promo Code *</Label>
        <div className="flex gap-2">
          <Input
            id="code"
            placeholder="e.g., FIRST50"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
            className="font-mono"
          />
          <Button type="button" variant="outline" onClick={generateRandomCode}>
            Generate
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="e.g., 50% off on first ride"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discount_type">Discount Type *</Label>
          <Select
            value={formData.discount_type}
            onValueChange={(value: 'percentage' | 'fixed') => setFormData(prev => ({ ...prev, discount_type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount_value">
            Discount Value * {formData.discount_type === 'percentage' ? '(%)' : '(₹)'}
          </Label>
          <Input
            id="discount_value"
            type="number"
            placeholder={formData.discount_type === 'percentage' ? 'e.g., 50' : 'e.g., 100'}
            value={formData.discount_value}
            onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="min_fare">Minimum Fare (₹)</Label>
          <Input
            id="min_fare"
            type="number"
            placeholder="0"
            value={formData.min_fare}
            onChange={(e) => setFormData(prev => ({ ...prev, min_fare: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_discount">Max Discount (₹)</Label>
          <Input
            id="max_discount"
            type="number"
            placeholder="No limit"
            value={formData.max_discount}
            onChange={(e) => setFormData(prev => ({ ...prev, max_discount: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="usage_limit">Usage Limit</Label>
          <Input
            id="usage_limit"
            type="number"
            placeholder="Unlimited"
            value={formData.usage_limit}
            onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valid_until">Valid Until</Label>
          <Input
            id="valid_until"
            type="date"
            value={formData.valid_until}
            onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>
    </div>
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeCount = promoCodes.filter(p => p.is_active).length;
  const totalUsage = promoCodes.reduce((sum, p) => sum + p.used_count, 0);

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Tag className="h-8 w-8 text-primary" />
              Promo Codes
            </h1>
            <p className="text-muted-foreground">Create and manage discount codes</p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" onClick={resetForm}>
                <Plus className="w-4 h-4" />
                Create Promo Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Promo Code</DialogTitle>
                <DialogDescription>
                  Create a new discount code for your customers
                </DialogDescription>
              </DialogHeader>
              <PromoFormContent />
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="hero" className="flex-1" onClick={handleAddPromo} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Promo Code</DialogTitle>
              <DialogDescription>Update promo code details</DialogDescription>
            </DialogHeader>
            <PromoFormContent />
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="hero" className="flex-1" onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Total Codes</p>
            <p className="text-2xl font-bold text-foreground">{promoCodes.length}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Active Codes</p>
            <p className="text-2xl font-bold text-primary">{activeCount}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Total Redemptions</p>
            <p className="text-2xl font-bold text-secondary">{totalUsage}</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search promo codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        {filteredPromoCodes.length > 0 ? (
          <DataTable columns={columns} data={filteredPromoCodes} />
        ) : (
          <div className="bg-gradient-card rounded-xl border border-border/50 p-12 text-center">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No promo codes found</p>
            <Button variant="hero" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Create Your First Promo Code
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPromoCodes;
