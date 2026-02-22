import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, MapPin, DollarSign, TrendingUp, Clock } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Zone {
  id: string;
  name: string;
  description: string | null;
  boundary_points: { lat: number; lng: number }[];
  is_active: boolean;
  service_enabled: boolean;
  created_at: string;
}

interface ZonePricing {
  id: string;
  zone_id: string;
  vehicle_type_id: string;
  vehicle_display_name?: string;
  base_fare_multiplier: number;
  per_km_multiplier: number;
  is_active: boolean;
}

interface ZoneSurge {
  id: string;
  zone_id: string;
  surge_multiplier: number;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  is_active: boolean;
  reason: string | null;
}

interface VehicleType {
  id: string;
  name: string;
  display_name: string;
}

const AdminZones = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [zones, setZones] = useState<Zone[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [isSurgeDialogOpen, setIsSurgeDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [zonePricing, setZonePricing] = useState<ZonePricing[]>([]);
  const [zoneSurges, setZoneSurges] = useState<ZoneSurge[]>([]);
  const [saving, setSaving] = useState(false);

  const [zoneForm, setZoneForm] = useState({
    name: '',
    description: '',
    is_active: true,
    service_enabled: true
  });

  useEffect(() => {
    if (!authLoading && user && userRole === 'admin') {
      fetchZones();
      fetchVehicleTypes();
    }
  }, [user, userRole, authLoading]);

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from('zones' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
      toast.error('Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_types' as any)
        .select('id, name, display_name')
        .eq('is_active', true);

      if (error) throw error;
      setVehicleTypes(data || []);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
    }
  };

  const fetchZonePricing = async (zoneId: string) => {
    try {
      const { data, error } = await supabase
        .from('zone_pricing' as any)
        .select(`
          *,
          vehicle_type:vehicle_types(display_name)
        `)
        .eq('zone_id', zoneId);

      if (error) throw error;
      
      const formatted = (data || []).map((item: any) => ({
        ...item,
        vehicle_display_name: item.vehicle_type?.display_name
      }));
      
      setZonePricing(formatted);
    } catch (error) {
      console.error('Error fetching zone pricing:', error);
    }
  };

  const fetchZoneSurges = async (zoneId: string) => {
    try {
      const { data, error } = await supabase
        .from('zone_surge_pricing' as any)
        .select('*')
        .eq('zone_id', zoneId)
        .order('start_time');

      if (error) throw error;
      setZoneSurges(data || []);
    } catch (error) {
      console.error('Error fetching zone surges:', error);
    }
  };

  const handleAddZone = async () => {
    if (!zoneForm.name) {
      toast.error('Zone name is required');
      return;
    }

    setSaving(true);
    try {
      // Default boundary points (to be customized later with map interface)
      const defaultBoundary = [
        { lat: 22.5726, lng: 88.3639 },
        { lat: 22.5826, lng: 88.3639 },
        { lat: 22.5826, lng: 88.3739 },
        { lat: 22.5726, lng: 88.3739 }
      ];

      const { error } = await supabase
        .from('zones' as any)
        .insert({
          name: zoneForm.name,
          description: zoneForm.description || null,
          boundary_points: defaultBoundary,
          is_active: zoneForm.is_active,
          service_enabled: zoneForm.service_enabled
        });

      if (error) throw error;

      toast.success('Zone created successfully');
      setIsAddDialogOpen(false);
      setZoneForm({ name: '', description: '', is_active: true, service_enabled: true });
      fetchZones();
    } catch (error: any) {
      console.error('Error creating zone:', error);
      toast.error(error.message || 'Failed to create zone');
    } finally {
      setSaving(false);
    }
  };

  const handleEditZone = async () => {
    if (!editingZone) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('zones' as any)
        .update({
          name: zoneForm.name,
          description: zoneForm.description || null,
          is_active: zoneForm.is_active,
          service_enabled: zoneForm.service_enabled
        })
        .eq('id', editingZone.id);

      if (error) throw error;

      toast.success('Zone updated successfully');
      setIsEditDialogOpen(false);
      setEditingZone(null);
      fetchZones();
    } catch (error: any) {
      console.error('Error updating zone:', error);
      toast.error(error.message || 'Failed to update zone');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm('Are you sure you want to delete this zone?')) return;

    try {
      const { error } = await supabase
        .from('zones' as any)
        .delete()
        .eq('id', zoneId);

      if (error) throw error;

      toast.success('Zone deleted successfully');
      fetchZones();
    } catch (error: any) {
      console.error('Error deleting zone:', error);
      toast.error(error.message || 'Failed to delete zone');
    }
  };

  const openEditDialog = (zone: Zone) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      description: zone.description || '',
      is_active: zone.is_active,
      service_enabled: zone.service_enabled
    });
    setIsEditDialogOpen(true);
  };

  const openPricingDialog = (zone: Zone) => {
    setSelectedZone(zone);
    fetchZonePricing(zone.id);
    setIsPricingDialogOpen(true);
  };

  const openSurgeDialog = (zone: Zone) => {
    setSelectedZone(zone);
    fetchZoneSurges(zone.id);
    setIsSurgeDialogOpen(true);
  };

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
            <h1 className="text-3xl font-bold text-foreground">Zone Management</h1>
            <p className="text-muted-foreground">Manage service areas and zone-specific pricing</p>
          </div>
          
          <Button variant="hero" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Zone
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Total Zones</p>
            <p className="text-2xl font-bold text-foreground">{zones.length}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Active Zones</p>
            <p className="text-2xl font-bold text-primary">{zones.filter(z => z.is_active).length}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Service Enabled</p>
            <p className="text-2xl font-bold text-green-600">{zones.filter(z => z.service_enabled).length}</p>
          </div>
        </div>

        {/* Zones List */}
        <div className="space-y-4">
          {zones.length === 0 ? (
            <div className="bg-gradient-card rounded-xl border border-border/50 p-12 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Zones Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first service zone to get started</p>
              <Button variant="hero" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Zone
              </Button>
            </div>
          ) : (
            zones.map((zone) => (
              <div key={zone.id} className="bg-gradient-card rounded-xl border border-border/50 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-foreground">{zone.name}</h3>
                      {zone.is_active ? (
                        <Badge variant="default" className="bg-primary/10 text-primary">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                      {zone.service_enabled ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-600">Service Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Service Disabled</Badge>
                      )}
                    </div>
                    {zone.description && (
                      <p className="text-muted-foreground text-sm mb-4">{zone.description}</p>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPricingDialog(zone)}
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Pricing Rules
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSurgeDialog(zone)}
                      >
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Surge Pricing
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(zone)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteZone(zone.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Zone Dialog */}
        <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          if (!open) {
            setZoneForm({ name: '', description: '', is_active: true, service_enabled: true });
            setEditingZone(null);
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingZone ? 'Edit Zone' : 'Add New Zone'}</DialogTitle>
              <DialogDescription>
                {editingZone ? 'Update zone information' : 'Create a new service zone'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="zone-name">Zone Name *</Label>
                <Input
                  id="zone-name"
                  placeholder="e.g., City Center, Village North"
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone-desc">Description</Label>
                <Input
                  id="zone-desc"
                  placeholder="Brief description of the zone"
                  value={zoneForm.description}
                  onChange={(e) => setZoneForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="zone-active">Active</Label>
                <Switch
                  id="zone-active"
                  checked={zoneForm.is_active}
                  onCheckedChange={(checked) => setZoneForm(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="zone-service">Service Enabled</Label>
                <Switch
                  id="zone-service"
                  checked={zoneForm.service_enabled}
                  onCheckedChange={(checked) => setZoneForm(prev => ({ ...prev, service_enabled: checked }))}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setIsEditDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="hero"
                  className="flex-1"
                  onClick={editingZone ? handleEditZone : handleAddZone}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingZone ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Pricing Rules Dialog */}
        <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Zone Pricing Rules - {selectedZone?.name}</DialogTitle>
              <DialogDescription>
                Configure vehicle-specific pricing multipliers for this zone
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Pricing rules coming soon - will allow setting custom multipliers per vehicle type
              </p>
              {zonePricing.length > 0 && (
                <div className="space-y-2">
                  {zonePricing.map((pricing) => (
                    <div key={pricing.id} className="p-3 border rounded-lg">
                      <p className="font-medium">{pricing.vehicle_display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Base: {pricing.base_fare_multiplier}x, Per KM: {pricing.per_km_multiplier}x
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Surge Pricing Dialog */}
        <Dialog open={isSurgeDialogOpen} onOpenChange={setIsSurgeDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Surge Pricing - {selectedZone?.name}</DialogTitle>
              <DialogDescription>
                Configure time-based surge pricing for this zone
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Surge pricing configuration coming soon - will allow setting custom surge multipliers by time
              </p>
              {zoneSurges.length > 0 && (
                <div className="space-y-2">
                  {zoneSurges.map((surge) => (
                    <div key={surge.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{surge.reason || 'Surge Period'}</p>
                          <p className="text-sm text-muted-foreground">
                            {surge.start_time} - {surge.end_time} ({surge.surge_multiplier}x)
                          </p>
                        </div>
                        <Badge variant={surge.is_active ? 'default' : 'secondary'}>
                          {surge.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminZones;
