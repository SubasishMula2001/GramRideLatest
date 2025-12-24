import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Package, IndianRupee, Clock, MapPin, Navigation, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GramRideLogo from '@/components/GramRideLogo';
import BookingTypeCard from '@/components/BookingTypeCard';
import LocationInput from '@/components/LocationInput';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type BookingType = 'passenger' | 'goods' | null;
type BookingStep = 'type' | 'location' | 'confirm' | 'searching' | 'booked';

const BookRide = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [bookingType, setBookingType] = useState<BookingType>(null);
  const [step, setStep] = useState<BookingStep>('type');
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [loading, setLoading] = useState(false);
  const [rideId, setRideId] = useState<string | null>(null);
  
  // Estimated values
  const estimatedDistance = 3.5;
  const estimatedTime = 12;
  const baseFare = bookingType === 'passenger' ? 20 : 30;
  const perKmRate = bookingType === 'passenger' ? 8 : 12;
  const estimatedFare = Math.round(baseFare + (estimatedDistance * perKmRate));

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please login to book a ride');
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Subscribe to ride updates when waiting for driver
  useEffect(() => {
    if (!rideId || step !== 'searching') return;

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
        (payload) => {
          const updatedRide = payload.new as any;
          if (updatedRide.status === 'accepted') {
            setStep('booked');
            toast.success('Driver found! Your ride is confirmed.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId, step]);

  const handleTypeSelect = (type: BookingType) => {
    setBookingType(type);
    setStep('location');
  };

  const handleLocationSubmit = () => {
    if (pickup && drop) {
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
      const { data, error } = await supabase
        .from('rides')
        .insert({
          user_id: user.id,
          ride_type: bookingType,
          pickup_location: pickup,
          dropoff_location: drop,
          fare: estimatedFare,
          distance_km: estimatedDistance,
          duration_mins: estimatedTime,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setRideId(data.id);
      setStep('searching');
      toast.success('Booking created! Finding a driver...');

      // Log the activity
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'Ride Booked',
        details: { 
          ride_id: data.id, 
          ride_type: bookingType,
          pickup: pickup,
          drop: drop,
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

              <div className="space-y-4 mb-8">
                <LocationInput
                  type="pickup"
                  value={pickup}
                  onChange={setPickup}
                  placeholder="Enter pickup location"
                />
                
                <div className="flex items-center justify-center">
                  <div className="w-px h-8 bg-border relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">↓</span>
                    </div>
                  </div>
                </div>
                
                <LocationInput
                  type="drop"
                  value={drop}
                  onChange={setDrop}
                  placeholder="Enter drop location"
                />
              </div>

              <Button 
                variant="hero" 
                size="xl" 
                className="w-full"
                onClick={handleLocationSubmit}
                disabled={!pickup || !drop}
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
                      <p className="text-foreground font-medium">{pickup}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-1.5 rounded-full bg-secondary/10">
                      <MapPin className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase">Drop</p>
                      <p className="text-foreground font-medium">{drop}</p>
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
                  <span className="text-foreground">{pickup}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-secondary" />
                  <span className="text-foreground">{drop}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step: Booked Successfully */}
          {step === 'booked' && (
            <div className="animate-fade-in text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Ride Confirmed!
              </h1>
              <p className="text-muted-foreground mb-8">
                Your driver is on the way to pick you up
              </p>
              
              <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 text-left mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Navigation className="w-5 h-5 text-primary" />
                  <span className="text-foreground">{pickup}</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-secondary" />
                  <span className="text-foreground">{drop}</span>
                </div>
                <div className="border-t border-border pt-4 flex items-center justify-between">
                  <span className="text-muted-foreground">Fare</span>
                  <span className="text-xl font-bold text-primary flex items-center">
                    <IndianRupee className="w-5 h-5" />
                    {estimatedFare}
                  </span>
                </div>
              </div>

              <Button variant="hero" size="xl" className="w-full" asChild>
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default BookRide;
