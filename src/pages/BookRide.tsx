import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Package, IndianRupee, Clock, MapPin, Navigation, Loader2, CheckCircle, Car, Phone, User, Star, Locate, KeyRound, Calendar, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import GramRideLogo from '@/components/GramRideLogo';
import BookingTypeCard from '@/components/BookingTypeCard';
import SecurePlaceInput from '@/components/SecurePlaceInput';
import SecureRouteMap from '@/components/SecureRouteMap';
import RatingModal from '@/components/RatingModal';
import ScheduleRideModal from '@/components/ScheduleRideModal';
import PaymentModal from '@/components/PaymentModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDriverLocationSubscription } from '@/hooks/useDriverLocationSubscription';
import { format } from 'date-fns';

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
type PaymentMethod = 'upi' | 'cash';

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
  const { user, loading: authLoading } = useAuth();
  
  const [bookingType, setBookingType] = useState<BookingType>(null);
  const [step, setStep] = useState<BookingStep>('type');
  const [pickupData, setPickupData] = useState<LocationData>({ address: '' });
  const [dropData, setDropData] = useState<LocationData>({ address: '' });
  const [loading, setLoading] = useState(false);
  const [rideId, setRideId] = useState<string | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [rideOtp, setRideOtp] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  
  // Route calculated values
  const [estimatedDistance, setEstimatedDistance] = useState(3.5);
  const [estimatedTime, setEstimatedTime] = useState(12);
  const baseFare = bookingType === 'passenger' ? 20 : 30;
  const perKmRate = bookingType === 'passenger' ? 8 : 12;
  const estimatedFare = Math.round(baseFare + (estimatedDistance * perKmRate));

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

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please login to book a ride');
      navigate('/login');
    } else if (user) {
      // Fetch user profile for displaying name
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setUserProfile(data);
        });
    }
  }, [user, authLoading, navigate]);

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
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, vehicle_number, vehicle_type, rating, user_id')
        .eq('id', driverId)
        .single();

      if (driverError) throw driverError;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', driver.user_id)
        .maybeSingle();

      setDriverInfo({
        id: driver.id,
        name: profile?.full_name || 'Driver',
        phone: profile?.phone || null,
        vehicle_number: driver.vehicle_number,
        vehicle_type: driver.vehicle_type || 'Toto',
        rating: driver.rating || 5.0
      });
    } catch (error) {
      console.error('Error fetching driver info:', error);
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

    setLoading(true);
    try {
      // Generate 4-digit OTP for pickup verification
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      
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
          fare: estimatedFare,
          distance_km: estimatedDistance,
          duration_mins: estimatedTime,
          status: 'pending',
          otp: otp,
          payment_method: selectedPaymentMethod,
          payment_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setRideId(data.id);
      setRideOtp(otp);
      setStep('searching');
      toast.success('Booking created! Finding a driver...');

      // Log the activity
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'Ride Booked',
        details: { 
          ride_id: data.id, 
          ride_type: bookingType,
          pickup: pickupData.address,
          drop: dropData.address,
          fare: estimatedFare 
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
                <BookingTypeCard
                  icon={Users}
                  title="Passenger Toto"
                  description="Safe and comfortable rides for you and your family"
                  onClick={() => handleTypeSelect('passenger')}
                  variant="passenger"
                />
                <BookingTypeCard
                  icon={Package}
                  title="Goods Toto"
                  description="Reliable delivery for packages and goods"
                  onClick={() => handleTypeSelect('goods')}
                  variant="goods"
                />
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
                <div className="space-y-4 mb-6">
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

                {/* Fare Estimate */}
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estimated Distance</span>
                    <span className="font-semibold text-foreground">{estimatedDistance} km</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estimated Time</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {estimatedTime} min
                    </span>
                  </div>
                  <div className="border-t border-border pt-3 flex items-center justify-between">
                    <span className="font-medium text-foreground">Estimated Fare</span>
                    <span className="text-xl font-bold text-primary flex items-center">
                      <IndianRupee className="w-5 h-5" />
                      {estimatedFare}
                    </span>
                </div>

                {/* Payment Method Selection */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Payment Method
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('upi')}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        selectedPaymentMethod === 'upi'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 bg-muted/30'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${selectedPaymentMethod === 'upi' ? 'bg-primary/20' : 'bg-muted'}`}>
                        <Smartphone className={`w-5 h-5 ${selectedPaymentMethod === 'upi' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <span className={`font-medium text-sm ${selectedPaymentMethod === 'upi' ? 'text-primary' : 'text-foreground'}`}>
                        UPI
                      </span>
                      <span className="text-xs text-muted-foreground">Pay online</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('cash')}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        selectedPaymentMethod === 'cash'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 bg-muted/30'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${selectedPaymentMethod === 'cash' ? 'bg-primary/20' : 'bg-muted'}`}>
                        <Banknote className={`w-5 h-5 ${selectedPaymentMethod === 'cash' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <span className={`font-medium text-sm ${selectedPaymentMethod === 'cash' ? 'text-primary' : 'text-foreground'}`}>
                        Cash
                      </span>
                      <span className="text-xs text-muted-foreground">Pay to driver</span>
                    </button>
                  </div>
                </div>
              </div>
              </div>

              <Button 
                variant="hero" 
                size="xl" 
                className="w-full"
                onClick={handleConfirmBooking}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
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
                      {driverInfo.phone && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-500/10">
                            <Phone className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Phone</p>
                            <p className="font-semibold text-foreground">{driverInfo.phone}</p>
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowPaymentModal(true)}
                      className="flex items-center gap-1"
                    >
                      <CreditCard className="w-4 h-4" />
                      Pay Now
                    </Button>
                  )}
                </div>
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