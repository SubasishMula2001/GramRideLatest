import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, Package, IndianRupee, Clock, MapPin, Navigation, Loader2, CheckCircle, Car, Phone, User, Star, Locate, KeyRound, Calendar, Smartphone, Banknote, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import GramRideLogo from '@/components/GramRideLogo';
import BookingTypeCard from '@/components/BookingTypeCard';
import SecurePlaceInput from '@/components/SecurePlaceInput';
import SecureRouteMap from '@/components/SecureRouteMap';
import RatingModal from '@/components/RatingModal';
import ScheduleRideModal from '@/components/ScheduleRideModal';
import PaymentModal from '@/components/PaymentModal';
import FareEstimationCard from '@/components/FareEstimationCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDriverLocationSubscription } from '@/hooks/useDriverLocationSubscription';
import { format } from 'date-fns';
import { calculateFare, FARE_CONFIG, isNightTime, fetchNightChargesSetting } from '@/lib/fareCalculator';

// Helper to clean Plus Codes from addresses
const cleanPlusCode = (address: string): string => {
  return address
    .replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,3},?\s*/i, '')
    .replace(/,?\s*[A-Z0-9]{4}\+[A-Z0-9]{2,3}\s*,?/gi, ',')
    .replace(/,\s*,/g, ',')
    .replace(/^,\s*/, '')
    .replace(/,\s*$/, '')
    .trim();
};

type BookingType = 'passenger' | 'goods' | null;
type BookingStep = 'type' | 'location' | 'confirm' | 'searching' | 'booked' | 'in_progress' | 'completed';
// Payment method selection moved to driver side

interface VehicleType {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  image_url: string | null;
  base_fare: number;
  per_km_rate: number;
}

interface DriverInfo {
  id: string;
  name: string;
  phone: string | null;
  vehicle_number: string;
  vehicle_type: string;
  rating: number;
}

interface LocationData {
  address: string;
  lat?: number;
  lng?: number;
}

interface UserProfile {
  full_name: string | null;
}

