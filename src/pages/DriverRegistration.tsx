import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, FileText, ArrowRight, Loader2, Home, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GramRideLogo from '@/components/GramRideLogo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const vehicleNumberSchema = z.string()
  .min(4, 'Vehicle number must be at least 4 characters')
  .max(15, 'Vehicle number must be less than 15 characters')
  .regex(/^[A-Z0-9\s-]+$/i, 'Only letters, numbers, spaces and dashes allowed');

const licenseSchema = z.string()
  .min(8, 'License number must be at least 8 characters')
  .max(20, 'License number must be less than 20 characters')
  .regex(/^[A-Z0-9]+$/i, 'Only letters and numbers allowed');

interface VehicleType {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  image_url: string | null;
}

const DriverRegistration = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loadingVehicleTypes, setLoadingVehicleTypes] = useState(true);
  const [errors, setErrors] = useState<{ vehicleNumber?: string; licenseNumber?: string; vehicles?: string }>({});

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
        return;
      }
      
      // Check if user already has a driver record
      checkExistingDriver();
    }
    
    // Fetch vehicle types
    fetchVehicleTypes();
  }, [user, authLoading, navigate]);

  // Real-time subscription for vehicle types changes
  useEffect(() => {
    // Subscribe to real-time updates for vehicle types
    const channel = supabase
      .channel('vehicle_types_changes_driver')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'vehicle_types'
        },
        () => {
          // Refetch vehicle types when any change occurs
          fetchVehicleTypes();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVehicleTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_types' as any)
        .select('id, name, display_name, description, image_url')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      setVehicleTypes((data as unknown as VehicleType[]) || []);
      
      // Set default vehicle type if available
      if (data && data.length > 0 && !vehicleType) {
        setVehicleType((data as any)[0].name);
      }
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
      toast.error('Failed to load vehicle types');
    } finally {
      setLoadingVehicleTypes(false);
    }
  };

  const checkExistingDriver = async () => {
    if (!user) return;
    
    try {
      // Use a simpler query that works with RLS
      const { data, error } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // If there's an error but it's not a "no rows" error, log it
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking driver status:', error);
      }

      if (data) {
        // Driver already registered, redirect to dashboard
        navigate('/driver');
      }
    } catch (error) {
      console.error('Error checking driver status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const validateForm = () => {
    const newErrors: { vehicleNumber?: string; licenseNumber?: string; vehicles?: string } = {};
    
    try {
      vehicleNumberSchema.parse(vehicleNumber.trim());
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.vehicleNumber = e.errors[0].message;
      }
    }

    try {
      licenseSchema.parse(licenseNumber.trim());
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.licenseNumber = e.errors[0].message;
      }
    }

    if (selectedVehicles.length === 0) {
      newErrors.vehicles = 'Please select at least one vehicle type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toggleVehicleSelection = (vehicleId: string) => {
    setSelectedVehicles(prev => {
      if (prev.includes(vehicleId)) {
        return prev.filter(id => id !== vehicleId);
      } else {
        return [...prev, vehicleId];
      }
    });
    // Clear error when user selects vehicle
    if (errors.vehicles) {
      setErrors(prev => ({ ...prev, vehicles: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;
    
    setLoading(true);
    
    try {
      // Insert driver record (keep first selected vehicle as primary for backward compatibility)
      const primaryVehicle = vehicleTypes.find(v => v.id === selectedVehicles[0]);
      
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .insert({
          user_id: user.id,
          vehicle_number: vehicleNumber.trim().toUpperCase(),
          vehicle_type: primaryVehicle?.name || 'toto',
          license_number: licenseNumber.trim().toUpperCase(),
          is_verified: false,
          is_available: false
        })
        .select()
        .single();

      if (driverError) throw driverError;

      // Insert all selected vehicles into driver_vehicles junction table
      const vehicleInserts = selectedVehicles.map((vehicleId, index) => ({
        driver_id: driverData.id,
        vehicle_type_id: vehicleId,
        is_primary: index === 0 // First vehicle is primary
      }));

      const { error: vehiclesError } = await supabase
        .from('driver_vehicles' as any)
        .insert(vehicleInserts);

      if (vehiclesError) {
        console.error('Error inserting vehicle types:', vehiclesError);
        // Don't fail the registration, just log the error
      }

      toast.success('Registration submitted! Awaiting admin verification.');
      navigate('/driver');
    } catch (error: any) {
      console.error('Error registering driver:', error);
      if (error.code === '23505') {
        toast.error('This vehicle or license number is already registered');
      } else {
        toast.error('Failed to register. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checkingStatus || loadingVehicleTypes) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userRole !== 'driver') {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need to be signed in as a driver to register.</p>
          <Button variant="hero" asChild>
            <Link to="/login">Sign In as Driver</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Header */}
      <div className="w-full p-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <Home className="w-6 h-6" />
          <span className="text-lg font-medium">Home</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 pb-8">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <GramRideLogo size="lg" />
            </Link>
            <p className="text-muted-foreground mt-3 text-lg">Driver Registration</p>
          </div>

          {/* Registration Card */}
          <div className="bg-card rounded-3xl border-2 border-border shadow-elevated p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Complete Your Profile</h2>
                <p className="text-sm text-muted-foreground">Enter your vehicle details to start driving</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Vehicle Number */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Vehicle Number *
                </label>
                <div className="relative">
                  <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="e.g., WB 20 AB 1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className="pl-12 h-12 text-base rounded-xl border-2"
                    disabled={loading}
                  />
                </div>
                {errors.vehicleNumber && (
                  <p className="text-destructive text-sm mt-1">{errors.vehicleNumber}</p>
                )}
              </div>

              {/* Vehicle Types */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Vehicle Types * (Select all vehicles you can drive)
                </label>
                {vehicleTypes.length === 0 ? (
                  <p className="text-destructive text-sm">
                    No vehicle types available. Please contact admin.
                  </p>
                ) : (
                  <div className="space-y-3 border-2 rounded-xl p-4 bg-background/50">
                    {vehicleTypes.map((vt) => (
                      <label
                        key={vt.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedVehicles.includes(vt.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedVehicles.includes(vt.id)}
                          onChange={() => toggleVehicleSelection(vt.id)}
                          disabled={loading}
                          className="mt-1 w-4 h-4 text-primary rounded focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{vt.display_name}</div>
                          {vt.description && (
                            <div className="text-sm text-muted-foreground mt-0.5">{vt.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {errors.vehicles && (
                  <p className="text-destructive text-sm mt-1">{errors.vehicles}
                  </p>
                )}
              </div>

              {/* License Number */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Driving License Number *
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="e.g., DL1234567890123"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                    className="pl-12 h-12 text-base rounded-xl border-2"
                    disabled={loading}
                  />
                </div>
                {errors.licenseNumber && (
                  <p className="text-destructive text-sm mt-1">{errors.licenseNumber}</p>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-secondary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Verification Required</p>
                    <p className="text-muted-foreground mt-1">
                      Your registration will be reviewed by admin. You'll receive ride requests once verified.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit"
                variant="default" 
                size="lg" 
                className="w-full h-14 text-xl font-bold rounded-xl"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    Submit Registration
                    <ArrowRight className="w-6 h-6 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverRegistration;

