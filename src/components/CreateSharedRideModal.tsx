import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Users, MapPin, Navigation, IndianRupee, Clock, Calendar, ArrowLeftRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SecurePlaceInput from './SecurePlaceInput';

interface CreateSharedRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefillPickup?: string;
  prefillDropoff?: string;
  isReturnTrip?: boolean;
}

interface LocationData {
  address: string;
  lat?: number;
  lng?: number;
}

const CreateSharedRideModal: React.FC<CreateSharedRideModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  prefillPickup = '',
  prefillDropoff = '',
  isReturnTrip = false,
}) => {
  const { t } = useLanguage();
  const isBengali = t.signIn === 'লগইন করুন';
  
  const [isLoading, setIsLoading] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [pickup, setPickup] = useState<LocationData>({ address: prefillPickup });
  const [dropoff, setDropoff] = useState<LocationData>({ address: prefillDropoff });
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [maxPassengers, setMaxPassengers] = useState(4);
  const [farePerPerson, setFarePerPerson] = useState<number | ''>('');
  const [isTwoWay, setIsTwoWay] = useState(false);
  const [returnTime, setReturnTime] = useState('');

  // Set default date and time on open
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      // Add 30 minutes to current time for a reasonable departure
      now.setMinutes(now.getMinutes() + 30);
      
      setDepartureDate(now.toISOString().split('T')[0]);
      setDepartureTime(now.toTimeString().slice(0, 5));
      
      // If return trip, prefill locations (swapped)
      if (isReturnTrip) {
        setPickup({ address: prefillPickup });
        setDropoff({ address: prefillDropoff });
      }
    }
  }, [isOpen, isReturnTrip, prefillPickup, prefillDropoff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pickup.address || !dropoff.address || !departureDate || !departureTime || !farePerPerson) {
      toast.error(isBengali ? 'সব তথ্য দিন' : 'Please fill all fields');
      return;
    }

    if (isTwoWay && !returnTime) {
      toast.error(isBengali ? 'ফেরার সময় দিন' : 'Please set return time');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const departureDateTime = new Date(`${departureDate}T${departureTime}`);
      
      // Create the outbound ride
      const { error: outboundError } = await supabase.from('shared_rides').insert({
        route_name: routeName || `${pickup.address.split(',')[0]} → ${dropoff.address.split(',')[0]}`,
        pickup_location: pickup.address,
        dropoff_location: dropoff.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        departure_time: departureDateTime.toISOString(),
        max_passengers: maxPassengers,
        fare_per_person: farePerPerson,
        created_by: user.id,
      });

      if (outboundError) throw outboundError;

      // If two-way, create the return ride
      if (isTwoWay && returnTime) {
        const returnDateTime = new Date(`${departureDate}T${returnTime}`);
        
        const { error: returnError } = await supabase.from('shared_rides').insert({
          route_name: `${dropoff.address.split(',')[0]} → ${pickup.address.split(',')[0]}` + (isBengali ? ' (ফেরা)' : ' (Return)'),
          pickup_location: dropoff.address,
          dropoff_location: pickup.address,
          pickup_lat: dropoff.lat,
          pickup_lng: dropoff.lng,
          dropoff_lat: pickup.lat,
          dropoff_lng: pickup.lng,
          departure_time: returnDateTime.toISOString(),
          max_passengers: maxPassengers,
          fare_per_person: farePerPerson,
          created_by: user.id,
        });

        if (returnError) throw returnError;
      }

      toast.success(isBengali 
        ? (isTwoWay ? 'দুই-পথের শেয়ার্ড রাইড তৈরি হয়েছে!' : 'শেয়ার্ড রাইড তৈরি হয়েছে!') 
        : (isTwoWay ? 'Two-way shared ride created!' : 'Shared ride created!')
      );
      onCreated();
      onClose();
      
      // Reset form
      setRouteName('');
      setPickup({ address: '' });
      setDropoff({ address: '' });
      setDepartureDate('');
      setDepartureTime('');
      setMaxPassengers(4);
      setFarePerPerson('');
      setIsTwoWay(false);
      setReturnTime('');
    } catch (error) {
      console.error('Error creating shared ride:', error);
      toast.error(isBengali ? 'তৈরি করতে ব্যর্থ' : 'Failed to create ride');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {isReturnTrip 
              ? (isBengali ? 'ফেরার রাইড তৈরি করুন' : 'Create Return Ride')
              : (isBengali ? 'শেয়ার্ড রাইড তৈরি করুন' : 'Create Shared Ride')
            }
          </DialogTitle>
          <DialogDescription>
            {isBengali 
              ? 'অন্যরা যোগ দিতে পারবে এবং ভাড়া ভাগ করবে' 
              : 'Others can join and share the fare'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Route Name */}
          <div className="space-y-2">
            <Label>{isBengali ? 'রুটের নাম (ঐচ্ছিক)' : 'Route Name (optional)'}</Label>
            <Input
              placeholder={isBengali ? 'যেমন: বাজার যাওয়া' : 'e.g., Market Trip'}
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
            />
          </div>

          {/* Pickup */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Navigation className="w-4 h-4 text-primary" />
              {isBengali ? 'পিকআপ স্থান' : 'Pickup Location'}
            </Label>
            <SecurePlaceInput
              type="pickup"
              value={pickup.address}
              onChange={(address, lat, lng) => setPickup({ address, lat, lng })}
              placeholder={isBengali ? 'কোথা থেকে উঠবেন?' : 'Where to pick up?'}
            />
          </div>

          {/* Dropoff */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-secondary" />
              {isBengali ? 'ড্রপ স্থান' : 'Drop Location'}
            </Label>
            <SecurePlaceInput
              type="drop"
              value={dropoff.address}
              onChange={(address, lat, lng) => setDropoff({ address, lat, lng })}
              placeholder={isBengali ? 'কোথায় যাবেন?' : 'Where to go?'}
            />
          </div>

          {/* Two-way Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-primary" />
              <Label htmlFor="two-way" className="cursor-pointer">
                {isBengali ? 'দুই-পথের যাত্রা' : 'Two-way Trip'}
              </Label>
            </div>
            <Switch
              id="two-way"
              checked={isTwoWay}
              onCheckedChange={setIsTwoWay}
            />
          </div>

          {/* Date & Time */}
          <div className={`grid ${isTwoWay ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {isBengali ? 'তারিখ' : 'Date'}
              </Label>
              <Input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {isBengali ? 'যাওয়া' : 'Depart'}
              </Label>
              <Input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
              />
            </div>
            {isTwoWay && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {isBengali ? 'ফেরা' : 'Return'}
                </Label>
                <Input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  required={isTwoWay}
                />
              </div>
            )}
          </div>

          {/* Max Passengers & Fare */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {isBengali ? 'সর্বোচ্চ যাত্রী' : 'Max Passengers'}
              </Label>
              <Input
                type="number"
                min={2}
                max={8}
                value={maxPassengers}
                onChange={(e) => setMaxPassengers(parseInt(e.target.value) || 4)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                {isBengali ? 'ভাড়া/জন' : 'Fare/Person'}
              </Label>
              <Input
                type="number"
                min={10}
                placeholder="₹"
                value={farePerPerson}
                onChange={(e) => setFarePerPerson(e.target.value ? parseInt(e.target.value) : '')}
                required
              />
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isBengali ? 'তৈরি হচ্ছে...' : 'Creating...'}
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                {isTwoWay 
                  ? (isBengali ? 'দুই-পথের রাইড তৈরি করুন' : 'Create Two-way Ride')
                  : (isBengali ? 'শেয়ার্ড রাইড তৈরি করুন' : 'Create Shared Ride')
                }
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSharedRideModal;