const BookRide = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  const [bookingType, setBookingType] = useState<BookingType>(null);
  const [step, setStep] = useState<BookingStep>('type');
  const [pickupData, setPickupData] = useState<LocationData>({ address: '' });
  const [dropData, setDropData] = useState<LocationData>({ address: '' });
  const [loading, setLoading] = useState(false);
  const [rideId, setRideId] = useState<string | null>(null);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loadingVehicleTypes, setLoadingVehicleTypes] = useState(true);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [rideOtp, setRideOtp] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // Payment method selection - user chooses before booking
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'upi' | 'cash' | null>(null);
  // Selected vehicle type for fare estimation
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  // Route calculated values
  const [estimatedDistance, setEstimatedDistance] = useState(3.5);
  const [estimatedTime, setEstimatedTime] = useState(12);
  
  // Night charges setting from database
  const [nightChargesEnabled, setNightChargesEnabled] = useState(false);
  
  // Calculate fare using village-friendly rates (same for passenger & goods)
  const fareBreakdown = calculateFare(estimatedDistance, scheduledFor || undefined, nightChargesEnabled);
  const estimatedFare = fareBreakdown.totalFare;

  // Subscribe to driver location updates during active ride
  const isRideActive = step === 'booked' || step === 'in_progress';
  const { 
    driverLocation, 
    distanceToPickup, 
    etaToPickup,
    distanceToDrop,
    etaToDrop 
  } = useDriverLocationSubscription({
    driverId: driverInfo?.id || null,
    isActive: isRideActive,
    pickupLat: pickupData.lat,
    pickupLng: pickupData.lng,
    dropLat: dropData.lat,
    dropLng: dropData.lng
  });

  const handleRouteCalculated = useCallback((distance: number, duration: number) => {
    setEstimatedDistance(Math.round(distance * 10) / 10);
    setEstimatedTime(duration);
  }, []);

  // Check for pending ride from navigation state or fetch existing pending ride
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please login to book a ride');
      navigate('/login');
      return;
    }
    
    if (user) {
      // Fetch user profile for displaying name
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setUserProfile(data);
        });

      // Fetch night charges setting
      fetchNightChargesSetting().then(setNightChargesEnabled);

      // Fetch vehicle types
      fetchVehicleTypes();

      // Check if navigating from pending ride banner
      const state = location.state as { pendingRideId?: string } | null;
      if (state?.pendingRideId) {
        // Load the pending ride
        loadPendingRide(state.pendingRideId);
        // Clear the state to prevent re-loading on refresh
        navigate(location.pathname, { replace: true, state: {} });
      } else {
        // Check for any existing pending/active ride
        checkExistingRide();
      }
    }
  }, [user, authLoading, navigate]);

  // Real-time subscription for vehicle types changes
  useEffect(() => {
    // Subscribe to real-time updates for vehicle types
    const channel = supabase
      .channel('vehicle_types_changes')
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

  const loadPendingRide = async (pendingRideId: string) => {
    try {
      const { data: ride, error } = await supabase
        .from('rides')
        .select('*')
        .eq('id', pendingRideId)
        .maybeSingle();

      if (error) throw error;
      if (!ride) return;

      // Restore ride state
      setRideId(ride.id);
      setBookingType(ride.ride_type as BookingType);
      setPickupData({ 
        address: ride.pickup_location, 
        lat: ride.pickup_lat ?? undefined, 
        lng: ride.pickup_lng ?? undefined 
      });
      setDropData({ 
        address: ride.dropoff_location, 
        lat: ride.dropoff_lat ?? undefined, 
        lng: ride.dropoff_lng ?? undefined 
      });
      setRideOtp(ride.otp || null);
      setSelectedPaymentMethod(ride.payment_method as 'upi' | 'cash' | null);
      
      if (ride.fare) setEstimatedDistance(ride.distance_km || 3.5);
      if (ride.duration_mins) setEstimatedTime(ride.duration_mins);

      // Set appropriate step based on status
      if (ride.status === 'pending') {
        setStep('searching');
      } else if (ride.status === 'accepted' && ride.driver_id) {
        await fetchDriverInfo(ride.driver_id);
        setStep('booked');
      } else if (ride.status === 'in_progress') {
        if (ride.driver_id) await fetchDriverInfo(ride.driver_id);
        setStep('in_progress');
      }
    } catch (error) {
      console.error('Error loading pending ride:', error);
    }
  };

  const fetchVehicleTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_types' as any)
        .select('id, name, display_name, description, image_url, base_fare, per_km_rate')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setVehicleTypes((data as unknown as VehicleType[]) || []);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
      // Fallback to default types if fetch fails
      setVehicleTypes([]);
    } finally {
      setLoadingVehicleTypes(false);
    }
  };

  const checkExistingRide = async () => {
    try {
      // Get the most recent active ride (order by accepted_at desc for consistency with driver side)
      // For pending rides, accepted_at is null, so we also check created_at
      const { data: ride } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', user!.id)
        .in('status', ['pending', 'accepted', 'in_progress'])
        .order('accepted_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (ride) {
        loadPendingRide(ride.id);
      }
    } catch (error) {
      console.error('Error checking existing ride:', error);
    }
  };

  // Subscribe to ride updates when waiting for driver
  useEffect(() => {
    if (!rideId) return;

    const channel = supabase
      .channel(`ride-${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${rideId}`
        },
        async (payload) => {
          const updatedRide = payload.new as any;

          // Keep local payment UI in sync with backend payment status
          if (updatedRide?.payment_status) {
            setPaymentCompleted(updatedRide.payment_status === 'completed');
          }
          
          // Handle status transitions based on the new status from database
          if (updatedRide.status === 'accepted' && updatedRide.driver_id) {
            await fetchDriverInfo(updatedRide.driver_id);
            setStep('booked');
            toast.success('Driver found! Your ride is confirmed.');
          } else if (updatedRide.status === 'in_progress') {
            setStep('in_progress');
            toast.info('Your ride has started!');
          } else if (updatedRide.status === 'completed') {
            setStep('completed');
            toast.success('Ride completed!');
            // Show rating modal directly since payment is handled by driver
            setTimeout(() => setShowRatingModal(true), 500);
          } else if (updatedRide.status === 'cancelled') {
            setStep('type');
            setRideId(null);
            toast.error('Ride was cancelled.');
          }
        }
      )
      .subscribe((status) => {
        console.log('Ride subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId]); // Only depend on rideId, not step

  const fetchDriverInfo = async (driverId: string) => {
    try {
      // Use the secure view which masks phone and provides only necessary data
      const { data: driverProfile, error } = await supabase
        .from('driver_profile_for_ride')
        .select('*')
        .eq('driver_id', driverId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching driver profile:', error);
      }

      if (driverProfile) {
        setDriverInfo({
          id: driverProfile.driver_id || driverId,
          name: driverProfile.full_name || 'Driver',
          phone: driverProfile.masked_phone || null,
          vehicle_number: driverProfile.vehicle_number || '',
          vehicle_type: driverProfile.vehicle_type || 'Toto',
          rating: driverProfile.rating || 5.0
        });
      } else {
        // Fallback: set basic info from ride if view returns nothing
        setDriverInfo({
          id: driverId,
          name: 'Driver',
          phone: null,
          vehicle_number: '',
          vehicle_type: 'Toto',
          rating: 5.0
        });
      }
    } catch (error) {
      console.error('Error fetching driver info:', error);
      // Set fallback driver info
      setDriverInfo({
        id: driverId,
        name: 'Driver',
        phone: null,
        vehicle_number: '',
        vehicle_type: 'Toto',
        rating: 5.0
      });
    }
  };

  const handleTypeSelect = (type: BookingType) => {
    setBookingType(type);
    setStep('location');
  };

  const handleLocationSubmit = () => {
    if (pickupData.address && dropData.address) {
      setStep('confirm');
    }
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      toast.error('Please login to book a ride');
      navigate('/login');
      return;
    }

    if (!selectedVehicleId) {
      toast.error('Please select a vehicle type');
      return;
    }

    setLoading(true);
    try {
      // Get selected vehicle details
      const selectedVehicle = vehicleTypes.find(v => v.id === selectedVehicleId);
      if (!selectedVehicle) {
        toast.error('Invalid vehicle selection');
        setLoading(false);
        return;
      }

      // Calculate fare based on selected vehicle
      const vehicleFare = calculateFare(
        estimatedDistance,
        scheduledFor || undefined,
        nightChargesEnabled,
        selectedVehicle.per_km_rate,
        selectedVehicle.base_fare
      );

      // Generate 4-digit OTP for pickup verification using cryptographically secure randomness
      const randomValues = crypto.getRandomValues(new Uint32Array(1));
      const otp = (1000 + (randomValues[0] % 9000)).toString();
      
      const { data, error } = await supabase
        .from('rides')
        .insert({
          user_id: user.id,
          ride_type: bookingType,
          pickup_location: pickupData.address,
          dropoff_location: dropData.address,
          pickup_lat: pickupData.lat,
          pickup_lng: pickupData.lng,
          dropoff_lat: dropData.lat,
          dropoff_lng: dropData.lng,
          fare: vehicleFare.totalFare,
          distance_km: estimatedDistance,
          duration_mins: estimatedTime,
          status: 'pending',
          otp: otp,
          payment_status: 'pending',
          payment_method: selectedPaymentMethod,
          vehicle_type: selectedVehicle.name // Store selected vehicle type
        })
        .select()
        .single();

      if (error) throw error;

      setRideId(data.id);
      setRideOtp(otp);
      setStep('searching');
      toast.success('Booking created! Finding a driver...');

      // Log the activity with device info
      const { logActivity } = await import('@/hooks/useActivityLog');
      await logActivity({
        userId: user.id,
        action: 'Ride Booked',
        details: { 
          ride_id: data.id, 
          ride_type: bookingType,
          vehicle_type: selectedVehicle.display_name,
          pickup: pickupData.address,
          drop: dropData.address,
          fare: vehicleFare.totalFare 
        }
      });

    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'location') {
      setStep('type');
      setBookingType(null);
    } else if (step === 'confirm') {
      setStep('location');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero pt-16">
      <main className="pt-8 pb-12 px-4">
        <div className="container mx-auto max-w-lg">
          
          {/* Step: Select Type */}
          {step === 'type' && (
            <div className="animate-fade-in">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
                What would you like to book?
              </h1>
              <p className="text-muted-foreground text-center mb-8">
                Choose your ride type to get started
              </p>

              <div className="space-y-4">
                {loadingVehicleTypes ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground mt-2">Loading vehicle types...</p>
                  </div>
                ) : vehicleTypes.length > 0 ? (
                  <>
                    {vehicleTypes.map((vehicle) => (
                      <BookingTypeCard
                        key={vehicle.id}
                        icon={vehicle.name === 'bike' ? Car : vehicle.name === 'van' ? Package : Users}
                        title={vehicle.display_name}
                        description={vehicle.description || `Book a ${vehicle.display_name.toLowerCase()}`}
                        onClick={() => handleTypeSelect('passenger')}
                        variant={vehicle.name === 'van' || vehicle.name === 'bike' ? 'goods' : 'passenger'}
                      />
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">No Vehicles Available</h3>
                    <p className="text-muted-foreground">Please check back later or contact support.</p>
                  </div>
                )}
                
                {/* Shared Rides Link */}
                <Link to="/shared-rides" className="block">
                  <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all flex items-center gap-3">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">Shared Rides</p>
                      <p className="text-xs text-muted-foreground">Travel together, share the fare</p>
                    </div>
                    <div className="text-primary font-medium text-sm">→</div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Step: Enter Locations */}
          {step === 'location' && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-xl ${bookingType === 'passenger' ? 'bg-gradient-primary' : 'bg-gradient-secondary'}`}>
                  {bookingType === 'passenger' ? (
                    <Users className="w-6 h-6 text-primary-foreground" />
                  ) : (
                    <Package className="w-6 h-6 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {bookingType === 'passenger' ? 'Passenger Ride' : 'Goods Delivery'}
                  </h1>
                  <p className="text-sm text-muted-foreground">Enter pickup and drop locations</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <SecurePlaceInput
                  type="pickup"
                  value={pickupData.address}
                  onChange={(address, lat, lng) => setPickupData({ address, lat, lng })}
                  placeholder="Search pickup location"
                />
                
                <div className="flex items-center justify-center">
                  <div className="w-px h-8 bg-border relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">↓</span>
                    </div>
                  </div>
                </div>
                
                <SecurePlaceInput
                  type="drop"
                  value={dropData.address}
                  onChange={(address, lat, lng) => setDropData({ address, lat, lng })}
                  placeholder="Search drop location"
                />
              </div>

              {/* Route Info */}
              <div className="mb-6">
                <SecureRouteMap
                  pickupLat={pickupData.lat}
                  pickupLng={pickupData.lng}
                  dropLat={dropData.lat}
                  dropLng={dropData.lng}
                  onRouteCalculated={handleRouteCalculated}
                />
              </div>

              <Button 
                variant="hero" 
                size="xl" 
                className="w-full"
                onClick={handleLocationSubmit}
                disabled={!pickupData.address || !dropData.address}
              >
                Find Toto
              </Button>
            </div>
          )}

          {/* Step: Confirm Booking */}
          {step === 'confirm' && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold text-foreground mb-6 text-center">
                Confirm Your Ride
              </h1>

              <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-elevated mb-6">
                {/* Ride Type Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${
                  bookingType === 'passenger' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-secondary/10 text-secondary'
                }`}>
                  {bookingType === 'passenger' ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  {bookingType === 'passenger' ? 'Passenger Ride' : 'Goods Delivery'}
                </div>

                {/* Locations */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-1.5 rounded-full bg-primary/10">
                      <Navigation className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase">Pickup</p>
                      <p className="text-foreground font-medium">{cleanPlusCode(pickupData.address)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-1.5 rounded-full bg-secondary/10">
                      <MapPin className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase">Drop</p>
                      <p className="text-foreground font-medium">{cleanPlusCode(dropData.address)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fare Estimation with Multiple Vehicle Options */}
              {vehicleTypes.length > 0 && (
                <FareEstimationCard
                  vehicleTypes={vehicleTypes}
                  distance={estimatedDistance}
                  estimatedTime={estimatedTime}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={setSelectedVehicleId}
                  scheduledFor={scheduledFor || undefined}
                  nightChargesEnabled={nightChargesEnabled}
                />
              )}

              {/* Payment Method Selection */}
              <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-elevated mb-6 mt-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Select Payment Method
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* UPI Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('upi')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      selectedPaymentMethod === 'upi'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`p-3 rounded-full mb-2 ${
                      selectedPaymentMethod === 'upi' ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <Smartphone className={`w-6 h-6 ${
                        selectedPaymentMethod === 'upi' ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <span className={`font-medium ${
                      selectedPaymentMethod === 'upi' ? 'text-primary' : 'text-foreground'
                    }`}>UPI</span>
                    <span className="text-xs text-muted-foreground mt-1">GPay, PhonePe</span>
                  </button>

                  {/* Cash Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('cash')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      selectedPaymentMethod === 'cash'
                        ? 'border-green-500 bg-green-500/5 ring-2 ring-green-500/20'
                        : 'border-border hover:border-green-500/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`p-3 rounded-full mb-2 ${
                      selectedPaymentMethod === 'cash' ? 'bg-green-500/20' : 'bg-muted'
                    }`}>
                      <Banknote className={`w-6 h-6 ${
                        selectedPaymentMethod === 'cash' ? 'text-green-600' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <span className={`font-medium ${
                      selectedPaymentMethod === 'cash' ? 'text-green-600' : 'text-foreground'
                    }`}>Cash</span>
                    <span className="text-xs text-muted-foreground mt-1">Pay to Driver</span>
                  </button>
                </div>
                {selectedPaymentMethod === 'upi' && (
                  <p className="text-xs text-muted-foreground text-center mt-3 p-2 bg-primary/5 rounded-lg">
                    💡 You can pay now or anytime during the ride
                  </p>
                )}
              </div>

              <Button 
                variant="hero" 
                size="xl" 
                className="w-full"
                onClick={handleConfirmBooking}
                disabled={loading || !selectedPaymentMethod || !selectedVehicleId}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : !selectedVehicleId ? (
                  'Select a Vehicle'
                ) : !selectedPaymentMethod ? (
                  'Select Payment Method'
                ) : (
                  'Confirm Booking'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-4">
                You'll be matched with a nearby driver
              </p>
            </div>
          )}

          {/* Step: Searching for Driver */}
          {step === 'searching' && (
            <div className="animate-fade-in text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Finding Your Driver...
              </h1>
              <p className="text-muted-foreground mb-8">
                Please wait while we connect you with a nearby driver
              </p>
              
              <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 text-left">
                <div className="flex items-center gap-3 mb-4">
                  <Navigation className="w-5 h-5 text-primary" />
                  <span className="text-foreground">{cleanPlusCode(pickupData.address)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-secondary" />
                  <span className="text-foreground">{cleanPlusCode(dropData.address)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step: Booked - Driver Assigned */}
          {step === 'booked' && (
            <div className="animate-fade-in py-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-1">
                  Driver Assigned!
                </h1>
                <p className="text-muted-foreground">
                  Your driver is on the way to pick you up
                </p>
              </div>

              {/* Live ETA Card */}
              {(etaToPickup !== null || distanceToPickup !== null) && (
                <div className="bg-gradient-primary rounded-2xl p-4 mb-4 animate-pulse-slow">
                  <div className="flex items-center justify-between text-primary-foreground">
                    <div className="flex items-center gap-2">
                      <Locate className="w-5 h-5" />
                      <span className="font-medium">Driver Location</span>
                    </div>
                    <div className="text-right">
                      {etaToPickup !== null && (
                        <p className="text-xl font-bold">{etaToPickup} min away</p>
                      )}
                      {distanceToPickup !== null && (
                        <p className="text-sm opacity-80">{distanceToPickup} km to pickup</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Driver Info Card */}
              {driverInfo && (
                <div className="bg-gradient-card rounded-2xl border-2 border-primary shadow-elevated overflow-hidden mb-6">
                  <div className="bg-gradient-primary px-5 py-3">
                    <p className="text-primary-foreground font-semibold">Your Driver</p>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-8 h-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-foreground">{driverInfo.name}</h3>
                        <div className="flex items-center gap-1 text-secondary">
                          <Star className="w-4 h-4 fill-secondary" />
                          <span className="font-medium">{driverInfo.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 py-4 border-t border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary/10">
                          <Car className="w-5 h-5 text-secondary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Vehicle</p>
                          <p className="font-semibold text-foreground">{driverInfo.vehicle_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <span className="text-primary font-bold text-sm">№</span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Vehicle Number</p>
                          <p className="font-semibold text-foreground">{driverInfo.vehicle_number}</p>
                        </div>
                      </div>
                      {driverInfo.phone ? (
                        <a 
                          href={`tel:${driverInfo.phone}`}
                          className="flex items-center gap-3 p-3 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition-colors"
                        >
                          <div className="p-2 rounded-lg bg-green-500">
                            <Phone className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground uppercase">Tap to Call</p>
                            <p className="font-semibold text-green-600">{driverInfo.phone}</p>
                          </div>
                          <span className="text-green-600 font-medium">Call →</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                          <div className="p-2 rounded-lg bg-muted">
                            <Phone className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground uppercase">Phone</p>
                            <p className="text-sm text-muted-foreground">Not available</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Navigation className="w-4 h-4 text-primary" />
                        <span className="text-foreground">{cleanPlusCode(pickupData.address)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-secondary" />
                        <span className="text-foreground">{cleanPlusCode(dropData.address)}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                      <span className="text-muted-foreground">Fare</span>
                      <span className="text-xl font-bold text-primary flex items-center">
                        <IndianRupee className="w-5 h-5" />
                        {estimatedFare}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* OTP Display Card */}
              {rideOtp && (
                <div className="bg-gradient-card rounded-2xl border-2 border-secondary shadow-elevated overflow-hidden mb-6 animate-scale-in">
                  <div className="bg-gradient-secondary px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-secondary-foreground" />
                      <p className="text-secondary-foreground font-semibold">Pickup OTP</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {rideOtp.split('').map((digit, index) => (
                        <div 
                          key={index}
                          className="w-8 h-10 rounded-lg bg-secondary-foreground/20 border border-secondary-foreground/30 flex items-center justify-center"
                        >
                          <span className="text-xl font-bold text-secondary-foreground">{digit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-muted-foreground text-sm mb-3">Share this code with your driver at pickup</p>
                    
                    {/* Driver Name & Toto Number - Below OTP */}
                    {driverInfo && (
                      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Driver</p>
                            <p className="font-semibold text-foreground">{driverInfo.name}</p>
                          </div>
                        </div>
                        {driverInfo.vehicle_number && (
                          <div className="flex items-center gap-3">
                            <Car className="w-5 h-5 text-secondary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Toto Number</p>
                              <p className="font-semibold text-foreground">{driverInfo.vehicle_number}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="text-muted-foreground text-xs mt-3 text-center">
                      This ensures you're getting into the right vehicle
                    </p>
                  </div>
                </div>
              )}

              {/* Pay Now Button - Before Ride Starts */}
              {selectedPaymentMethod === 'upi' && !paymentCompleted && (
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={() => setShowPaymentModal(true)}
                >
                  <Smartphone className="w-5 h-5 mr-2" />
                  Pay Now with UPI
                </Button>
              )}
              {paymentCompleted && (
                <div className="flex items-center justify-center gap-2 p-4 bg-green-500/10 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-600">Payment Completed</span>
                </div>
              )}
            </div>
          )}

          {/* Step: Ride In Progress - with animation */}
          <AnimatePresence mode="wait">
            {step === 'in_progress' && (
              <motion.div 
                key="in-progress"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="py-8"
              >
                <motion.div 
                  className="text-center mb-6"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.div 
                    className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Navigation className="w-10 h-10 text-green-600" />
                  </motion.div>
                  <h1 className="text-2xl font-bold text-foreground mb-1">
                    Ride in Progress
                  </h1>
                  <p className="text-muted-foreground">
                    Enjoy your ride!
                  </p>
                </motion.div>

                {/* Live ETA to Drop Card */}
                {(etaToDrop !== null || distanceToDrop !== null) && (
                  <motion.div 
                    className="bg-green-600 rounded-2xl p-4 mb-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <Locate className="w-5 h-5" />
                        <span className="font-medium">En Route</span>
                      </div>
                      <div className="text-right">
                        {etaToDrop !== null && (
                          <p className="text-xl font-bold">{etaToDrop} min to destination</p>
                        )}
                        {distanceToDrop !== null && (
                          <p className="text-sm opacity-80">{distanceToDrop} km remaining</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Driver Info Card */}
                {driverInfo && (
                  <motion.div 
                    className="bg-gradient-card rounded-2xl border-2 border-green-500 shadow-elevated overflow-hidden mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="bg-green-600 px-5 py-3">
                      <p className="text-white font-semibold">Ride in Progress</p>
                    </div>
                    
                    <div className="p-5">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-7 h-7 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-foreground">{driverInfo.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {driverInfo.vehicle_type}
                            {driverInfo.vehicle_number && ` • ${driverInfo.vehicle_number}`}
                          </p>
                        </div>
                        {driverInfo.phone ? (
                          <a 
                            href={`tel:${driverInfo.phone}`}
                            className="p-3 bg-green-500 hover:bg-green-600 rounded-full transition-colors shadow-lg"
                            title="Call Driver"
                          >
                            <Phone className="w-5 h-5 text-white" />
                          </a>
                        ) : (
                          <div 
                            className="p-3 bg-muted rounded-full"
                            title="Phone not available"
                          >
                            <Phone className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Navigation className="w-4 h-4 text-primary" />
                          <span className="text-foreground">{cleanPlusCode(pickupData.address)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-secondary" />
                          <span className="text-foreground">{cleanPlusCode(dropData.address)}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                        <span className="text-muted-foreground">Fare</span>
                        <span className="text-xl font-bold text-primary flex items-center">
                          <IndianRupee className="w-5 h-5" />
                          {estimatedFare}
                        </span>
                      </div>

                      {/* Pay Now Button During Ride */}
                      {selectedPaymentMethod === 'upi' && !paymentCompleted && (
                        <Button
                          variant="hero"
                          size="lg"
                          className="w-full mt-4"
                          onClick={() => setShowPaymentModal(true)}
                        >
                          <Smartphone className="w-5 h-5 mr-2" />
                          Pay Now with UPI
                        </Button>
                      )}
                      {paymentCompleted && (
                        <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 rounded-xl mt-4">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-600">Payment Completed</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step: Ride Completed */}
          {step === 'completed' && (
            <div className="animate-fade-in text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Ride Completed!
              </h1>
              <p className="text-muted-foreground mb-8">
                Thank you for riding with GramRide
              </p>
              
              <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 text-left mb-6">
                {driverInfo && (
                  <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border/50">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{driverInfo.name}</p>
                      <p className="text-sm text-muted-foreground">{driverInfo.vehicle_type} • {driverInfo.vehicle_number}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <Navigation className="w-5 h-5 text-primary" />
                  <span className="text-foreground">{cleanPlusCode(pickupData.address)}</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-secondary" />
                  <span className="text-foreground">{cleanPlusCode(dropData.address)}</span>
                </div>
                <div className="border-t border-border pt-4 flex items-center justify-between">
                  <span className="text-muted-foreground">Total Fare</span>
                  <span className="text-xl font-bold text-primary flex items-center">
                    <IndianRupee className="w-5 h-5" />
                    {estimatedFare}
                  </span>
                </div>
                
                {/* Payment Status */}
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-muted-foreground">Payment Status</span>
                  {paymentCompleted ? (
                    <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Paid
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-amber-600 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Pending
                    </span>
                  )}
                </div>

                {/* Pay Now After Ride - if not yet paid */}
                {!paymentCompleted && selectedPaymentMethod === 'upi' && (
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full mt-4"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    <Smartphone className="w-5 h-5 mr-2" />
                    Pay Now with UPI
                  </Button>
                )}
              </div>

              <Button variant="hero" size="xl" className="w-full" asChild>
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          )}

        </div>
      </main>

      {/* Rating Modal */}
      {showRatingModal && driverInfo && rideId && user && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          rideId={rideId}
          driverId={driverInfo.id}
          driverName={driverInfo.name}
          userId={user.id}
          onRatingSubmitted={() => setShowRatingModal(false)}
        />
      )}

      {/* Schedule Modal */}
      <ScheduleRideModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={(date) => setScheduledFor(date)}
      />

      {/* Payment Modal */}
      {rideId && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          rideId={rideId}
          amount={estimatedFare}
          onPaymentComplete={() => {
            setPaymentCompleted(true);
            setShowPaymentModal(false);
            // Show rating modal after payment
            setTimeout(() => setShowRatingModal(true), 500);
          }}
        />
      )}
    </div>
  );
};

export default BookRide;