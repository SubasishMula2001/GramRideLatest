import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Navigation, X, Loader2, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

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

interface PendingRide {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  fare: number | null;
  ride_type: 'passenger' | 'goods';
  created_at: string;
  driver_id: string | null;
}

const PendingRideBanner: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [pendingRide, setPendingRide] = useState<PendingRide | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState(true);

  const isBengali = language === 'bn';

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPendingRide = async () => {
      const { data, error } = await supabase
        .from('rides')
        .select('id, pickup_location, dropoff_location, fare, ride_type, created_at, driver_id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setPendingRide(data);
      }
      setLoading(false);
    };

    fetchPendingRide();

    // Subscribe to ride updates
    const channel = supabase
      .channel('pending-ride-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            if (updated.status !== 'pending') {
              setPendingRide(null);
            } else {
              setPendingRide(updated);
            }
          } else if (payload.eventType === 'INSERT' && (payload.new as any).status === 'pending') {
            setPendingRide(payload.new as PendingRide);
          } else if (payload.eventType === 'DELETE') {
            setPendingRide(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCancel = async () => {
    if (!pendingRide) return;

    setCancelling(true);
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'cancelled' })
        .eq('id', pendingRide.id)
        .eq('status', 'pending')
        .is('driver_id', null); // Only cancel if no driver assigned

      if (error) throw error;

      toast.success(isBengali ? 'রাইড বাতিল হয়েছে' : 'Ride cancelled');
      setPendingRide(null);
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(isBengali ? 'বাতিল করতে সমস্যা হয়েছে' : 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !pendingRide) return null;

  // Only show cancel option if no driver assigned
  const canCancel = !pendingRide.driver_id;

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 rounded-2xl p-4 mb-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-full bg-primary/20 animate-pulse">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">
              {isBengali ? 'ড্রাইভার খোঁজা হচ্ছে...' : 'Finding driver...'}
            </span>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Navigation className="w-3.5 h-3.5 text-primary" />
              <span className="truncate">{cleanPlusCode(pendingRide.pickup_location)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-secondary" />
              <span className="truncate">{cleanPlusCode(pendingRide.dropoff_location)}</span>
            </div>
            {pendingRide.fare && (
              <div className="flex items-center gap-1 font-medium text-foreground">
                <IndianRupee className="w-3.5 h-3.5" />
                {pendingRide.fare}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link to="/book" state={{ pendingRideId: pendingRide.id }}>
            <Button size="sm" variant="outline" className="text-xs">
              {isBengali ? 'দেখুন' : 'View'}
            </Button>
          </Link>
          
          {canCancel && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <X className="w-3 h-3 mr-1" />
                  {isBengali ? 'বাতিল' : 'Cancel'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingRideBanner;
