import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Edit, Car, Star, CheckCircle, Loader2, Settings } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DriverData {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  vehicle_number: string;
  license_number: string | null;
  rating: number;
  total_rides: number;
  earnings: number;
  is_available: boolean;
  is_verified: boolean;
  created_at: string;
}

interface VehicleType {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
}

const AdminDrivers = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverData | null>(null);
  const [newDriver, setNewDriver] = useState({ 
    full_name: '', 
    email: '', 
    password: '',
    phone: '', 
    vehicle_number: '', 
    license_number: '' 
  });
  const [newDriverVehicles, setNewDriverVehicles] = useState<string[]>([]);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    vehicle_number: '',
    license_number: '',
    is_verified: false,
    is_available: false
  });
  const [addingDriver, setAddingDriver] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Vehicle management states
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [managingDriver, setManagingDriver] = useState<DriverData | null>(null);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [selectedDriverVehicles, setSelectedDriverVehicles] = useState<string[]>([]);
  const [savingVehicles, setSavingVehicles] = useState(false);

  useEffect(() => {
    // ProtectedRoute already handles auth and role checks
    // Only fetch data when auth is loaded and user has access
    if (!authLoading && user && userRole === 'admin') {
      fetchDrivers();
    }
  }, [user, userRole, authLoading]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          id,
          user_id,
          vehicle_number,
          license_number,
          rating,
          total_rides,
          earnings,
          is_available,
          is_verified,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = Array.from(new Set((data || []).map((d) => d.user_id)));
      const profilesResult = userIds.length
        ? await supabase.from('profiles').select('id, full_name, phone').in('id', userIds)
        : { data: [], error: null };

      const profiles = profilesResult.data as any[];
      const profilesError = profilesResult.error;

      if (profilesError) {
        console.error('Error fetching driver profiles:', profilesError);
      }

      const profileById = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));

      const formattedDrivers = (data || []).map((driver: any) => {
        const p = profileById.get(driver.user_id);
        return {
          id: driver.id,
          user_id: driver.user_id,
          full_name: p?.full_name || 'Unknown',
          phone: p?.phone || '--',
          vehicle_number: driver.vehicle_number,
          license_number: driver.license_number,
          rating: driver.rating || 5.0,
          total_rides: driver.total_rides || 0,
          earnings: driver.earnings || 0,
          is_available: driver.is_available,
          is_verified: driver.is_verified,
          created_at: new Date(driver.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        };
      });

      setDrivers(formattedDrivers);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDriver = async () => {
    if (!newDriver.email || !newDriver.password || !newDriver.vehicle_number) {
      toast.error('Email, password and vehicle number are required');
      return;
    }

    if (newDriverVehicles.length === 0) {
      toast.error('Please select at least one vehicle type');
      return;
    }

    setAddingDriver(true);
    try {
      const response = await supabase.functions.invoke('create-demo-user', {
        body: {
          email: newDriver.email,
          password: newDriver.password,
          fullName: newDriver.full_name,
          role: 'driver',
          vehicleNumber: newDriver.vehicle_number,
          licenseNumber: newDriver.license_number
        }
      });

      if (response.error) throw response.error;

      // Get the created driver's ID
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('vehicle_number', newDriver.vehicle_number.trim().toUpperCase())
        .single();

      if (driverError) throw driverError;

      // Insert vehicle assignments
      const vehicleInserts = newDriverVehicles.map((vehicleId, index) => ({
        driver_id: driverData.id,
        vehicle_type_id: vehicleId,
        is_primary: index === 0
      }));

      const { error: vehiclesError } = await supabase
        .from('driver_vehicles' as any)
        .insert(vehicleInserts);

      if (vehiclesError) {
        console.error('Error assigning vehicles:', vehiclesError);
      }

      toast.success('Driver added successfully');
      setIsAddDialogOpen(false);
      setNewDriver({ full_name: '', email: '', password: '', phone: '', vehicle_number: '', license_number: '' });
      setNewDriverVehicles([]);
      fetchDrivers();
    } catch (error: any) {
      console.error('Error adding driver:', error);
      toast.error(error.message || 'Failed to add driver');
    } finally {
      setAddingDriver(false);
    }
  };

  const handleEditDriver = (driverData: DriverData) => {
    setEditingDriver(driverData);
    setEditForm({
      full_name: driverData.full_name || '',
      phone: driverData.phone || '',
      vehicle_number: driverData.vehicle_number,
      license_number: driverData.license_number || '',
      is_verified: driverData.is_verified,
      is_available: driverData.is_available
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDriver) return;

    setSavingEdit(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name || null,
          phone: editForm.phone || null
        })
        .eq('id', editingDriver.user_id);

      if (profileError) throw profileError;

      // Update driver record
      const { error: driverError } = await supabase
        .from('drivers')
        .update({
          vehicle_number: editForm.vehicle_number,
          license_number: editForm.license_number || null,
          is_verified: editForm.is_verified,
          is_available: editForm.is_available
        })
        .eq('id', editingDriver.id);

      if (driverError) throw driverError;

      toast.success('Driver updated successfully');
      setIsEditDialogOpen(false);
      setEditingDriver(null);
      fetchDrivers();
    } catch (error: any) {
      console.error('Error updating driver:', error);
      toast.error(error.message || 'Failed to update driver');
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchVehicleTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_types' as any)
        .select('id, name, display_name, description')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setVehicleTypes(data || []);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
      toast.error('Failed to load vehicle types');
    }
  };

  const handleManageVehicles = async (driver: DriverData) => {
    setManagingDriver(driver);
    
    // Fetch available vehicle types if not already loaded
    if (vehicleTypes.length === 0) {
      await fetchVehicleTypes();
    }

    // Fetch driver's current vehicles
    try {
      const { data, error } = await supabase
        .from('driver_vehicles' as any)
        .select('vehicle_type_id')
        .eq('driver_id', driver.id);

      if (error) throw error;
      
      const vehicleIds = (data || []).map((v: any) => v.vehicle_type_id);
      setSelectedDriverVehicles(vehicleIds);
    } catch (error) {
      console.error('Error fetching driver vehicles:', error);
      setSelectedDriverVehicles([]);
    }

    setIsVehicleDialogOpen(true);
  };

  const toggleDriverVehicle = (vehicleId: string) => {
    setSelectedDriverVehicles(prev => {
      if (prev.includes(vehicleId)) {
        return prev.filter(id => id !== vehicleId);
      } else {
        return [...prev, vehicleId];
      }
    });
  };

  const handleSaveVehicles = async () => {
    if (!managingDriver) return;

    if (selectedDriverVehicles.length === 0) {
      toast.error('Please select at least one vehicle type');
      return;
    }

    setSavingVehicles(true);
    try {
      // Delete existing vehicle assignments
      const { error: deleteError } = await supabase
        .from('driver_vehicles' as any)
        .delete()
        .eq('driver_id', managingDriver.id);

      if (deleteError) throw deleteError;

      // Insert new vehicle assignments
      const insertData = selectedDriverVehicles.map((vehicleId, index) => ({
        driver_id: managingDriver.id,
        vehicle_type_id: vehicleId,
        is_primary: index === 0
      }));

      const { error: insertError } = await supabase
        .from('driver_vehicles' as any)
        .insert(insertData);

      if (insertError) throw insertError;

      toast.success('Vehicle assignments updated successfully');
      setIsVehicleDialogOpen(false);
      setManagingDriver(null);
    } catch (error: any) {
      console.error('Error saving vehicle assignments:', error);
      toast.error(error.message || 'Failed to update vehicle assignments');
    } finally {
      setSavingVehicles(false);
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.vehicle_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.phone?.includes(searchQuery)
  );

  const columns = [
    { 
      key: 'full_name', 
      header: 'Driver',
      render: (item: DriverData) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
            <Car className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{item.full_name}</p>
              {item.is_verified && (
                <CheckCircle className="w-4 h-4 text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{item.vehicle_number}</p>
          </div>
        </div>
      )
    },
    { key: 'phone', header: 'Phone' },
    { 
      key: 'rating', 
      header: 'Rating',
      render: (item: DriverData) => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-secondary fill-secondary" />
          <span className="font-medium">{item.rating.toFixed(1)}</span>
        </div>
      )
    },
    { key: 'total_rides', header: 'Rides' },
    { 
      key: 'earnings', 
      header: 'Earnings',
      render: (item: DriverData) => (
        <span className="font-medium">₹{item.earnings.toLocaleString()}</span>
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: DriverData) => (
        <Badge 
          variant={
            item.is_available ? 'default' : 
            !item.is_verified ? 'secondary' : 
            'outline'
          }
          className={
            item.is_available ? 'bg-primary/10 text-primary' :
            !item.is_verified ? 'bg-secondary/10 text-secondary' : ''
          }
        >
          {!item.is_verified ? 'Pending' : item.is_available ? 'Online' : 'Offline'}
        </Badge>
      )
    },
    { 
      key: 'actions', 
      header: '',
      render: (item: DriverData) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleManageVehicles(item)}
            title="Manage Vehicles"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleEditDriver(item)}
            title="Edit Driver"
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      )
    },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalDrivers = drivers.length;
  const onlineNow = drivers.filter(d => d.is_available && d.is_verified).length;
  const pendingVerification = drivers.filter(d => !d.is_verified).length;
  const avgRating = drivers.length > 0 
    ? (drivers.reduce((sum, d) => sum + d.rating, 0) / drivers.length).toFixed(1) 
    : '0.0';

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Drivers</h1>
            <p className="text-muted-foreground">Manage all registered drivers</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (open) {
              // Load vehicle types when opening
              if (vehicleTypes.length === 0) {
                fetchVehicleTypes();
              }
            } else {
              // Clear form when closing
              setNewDriver({ full_name: '', email: '', password: '', phone: '', vehicle_number: '', license_number: '' });
              setNewDriverVehicles([]);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Driver</DialogTitle>
                <DialogDescription>
                  Manually register a new driver
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Enter full name"
                    value={newDriver.full_name}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="driver@example.com"
                    value={newDriver.email}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="Min 6 characters"
                    value={newDriver.password}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle Number *</Label>
                  <Input 
                    id="vehicle" 
                    placeholder="WB XX X XXXX"
                    value={newDriver.vehicle_number}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, vehicle_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license">License Number</Label>
                  <Input 
                    id="license" 
                    placeholder="Enter license number"
                    value={newDriver.license_number}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, license_number: e.target.value }))}
                  />
                </div>

                {/* Vehicle Types Selection */}
                <div className="space-y-2">
                  <Label>Vehicle Types * (Select all vehicles driver can operate)</Label>
                  {vehicleTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Loading vehicle types...</p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                      {vehicleTypes.map((vehicle) => (
                        <label
                          key={vehicle.id}
                          className={`flex items-start gap-3 p-2 rounded-md cursor-pointer transition-all ${
                            newDriverVehicles.includes(vehicle.id)
                              ? 'bg-primary/10 border border-primary'
                              : 'hover:bg-accent border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={newDriverVehicles.includes(vehicle.id)}
                            onChange={() => {
                              setNewDriverVehicles(prev => 
                                prev.includes(vehicle.id)
                                  ? prev.filter(id => id !== vehicle.id)
                                  : [...prev, vehicle.id]
                              );
                            }}
                            disabled={addingDriver}
                            className="mt-1 w-4 h-4 text-primary rounded focus:ring-primary"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{vehicle.display_name}</div>
                            {vehicle.description && (
                              <div className="text-xs text-muted-foreground">{vehicle.description}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {newDriverVehicles.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {newDriverVehicles.length} vehicle{newDriverVehicles.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setNewDriver({ full_name: '', email: '', password: '', phone: '', vehicle_number: '', license_number: '' });
                      setNewDriverVehicles([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="hero" 
                    className="flex-1" 
                    onClick={handleAddDriver}
                    disabled={addingDriver}
                  >
                    {addingDriver ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Driver'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Driver Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Driver</DialogTitle>
              <DialogDescription>
                Update driver information
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input 
                  id="edit-name" 
                  placeholder="Enter full name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input 
                  id="edit-phone" 
                  placeholder="+91 XXXXX XXXXX"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-vehicle">Vehicle Number</Label>
                <Input 
                  id="edit-vehicle" 
                  placeholder="WB XX X XXXX"
                  value={editForm.vehicle_number}
                  onChange={(e) => setEditForm(prev => ({ ...prev, vehicle_number: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-license">License Number</Label>
                <Input 
                  id="edit-license" 
                  placeholder="Enter license number"
                  value={editForm.license_number}
                  onChange={(e) => setEditForm(prev => ({ ...prev, license_number: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-verified">Verified</Label>
                <Switch
                  id="edit-verified"
                  checked={editForm.is_verified}
                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_verified: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-available">Available</Label>
                <Switch
                  id="edit-available"
                  checked={editForm.is_available}
                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_available: checked }))}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="hero" 
                  className="flex-1" 
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Manage Vehicles Dialog */}
        <Dialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Vehicle Types</DialogTitle>
              <DialogDescription>
                Assign vehicle types to {managingDriver?.full_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {vehicleTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No vehicle types available
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {vehicleTypes.map((vehicle) => (
                    <label
                      key={vehicle.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedDriverVehicles.includes(vehicle.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDriverVehicles.includes(vehicle.id)}
                        onChange={() => toggleDriverVehicle(vehicle.id)}
                        disabled={savingVehicles}
                        className="mt-1 w-4 h-4 text-primary rounded focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{vehicle.display_name}</div>
                        {vehicle.description && (
                          <div className="text-sm text-muted-foreground mt-0.5">{vehicle.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {selectedDriverVehicles.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedDriverVehicles.length} vehicle{selectedDriverVehicles.length !== 1 ? 's' : ''} selected
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setIsVehicleDialogOpen(false)}
                  disabled={savingVehicles}
                >
                  Cancel
                </Button>
                <Button 
                  variant="hero" 
                  className="flex-1" 
                  onClick={handleSaveVehicles}
                  disabled={savingVehicles || selectedDriverVehicles.length === 0}
                >
                  {savingVehicles ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Total Drivers</p>
            <p className="text-2xl font-bold text-foreground">{totalDrivers}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Online Now</p>
            <p className="text-2xl font-bold text-primary">{onlineNow}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Pending Verification</p>
            <p className="text-2xl font-bold text-secondary">{pendingVerification}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Avg Rating</p>
            <p className="text-2xl font-bold text-foreground flex items-center gap-1">
              <Star className="w-5 h-5 text-secondary fill-secondary" />
              {avgRating}
            </p>
          </div>
        </div>

        {/* Table */}
        {filteredDrivers.length > 0 ? (
          <DataTable columns={columns} data={filteredDrivers} />
        ) : (
          <div className="bg-gradient-card rounded-xl border border-border/50 p-12 text-center">
            <p className="text-muted-foreground">No drivers found</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDrivers;
