import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Plus, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import SharedRideCard from '@/components/SharedRideCard';
import CreateSharedRideModal from '@/components/CreateSharedRideModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SharedRide {
  id: string;
  route_name: string;
  pickup_location: string;
  dropoff_location: string;
  departure_time: string;
  fare_per_person: number;
  max_passengers: number;
  status: 'open' | 'full' | 'in_progress' | 'completed';
  current_passengers: number;
  is_joined: boolean;
}

const SharedRides = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isBengali = t.signIn === 'লগইন করুন';

  const [rides, setRides] = useState<SharedRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningRide, setJoiningRide] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchSharedRides = async () => {
    try {
      // Fetch shared rides
      const { data: ridesData, error } = await supabase
        .from('shared_rides')
        .select('*')
        .in('status', ['open', 'full'])
        .gte('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true });

      if (error) throw error;

      if (!ridesData || ridesData.length === 0) {
        setRides([]);
        return;
      }

      // Get passenger counts and check if user joined
      const ridesWithDetails = await Promise.all(
        ridesData.map(async (ride) => {
          // Get passenger count
          const { data: countData } = await supabase.rpc('get_shared_ride_passenger_count', {
            ride_id: ride.id
          });

          // Check if current user joined
          let isJoined = false;
          if (user) {
            const { data: joinData } = await supabase
              .from('shared_ride_passengers')
              .select('id')
              .eq('shared_ride_id', ride.id)
              .eq('user_id', user.id)
              .maybeSingle();
            isJoined = !!joinData;
          }

          return {
            ...ride,
            current_passengers: countData || 0,
            is_joined: isJoined,
          } as SharedRide;
        })
      );

      setRides(ridesWithDetails);
    } catch (error) {
      console.error('Error fetching shared rides:', error);
      toast.error(isBengali ? 'রাইড লোড করতে ব্যর্থ' : 'Failed to load rides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedRides();

    // Subscribe to changes
    const channel = supabase
      .channel('shared-rides-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shared_rides' },
        () => fetchSharedRides()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shared_ride_passengers' },
        () => fetchSharedRides()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleJoinRide = async (rideId: string) => {
    if (!user) {
      toast.error(isBengali ? 'প্রথমে লগইন করুন' : 'Please login first');
      return;
    }

    setJoiningRide(rideId);
    try {
      const { error } = await supabase.from('shared_ride_passengers').insert({
        shared_ride_id: rideId,
        user_id: user.id,
        seats_booked: 1,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error(isBengali ? 'আপনি ইতিমধ্যে যোগ দিয়েছেন' : 'You already joined this ride');
        } else {
          throw error;
        }
        return;
      }

      toast.success(isBengali ? 'রাইডে যোগ দিয়েছেন!' : 'Joined the ride!');
      fetchSharedRides();
    } catch (error) {
      console.error('Error joining ride:', error);
      toast.error(isBengali ? 'যোগ দিতে ব্যর্থ' : 'Failed to join ride');
    } finally {
      setJoiningRide(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link to="/book">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  {isBengali ? 'শেয়ার্ড রাইড' : 'Shared Rides'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isBengali ? 'একসাথে যান, ভাড়া ভাগ করুন' : 'Travel together, share the fare'}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                setLoading(true);
                fetchSharedRides();
              }}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Create Button */}
          <Button 
            className="w-full mb-6" 
            size="lg"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            {isBengali ? 'নতুন শেয়ার্ড রাইড তৈরি করুন' : 'Create New Shared Ride'}
          </Button>

          {/* Rides List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : rides.length === 0 ? (
            <div className="text-center py-12 bg-gradient-card rounded-2xl border border-border/50">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {isBengali ? 'কোনো শেয়ার্ড রাইড নেই' : 'No Shared Rides Available'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isBengali 
                  ? 'প্রথম শেয়ার্ড রাইড তৈরি করুন!' 
                  : 'Be the first to create a shared ride!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rides.map((ride) => (
                <SharedRideCard
                  key={ride.id}
                  id={ride.id}
                  routeName={ride.route_name}
                  pickup={ride.pickup_location}
                  dropoff={ride.dropoff_location}
                  departureTime={ride.departure_time}
                  farePerPerson={ride.fare_per_person}
                  currentPassengers={ride.current_passengers}
                  maxPassengers={ride.max_passengers}
                  status={ride.status}
                  isJoined={ride.is_joined}
                  isLoading={joiningRide === ride.id}
                  onJoin={() => handleJoinRide(ride.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      <CreateSharedRideModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchSharedRides}
      />
    </div>
  );
};

export default SharedRides;
