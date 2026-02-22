import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VehicleType {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  image_url: string | null;
  base_fare: number;
  per_km_rate: number;
  is_active: boolean;
  sort_order: number;
}

const AdminVehicles = () => {
  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleType | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    image_url: '',
    base_fare: 0,
    per_km_rate: 0,
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_types' as any)
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setVehicles((data as unknown as VehicleType[]) || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (vehicle?: VehicleType) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        name: vehicle.name,
        display_name: vehicle.display_name,
        description: vehicle.description || '',
        image_url: vehicle.image_url || '',
        base_fare: vehicle.base_fare,
        per_km_rate: vehicle.per_km_rate,
        is_active: vehicle.is_active,
        sort_order: vehicle.sort_order,
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        name: '',
        display_name: '',
        description: '',
        image_url: '',
        base_fare: 0,
        per_km_rate: 0,
        is_active: true,
        sort_order: vehicles.length,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingVehicle(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `vehicle-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.name.trim() || !formData.display_name.trim()) {
      toast.error('Name and Display Name are required');
      return;
    }

    if (formData.base_fare < 0 || formData.per_km_rate < 0) {
      toast.error('Fare rates cannot be negative');
      return;
    }

    setSaving(true);
    try {
      const vehicleData = {
        name: formData.name.toLowerCase().trim(),
        display_name: formData.display_name.trim(),
        description: formData.description.trim() || null,
        image_url: formData.image_url.trim() || null,
        base_fare: formData.base_fare,
        per_km_rate: formData.per_km_rate,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      };

      if (editingVehicle) {
        const { error } = await supabase
          .from('vehicle_types' as any)
          .update(vehicleData)
          .eq('id', editingVehicle.id);

        if (error) throw error;
        toast.success('Vehicle updated successfully');
      } else {
        const { error } = await supabase
          .from('vehicle_types' as any)
          .insert(vehicleData);

        if (error) throw error;
        toast.success('Vehicle added successfully');
      }

      await fetchVehicles();
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      if (error.code === '23505') {
        toast.error('A vehicle with this name already exists');
      } else {
        toast.error('Failed to save vehicle');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingVehicleId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('vehicle_types' as any)
        .delete()
        .eq('id', deletingVehicleId);

      if (error) throw error;

      toast.success('Vehicle deleted successfully');
      await fetchVehicles();
      setShowDeleteDialog(false);
      setDeletingVehicleId(null);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (vehicleId: string) => {
    setDeletingVehicleId(vehicleId);
    setShowDeleteDialog(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Vehicle Management</h1>
            <p className="text-muted-foreground mt-1">Manage vehicle types and their pricing</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Vehicle
          </Button>
        </div>

        {/* Vehicle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-card rounded-xl border-2 border-border shadow-soft overflow-hidden"
            >
              {/* Vehicle Image */}
              <div className="h-48 bg-muted flex items-center justify-center relative">
                {vehicle.image_url ? (
                  <img
                    src={vehicle.image_url}
                    alt={vehicle.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-16 h-16 text-muted-foreground" />
                )}
                {!vehicle.is_active && (
                  <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-xs font-bold">
                    Inactive
                  </div>
                )}
              </div>

              {/* Vehicle Details */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{vehicle.display_name}</h3>
                  <p className="text-sm text-muted-foreground">ID: {vehicle.name}</p>
                </div>

                {vehicle.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {vehicle.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Base Fare</p>
                    <p className="font-bold text-foreground">₹{vehicle.base_fare}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Per KM</p>
                    <p className="font-bold text-foreground">₹{vehicle.per_km_rate}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => handleOpenDialog(vehicle)}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => openDeleteDialog(vehicle.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {vehicles.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">No vehicles yet</h3>
            <p className="text-muted-foreground mb-4">Get started by adding your first vehicle type</p>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </DialogTitle>
            <DialogDescription>
              {editingVehicle
                ? 'Update vehicle type details and pricing'
                : 'Add a new vehicle type with image and pricing'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Vehicle Image
              </label>
              <div className="flex items-center gap-4">
                {formData.image_url && (
                  <div className="w-32 h-32 rounded-lg border-2 border-border overflow-hidden">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <label htmlFor="image-upload">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 cursor-pointer"
                      disabled={uploading}
                      asChild
                    >
                      <span>
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload Image
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: 800x600px, max 2MB
                  </p>
                </div>
              </div>
            </div>

            {/* Name (ID) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Vehicle Name (ID) *
              </label>
              <Input
                placeholder="e.g., toto, auto, van"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={!!editingVehicle}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Unique identifier, lowercase, no spaces
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Display Name *
              </label>
              <Input
                placeholder="e.g., Toto (Electric Rickshaw)"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <Textarea
                placeholder="Brief description of the vehicle type"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Base Fare (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_fare}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_fare: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Per KM Rate (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.per_km_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, per_km_rate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Sort Order
              </label>
              <Input
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower numbers appear first
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Active Status
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Inactive vehicles won't be available for selection
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : editingVehicle ? (
                'Update Vehicle'
              ) : (
                'Add Vehicle'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this vehicle type. Existing drivers with this vehicle type may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminVehicles;
