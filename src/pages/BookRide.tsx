import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Package, IndianRupee, Clock, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GramRideLogo from '@/components/GramRideLogo';
import BookingTypeCard from '@/components/BookingTypeCard';
import LocationInput from '@/components/LocationInput';

type BookingType = 'passenger' | 'goods' | null;
type BookingStep = 'type' | 'location' | 'confirm';

const BookRide = () => {
  const [bookingType, setBookingType] = useState<BookingType>(null);
  const [step, setStep] = useState<BookingStep>('type');
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');

  const handleTypeSelect = (type: BookingType) => {
    setBookingType(type);
    setStep('location');
  };

  const handleLocationSubmit = () => {
    if (pickup && drop) {
      setStep('confirm');
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

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {step !== 'type' && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <GramRideLogo size="md" />
          </div>
          
          <Button variant="ghost" asChild>
            <Link to="/">Home</Link>
          </Button>
        </div>
      </header>

      <main className="pt-24 pb-12 px-4">
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
                    <span className="font-semibold text-foreground">3.5 km</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estimated Time</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      12 min
                    </span>
                  </div>
                  <div className="border-t border-border pt-3 flex items-center justify-between">
                    <span className="font-medium text-foreground">Estimated Fare</span>
                    <span className="text-xl font-bold text-primary flex items-center">
                      <IndianRupee className="w-5 h-5" />
                      45
                    </span>
                  </div>
                </div>
              </div>

              <Button variant="hero" size="xl" className="w-full">
                Confirm Booking
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-4">
                You'll be matched with a nearby driver
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default BookRide;
