import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Users, MapPin, Navigation, IndianRupee, Clock, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LocationInput from './LocationInput';

interface CreateSharedRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
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
}) => {
  const { t } = useLanguage();
  const isBengali = t.signIn === 'লগইন করুন';
  
  const [isLoading, setIsLoading] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [pickup, setPickup] = useState<LocationData>({ address: '' });
  const [dropoff, setDropoff] = useState<LocationData>({ address: '' });
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [maxPassengers, setMaxPassengers] = useState(4);
  const [farePerPerson, setFarePerPerson] = useState<number | ''>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pickup.address || !dropoff.address || !departureDate || !departureTime || !farePerPerson) {
      toast.error(isBengali ? 'সব তথ্য দিন' : 'Please fill all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const departureDateTime = new Date(`${departureDate}T${departureTime}`);
      
      const { error } = await supabase.from('shared_rides').insert({
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

      if (error) throw error;

      toast.success(isBengali ? 'শেয়ার্ড রাইড তৈরি হয়েছে!' : 'Shared ride created!');
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
            {isBengali ? 'শেয়ার্ড রাইড তৈরি করুন' : 'Create Shared Ride'}
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
            <LocationInput
              type="pickup"
              value={pickup.address}
              onChange={(address) => setPickup({ ...pickup, address })}
              placeholder={isBengali ? 'কোথা থেকে উঠবেন?' : 'Where to pick up?'}
            />
          </div>

          {/* Dropoff */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-secondary" />
              {isBengali ? 'ড্রপ স্থান' : 'Drop Location'}
            </Label>
            <LocationInput
              type="drop"
              value={dropoff.address}
              onChange={(address) => setDropoff({ ...dropoff, address })}
              placeholder={isBengali ? 'কোথায় যাবেন?' : 'Where to go?'}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
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
                {isBengali ? 'সময়' : 'Time'}
              </Label>
              <Input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
              />
            </div>
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
                {isBengali ? 'শেয়ার্ড রাইড তৈরি করুন' : 'Create Shared Ride'}
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSharedRideModal;
