import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Power, 
  TrendingUp, 
  Clock, 
  Star, 
  IndianRupee, 
  Navigation,
  Bell,
  User,
  ArrowLeft,
  LogOut,
  Loader2,
  MapPin,
  CheckCircle,
  XCircle,
  Phone,
  Package,
  Car,
  CircleDot,
  Locate,
  KeyRound,
  Smartphone,
  Banknote,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import GramRideLogo from '@/components/GramRideLogo';
import RideCard from '@/components/RideCard';
import SecureRouteMap from '@/components/SecureRouteMap';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDriverLocationTracking } from '@/hooks/useDriverLocationTracking';

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

// Helper to fetch platform commission percentage from app_settings
const getCommissionPercent = async (): Promise<number> => {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'platform_commission_percent')
      .single();
    if (data?.value != null) {
      const val = typeof data.value === 'string' ? parseFloat(data.value) : Number(data.value);
      return isNaN(val) ? 0 : val;
    }
  } catch {}
  return 0;
};

interface PendingRide {
  id: string;
  ride_type: 'passenger' | 'goods';
  pickup_location: string;
  dropoff_location: string;
  fare: number;
  distance_km: number;
  user_id: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
}

interface ActiveRide {
  id: string;
  ride_type: 'passenger' | 'goods';
  pickup_location: string;
  dropoff_location: string;
  fare: number;
  distance_km: number;
  status: 'accepted' | 'in_progress';
  user_name: string | null;
  user_phone: string | null;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  otp?: string;
  payment_method?: 'upi' | 'cash' | null;
}

interface PendingPaymentRide {
  id: string;
  fare: number;
  pickup_location: string;
  dropoff_location: string;
  completed_at: string;
  user_name: string | null;
}

type PaymentConfirmMethod = 'upi' | 'cash';

type PaymentContext = {
  rideId: string;
  fare: number;
  existingPaymentMethod?: 'upi' | 'cash' | null;
  upiPaymentCompleted?: boolean;
  upiTransactionId?: string | null;
};

interface DriverData {
  id: string;
  is_available: boolean;
  is_verified: boolean;
  rating: number;
  total_rides: number;
  earnings: number;
}

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  
  const [isOnline, setIsOnline] = useState(false);
  const [pendingRides, setPendingRides] = useState<PendingRide[]>([]);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [pendingPaymentRides, setPendingPaymentRides] = useState<PendingPaymentRide[]>([]);
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingRide, setProcessingRide] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false);
  const [selectedPaymentConfirm, setSelectedPaymentConfirm] = useState<PaymentConfirmMethod>('cash');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentContext, setPaymentContext] = useState<PaymentContext | null>(null);
  const [upiPaidLive, setUpiPaidLive] = useState<{ paid: boolean; transactionId: string | null }>({ paid: false, transactionId: null });

  // Track driver location during active rides
  useDriverLocationTracking({
    driverId: driverData?.id || null,
    isActive: !!activeRide,
    updateIntervalMs: 10000 // Update every 10 seconds
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    
    if (user) {
      fetchDriverData();
    }
  }, [user, authLoading]);

  // Fetch active ride and pending payment rides when driverData is available
  useEffect(() => {
    const loadActiveRide = async () => {
      if (!driverData?.id) return;

      console.log('Fetching active ride for driver:', driverData.id);
      
      try {
        // Get the most recent active ride (order by accepted_at desc, limit 1)
        const { data, error } = await supabase
          .from('rides')
          .select(`
            id,
            ride_type,
            pickup_location,
            dropoff_location,
            fare,
            distance_km,
            status,
            user_id,
            pickup_lat,
            pickup_lng,
            dropoff_lat,
            dropoff_lng,
            otp,
            payment_method,
            accepted_at
          `)
          .eq('driver_id', driverData.id)
          .in('status', ['accepted', 'in_progress'])
          .order('accepted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('Active ride query result:', { data, error });

        if (error) {
          console.error('Error fetching active ride:', error);
          return;
        }

        if (data) {
          // Fetch user profile separately
          let userName = 'Customer';
          let userPhone: string | null = null;
          if (data.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, phone')
              .eq('id', data.user_id)
              .maybeSingle();
            
            if (profileData?.full_name) {
              userName = profileData.full_name;
            }
            if (profileData?.phone) {
              userPhone = profileData.phone;
            }
          }

          console.log('Setting active ride:', data.id, data.status);
          
          setActiveRide({
            id: data.id,
            ride_type: data.ride_type,
            pickup_location: data.pickup_location,
            dropoff_location: data.dropoff_location,
            fare: data.fare || 0,
            distance_km: data.distance_km || 0,
            status: data.status as 'accepted' | 'in_progress',
            user_name: userName,
            user_phone: userPhone,
            pickup_lat: data.pickup_lat,
            pickup_lng: data.pickup_lng,
            dropoff_lat: data.dropoff_lat,
            dropoff_lng: data.dropoff_lng,
            otp: data.otp || undefined,
            payment_method: data.payment_method as 'upi' | 'cash' | null
          });
        } else {
          console.log('No active ride found for driver');
          setActiveRide(null);
        }
      } catch (error) {
        console.error('Error in loadActiveRide:', error);
      }
    };

    if (driverData?.id) {
      loadActiveRide();
      fetchPendingPaymentRides();
    }
  }, [driverData?.id]);

  // Subscribe to payment status changes for active ride
  useEffect(() => {
    if (!activeRide?.id) {
      setUpiPaidLive({ paid: false, transactionId: null });
      return;
    }

    // Check existing payment status on mount
    const checkExistingPayment = async () => {
      const { data } = await supabase
        .from('payments')
        .select('payment_status, razorpay_payment_id, payment_method')
        .eq('ride_id', activeRide.id)
        .eq('payment_status', 'completed')
        .eq('payment_method', 'upi')
        .maybeSingle();
      
      if (data) {
        setUpiPaidLive({ paid: true, transactionId: data.razorpay_payment_id });
        toast.success('UPI Payment received from customer! ✅');
      }
    };
    checkExistingPayment();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`payment-status-${activeRide.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `ride_id=eq.${activeRide.id}`
        },
        (payload: any) => {
          const record = payload.new;
          if (record?.payment_status === 'completed' && record?.payment_method === 'upi') {
            setUpiPaidLive({ paid: true, transactionId: record.razorpay_payment_id || null });
            toast.success('UPI Payment received from customer! ✅');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRide?.id]);

  // Subscribe to payment updates for pending payment rides (completed rides awaiting payment)
  useEffect(() => {
    if (!driverData?.id) return;

    // Listen for payment completions and ride payment_status changes
    const channel = supabase
      .channel(`driver-pending-payments-${driverData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${driverData.id}`
        },
        (payload: any) => {
          const updatedRide = payload.new;
          // If a pending payment ride just got its payment completed (e.g. user paid via UPI)
          if (updatedRide?.status === 'completed' && updatedRide?.payment_status === 'completed') {
            setPendingPaymentRides(prev => {
              const wasPresent = prev.some(r => r.id === updatedRide.id);
              if (wasPresent) {
                toast.success(`Payment received for ride! ₹${updatedRide.fare} via ${updatedRide.payment_method === 'upi' ? 'UPI' : 'Cash'} ✅`);
              }
              return prev.filter(r => r.id !== updatedRide.id);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverData?.id]);

  // Subscribe to pending rides when online
  useEffect(() => {
    if (!isOnline || !driverData?.is_verified) return;

    fetchPendingRides();

    const channel = supabase
      .channel('pending-rides')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rides',
          filter: 'status=eq.pending'
        },
        (payload) => {
          console.log('New ride:', payload);
          fetchPendingRides();
          toast.info('New ride request available!');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides'
        },
        () => {
          fetchPendingRides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, driverData]);

  const fetchDriverData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, is_available, is_verified, rating, total_rides, earnings')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDriverData(data);
        setIsOnline(data.is_available);
      }
    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRides = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          id,
          ride_type,
          pickup_location,
          dropoff_location,
          fare,
          distance_km,
          user_id,
          pickup_lat,
          pickup_lng,
          dropoff_lat,
          dropoff_lng
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingRides((data || []) as PendingRide[]);
    } catch (error) {
      console.error('Error fetching pending rides:', error);
    }
  };

  const fetchActiveRide = async () => {
    if (!driverData) return;

    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          id,
          ride_type,
          pickup_location,
          dropoff_location,
          fare,
          distance_km,
          status,
          user_id,
          pickup_lat,
          pickup_lng,
          dropoff_lat,
          dropoff_lng,
          otp,
          payment_method
        `)
        .eq('driver_id', driverData.id)
        .in('status', ['accepted', 'in_progress'])
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Fetch user profile separately
        let userName = 'Customer';
        let userPhone: string | null = null;
        if (data.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', data.user_id)
            .maybeSingle();
          
          if (profileData?.full_name) {
            userName = profileData.full_name;
          }
          if (profileData?.phone) {
            userPhone = profileData.phone;
          }
        }

        setActiveRide({
          id: data.id,
          ride_type: data.ride_type,
          pickup_location: data.pickup_location,
          dropoff_location: data.dropoff_location,
          fare: data.fare || 0,
          distance_km: data.distance_km || 0,
          status: data.status as 'accepted' | 'in_progress',
          user_name: userName,
          user_phone: userPhone,
          pickup_lat: data.pickup_lat,
          pickup_lng: data.pickup_lng,
          dropoff_lat: data.dropoff_lat,
          dropoff_lng: data.dropoff_lng,
          otp: data.otp || undefined,
          payment_method: data.payment_method as 'upi' | 'cash' | null
        });
      } else {
        setActiveRide(null);
      }
    } catch (error) {
      console.error('Error fetching active ride:', error);
    }
  };

  const fetchPendingPaymentRides = async () => {
    if (!driverData) return;

    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          id,
          fare,
          pickup_location,
          dropoff_location,
          completed_at,
          user_id
        `)
        .eq('driver_id', driverData.id)
        .eq('status', 'completed')
        .eq('payment_status', 'pending')
        .order('completed_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch user names for each ride
        const ridesWithNames: PendingPaymentRide[] = await Promise.all(
          data.map(async (ride) => {
            let userName = 'Customer';
            if (ride.user_id) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', ride.user_id)
                .maybeSingle();
              if (profileData?.full_name) {
                userName = profileData.full_name;
              }
            }
            return {
              id: ride.id,
              fare: ride.fare || 0,
              pickup_location: ride.pickup_location,
              dropoff_location: ride.dropoff_location,
              completed_at: ride.completed_at || '',
              user_name: userName,
            };
          })
        );
        setPendingPaymentRides(ridesWithNames);
      } else {
        setPendingPaymentRides([]);
      }
    } catch (error) {
      console.error('Error fetching pending payment rides:', error);
    }
  };

  const handleToggleOnline = async () => {
    if (!driverData) return;

    const newStatus = !isOnline;
    
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ is_available: newStatus })
        .eq('id', driverData.id);

      if (error) throw error;

      setIsOnline(newStatus);
      
      if (newStatus) {
        toast.success("You're now online! Waiting for ride requests.");
      } else {
        toast.info("You're now offline.");
        setPendingRides([]);
      }

      // Log activity with device info
      if (user?.id) {
        const { logActivity } = await import('@/hooks/useActivityLog');
        await logActivity({
          userId: user.id,
          action: newStatus ? 'Driver went online' : 'Driver went offline',
          details: { driver_id: driverData.id }
        });
      }

    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    if (!driverData) return;

    setProcessingRide(rideId);
    try {
      // Get ride details first
      const { data: rideData, error: fetchError } = await supabase
        .from('rides')
        .select(`
          id,
          ride_type,
          pickup_location,
          dropoff_location,
          fare,
          distance_km,
          user_id,
          pickup_lat,
          pickup_lng,
          dropoff_lat,
          dropoff_lng,
          otp,
          payment_method
        `)
        .eq('id', rideId)
        .single();

      if (fetchError) throw fetchError;

      // Fetch user profile separately
      let userName = 'Customer';
      let userPhone: string | null = null;
      if (rideData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', rideData.user_id)
          .maybeSingle();
        
        if (profileData?.full_name) {
          userName = profileData.full_name;
        }
        if (profileData?.phone) {
          userPhone = profileData.phone;
        }
      }

      // Use atomic RPC function to prevent race conditions
      const { data: success, error } = await supabase.rpc('accept_ride', {
        _ride_id: rideId,
        _driver_id: driverData.id
      });

      if (error) throw error;

      if (!success) {
        toast.error('This ride was already accepted by another driver');
        setPendingRides(prev => prev.filter(r => r.id !== rideId));
        return;
      }

      toast.success('Ride accepted! Navigate to pickup location.');
      setPendingRides(prev => prev.filter(r => r.id !== rideId));

      // Set active ride
      setActiveRide({
        id: rideData.id,
        ride_type: rideData.ride_type,
        pickup_location: rideData.pickup_location,
        dropoff_location: rideData.dropoff_location,
        fare: rideData.fare || 0,
        distance_km: rideData.distance_km || 0,
        status: 'accepted',
        user_name: userName,
        user_phone: userPhone,
        pickup_lat: rideData.pickup_lat,
        pickup_lng: rideData.pickup_lng,
        dropoff_lat: rideData.dropoff_lat,
        dropoff_lng: rideData.dropoff_lng,
        otp: rideData.otp || undefined,
        payment_method: rideData.payment_method as 'upi' | 'cash' | null
      });

      // Update driver stats
      await supabase
        .from('drivers')
        .update({ total_rides: (driverData.total_rides || 0) + 1 })
        .eq('id', driverData.id);

      // Log activity with device info
      if (user?.id) {
        const { logActivity } = await import('@/hooks/useActivityLog');
        await logActivity({
          userId: user.id,
          action: 'Ride Accepted',
          details: { ride_id: rideId, driver_id: driverData.id }
        });
      }

    } catch (error) {
      console.error('Error accepting ride:', error);
      toast.error('Failed to accept ride');
    } finally {
      setProcessingRide(null);
    }
  };

  const handleStartRide = async () => {
    if (!activeRide || !driverData) return;

    // Validate OTP
    if (activeRide.otp && otpInput !== activeRide.otp) {
      setOtpError(true);
      toast.error('Invalid OTP. Please check with the customer.');
      return;
    }

    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'in_progress' })
        .eq('id', activeRide.id);

      if (error) throw error;

      setActiveRide(prev => prev ? { ...prev, status: 'in_progress' } : null);
      setOtpInput('');
      setOtpError(false);
      toast.success('Ride started!');

      // Log activity with device info
      if (user?.id) {
        const { logActivity } = await import('@/hooks/useActivityLog');
        await logActivity({
          userId: user.id,
          action: 'Ride Started',
          details: { ride_id: activeRide.id, driver_id: driverData.id }
        });
      }
    } catch (error) {
      console.error('Error starting ride:', error);
      toast.error('Failed to start ride');
    }
  };

  const handleFinishRide = async () => {
    if (!activeRide) return;
    
    // Use live state if available, otherwise check DB
    let upiPaymentCompleted = upiPaidLive.paid;
    let upiTransactionId: string | null = upiPaidLive.transactionId;
    let onlinePaymentCompleted = false;
    let onlinePaymentMethod: string | null = null;
    
    if (!upiPaymentCompleted) {
      try {
        // Check payments table for any completed online payment
        const { data: paymentData } = await supabase
          .from('payments')
          .select('payment_status, razorpay_payment_id, payment_method')
          .eq('ride_id', activeRide.id)
          .eq('payment_status', 'completed')
          .maybeSingle();
        
        if (paymentData) {
          if (paymentData.payment_method === 'upi') {
            upiPaymentCompleted = true;
            upiTransactionId = paymentData.razorpay_payment_id;
          }
          onlinePaymentCompleted = true;
          onlinePaymentMethod = paymentData.payment_method;
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    } else {
      onlinePaymentCompleted = true;
      onlinePaymentMethod = 'upi';
    }

    // Also check the ride's own payment_status (may have been updated by realtime)
    if (!onlinePaymentCompleted) {
      try {
        const { data: rideData } = await supabase
          .from('rides')
          .select('payment_status, payment_method')
          .eq('id', activeRide.id)
          .single();
        
        if (rideData?.payment_status === 'completed') {
          onlinePaymentCompleted = true;
          onlinePaymentMethod = rideData.payment_method;
          if (rideData.payment_method === 'upi') {
            upiPaymentCompleted = true;
          }
        }
      } catch (error) {
        console.error('Error checking ride payment status:', error);
      }
    }
    
    // If any online payment is already completed, auto-complete the ride without showing modal
    if (onlinePaymentCompleted) {
      setProcessingPayment(true);
      try {
        const methodLabel = onlinePaymentMethod === 'upi' ? 'UPI' : (onlinePaymentMethod || 'Online');
        
        const { error } = await supabase
          .from('rides')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            payment_status: 'completed',
            payment_method: (onlinePaymentMethod || 'upi') as 'upi' | 'cash' | 'wallet'
          })
          .eq('id', activeRide.id);

        if (error) throw error;

        // Update earnings (apply platform commission)
        const commissionPercent = await getCommissionPercent();
        const driverEarning = activeRide.fare - (activeRide.fare * commissionPercent / 100);
        await supabase
          .from('drivers')
          .update({ earnings: (driverData.earnings || 0) + driverEarning })
          .eq('id', driverData.id);

        toast.success(`Ride completed! ₹${activeRide.fare} received via ${methodLabel} ✅`);
        setActiveRide(null);
        setUpiPaidLive({ paid: false, transactionId: null });
        fetchDriverData();

        if (user?.id) {
          const { logActivity } = await import('@/hooks/useActivityLog');
          await logActivity({
            userId: user.id,
            action: `Ride Completed with ${methodLabel} Payment (Auto)`,
            details: { ride_id: activeRide.id, driver_id: driverData.id, fare: activeRide.fare }
          });
        }
      } catch (error) {
        console.error('Error auto-completing ride:', error);
        toast.error('Failed to complete ride');
      } finally {
        setProcessingPayment(false);
      }
      return;
    }
    
    // No online payment found - show the confirmation modal for cash
    setPaymentContext({
      rideId: activeRide.id,
      fare: activeRide.fare,
      existingPaymentMethod: activeRide.payment_method,
      upiPaymentCompleted: false,
      upiTransactionId: null,
    });
    setSelectedPaymentConfirm((activeRide.payment_method || 'cash') as PaymentConfirmMethod);
    setShowPaymentConfirmModal(true);
  };

  const handleConfirmPayment = async (paymentReceived: boolean = true) => {
    if (!driverData) return;

    const rideId = paymentContext?.rideId ?? activeRide?.id;
    const fare = paymentContext?.fare ?? activeRide?.fare;

    if (!rideId || fare == null) return;

    setProcessingPayment(true);
    try {
      // Only the cash flow has a backend function (creates a payments row + links it)
      if (paymentReceived && selectedPaymentConfirm === 'cash') {
        const { error: paymentError } = await supabase.functions.invoke('process-cash-payment', {
          body: {
            ride_id: rideId,
            amount: fare,
            confirmed_by: 'driver',
          },
        });

        if (paymentError) console.error('Payment confirmation error:', paymentError);
      }

      // Update ride status to completed
      const { error } = await supabase
        .from('rides')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          payment_status: paymentReceived ? 'completed' : 'pending',
          // Driver selects the method regardless of paid/unpaid
          payment_method: selectedPaymentConfirm
        })
        .eq('id', rideId);

      if (error) throw error;

      // Update earnings only if payment was received (apply platform commission)
      if (paymentReceived) {
        const commissionPercent = await getCommissionPercent();
        const driverEarning = fare - (fare * commissionPercent / 100);
        await supabase
          .from('drivers')
          .update({ earnings: (driverData.earnings || 0) + driverEarning })
          .eq('id', driverData.id);
      }

      if (paymentReceived) {
        const paymentLabel = selectedPaymentConfirm === 'upi' ? 'UPI' : 'Cash';
        toast.success(`Ride completed! ₹${fare} received via ${paymentLabel}`);
      } else {
        toast.warning(`Ride completed. Payment pending from customer.`);
      }
      
      setShowPaymentConfirmModal(false);
      setPaymentContext(null);
      setActiveRide(null);
      
      // Refresh driver data
      fetchDriverData();

      // Log activity with device info
      if (user?.id) {
        const { logActivity } = await import('@/hooks/useActivityLog');
        await logActivity({
          userId: user.id,
          action: paymentReceived ? 'Ride Completed with Payment' : 'Ride Completed - Payment Pending',
          details: { 
            ride_id: rideId, 
            driver_id: driverData.id, 
            fare,
            payment_method: selectedPaymentConfirm,
            payment_received: paymentReceived
          }
        });
      }
    } catch (error) {
      console.error('Error finishing ride:', error);
      toast.error('Failed to complete ride');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleAcceptPendingPayment = async (ride: PendingPaymentRide) => {
    // First check if UPI payment was already completed by the user
    try {
      const { data: paymentData } = await supabase
        .from('payments')
        .select('payment_status, razorpay_payment_id, payment_method')
        .eq('ride_id', ride.id)
        .eq('payment_status', 'completed')
        .eq('payment_method', 'upi')
        .maybeSingle();

      if (paymentData) {
        // UPI already paid - auto-confirm without showing modal
        toast.success(`Payment already received via UPI! ₹${ride.fare} ✅`);
        
        // Update ride payment status
        await supabase
          .from('rides')
          .update({ 
            payment_status: 'completed',
            payment_method: 'upi'
          })
          .eq('id', ride.id);

        // Update earnings
        if (driverData) {
          const commissionPercent = await getCommissionPercent();
          const driverEarning = ride.fare - (ride.fare * commissionPercent / 100);
          await supabase
            .from('drivers')
            .update({ earnings: (driverData.earnings || 0) + driverEarning })
            .eq('id', driverData.id);
        }

        setPendingPaymentRides(prev => prev.filter(r => r.id !== ride.id));
        fetchDriverData();
        return;
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }

    // No UPI payment found - show the confirmation modal for cash
    setPaymentContext({
      rideId: ride.id,
      fare: ride.fare,
      existingPaymentMethod: null,
    });
    setSelectedPaymentConfirm('cash');
    setShowPaymentConfirmModal(true);
  };

  const handleConfirmPendingPayment = async () => {
    if (!driverData || !paymentContext) return;

    setProcessingPayment(true);
    try {
      // Use cash payment function if cash selected
      if (selectedPaymentConfirm === 'cash') {
        await supabase.functions.invoke('process-cash-payment', {
          body: {
            ride_id: paymentContext.rideId,
            amount: paymentContext.fare,
            confirmed_by: 'driver',
          },
        });
      }

      // Update ride payment status to completed
      const { error } = await supabase
        .from('rides')
        .update({ 
          payment_status: 'completed',
          payment_method: selectedPaymentConfirm
        })
        .eq('id', paymentContext.rideId);

      if (error) throw error;

      // Update earnings (apply platform commission)
      const commissionPercent = await getCommissionPercent();
      const driverEarning = paymentContext.fare - (paymentContext.fare * commissionPercent / 100);
      await supabase
        .from('drivers')
        .update({ earnings: (driverData.earnings || 0) + driverEarning })
        .eq('id', driverData.id);

      toast.success(`Payment received! ₹${paymentContext.fare} via ${selectedPaymentConfirm === 'upi' ? 'UPI' : 'Cash'}`);
      
      setShowPaymentConfirmModal(false);
      setPaymentContext(null);
      setPendingPaymentRides(prev => prev.filter(r => r.id !== paymentContext.rideId));
      fetchDriverData();

      // Log activity with device info
      if (user?.id) {
        const { logActivity } = await import('@/hooks/useActivityLog');
        await logActivity({
          userId: user.id,
          action: 'Pending Payment Collected',
          details: { 
            ride_id: paymentContext.rideId, 
            driver_id: driverData.id, 
            fare: paymentContext.fare,
            payment_method: selectedPaymentConfirm
          }
        });
      }
    } catch (error) {
      console.error('Error collecting payment:', error);
      toast.error('Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const paymentFare = paymentContext?.fare ?? activeRide?.fare ?? 0;

  const handleDeclineRide = (rideId: string) => {
    setPendingRides(prev => prev.filter(r => r.id !== rideId));
  };

  const handleLogout = async () => {
    try {
      // Go offline before logout
      if (driverData && isOnline) {
        await supabase
          .from('drivers')
          .update({ is_available: false })
          .eq('id', driverData.id);
      }
      
      await signOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!driverData) {
    // Redirect to registration page
    navigate('/driver/register');
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
          
          {/* Verification Warning */}
          {!driverData.is_verified && (
            <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 mb-6">
              <p className="text-secondary font-medium">⚠️ Your account is pending verification</p>
              <p className="text-sm text-muted-foreground">You cannot receive rides until verified by admin.</p>
            </div>
          )}

          {/* Online Toggle Card */}
          <div className={`
            rounded-2xl p-6 mb-6 transition-all duration-500
            ${isOnline 
              ? 'bg-gradient-primary shadow-glow' 
              : 'bg-gradient-card border border-border/50 shadow-card'
            }
          `}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-bold ${isOnline ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {isOnline ? "You're Online" : "You're Offline"}
                </h2>
                <p className={`text-sm ${isOnline ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {isOnline ? 'Waiting for ride requests...' : 'Go online to receive rides'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Power className={`w-6 h-6 ${isOnline ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                <Switch
                  checked={isOnline}
                  onCheckedChange={handleToggleOnline}
                  disabled={!driverData.is_verified}
                  className="data-[state=checked]:bg-secondary"
                />
              </div>
            </div>

            {isOnline && (
              <div className="mt-4 pt-4 border-t border-primary-foreground/20 flex items-center gap-2 text-primary-foreground/80 text-sm">
                <Navigation className="w-4 h-4 animate-pulse" />
                <span>GPS Active • {pendingRides.length} pending requests</span>
              </div>
            )}
          </div>

          {/* Active Ride Card with Animation */}
          <AnimatePresence mode="wait">
            {activeRide && (
              <motion.div
                key={`active-ride-${activeRide.status}`}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`bg-gradient-card rounded-2xl border-2 shadow-elevated overflow-hidden mb-6 ${
                  activeRide.status === 'in_progress' ? 'border-green-500' : 'border-primary'
                }`}
              >
                <motion.div 
                  className={`px-5 py-3 flex items-center justify-between ${
                    activeRide.status === 'in_progress' ? 'bg-green-600' : 'bg-gradient-primary'
                  }`}
                  layoutId="ride-header"
                >
                  <div className="flex items-center gap-2 text-white">
                    {activeRide.ride_type === 'passenger' ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <Package className="w-5 h-5" />
                    )}
                    <span className="font-semibold">
                      {activeRide.status === 'accepted' ? 'Go to Pickup Location' : 'Heading to Drop Location'}
                    </span>
                  </div>
                  <motion.div 
                    className="flex items-center gap-1 text-white/90 text-sm"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <CircleDot className="w-4 h-4" />
                    <span>{activeRide.status === 'accepted' ? 'Picking Up' : 'On Trip'}</span>
                  </motion.div>
                </motion.div>

                {/* Route Info */}
                <div className="p-4 border-b border-border/50">
                  <SecureRouteMap
                    pickupLat={activeRide.pickup_lat}
                    pickupLng={activeRide.pickup_lng}
                    dropLat={activeRide.dropoff_lat}
                    dropLng={activeRide.dropoff_lng}
                  />
                </div>

                <div className="p-5 space-y-4">
                  {/* Customer Info */}
                  <motion.div 
                    className="flex items-center gap-3 pb-4 border-b border-border/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{activeRide.user_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {activeRide.ride_type === 'passenger' ? 'Passenger' : 'Goods Delivery'}
                      </p>
                    </div>
                  </motion.div>

                  {/* Locations with status indicator */}
                  <div className="space-y-3">
                    <motion.div 
                      className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-300 ${
                        activeRide.status === 'accepted' ? 'bg-primary/10 border border-primary/30 shadow-sm' : 'bg-muted/30'
                      }`}
                      animate={activeRide.status === 'accepted' ? { scale: [1, 1.01, 1] } : {}}
                      transition={{ duration: 1.5, repeat: activeRide.status === 'accepted' ? Infinity : 0 }}
                    >
                      <div className="mt-0.5 p-1.5 rounded-full bg-primary/20">
                        <Navigation className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          {activeRide.status === 'accepted' ? '📍 Navigate Here' : 'Pickup'}
                        </p>
                        <p className="text-foreground font-medium">{cleanPlusCode(activeRide.pickup_location)}</p>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-300 ${
                        activeRide.status === 'in_progress' ? 'bg-green-500/10 border border-green-500/30 shadow-sm' : 'bg-muted/30'
                      }`}
                      animate={activeRide.status === 'in_progress' ? { scale: [1, 1.01, 1] } : {}}
                      transition={{ duration: 1.5, repeat: activeRide.status === 'in_progress' ? Infinity : 0 }}
                    >
                      <div className="mt-0.5 p-1.5 rounded-full bg-secondary/20">
                        <MapPin className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          {activeRide.status === 'in_progress' ? '📍 Navigate Here' : 'Drop'}
                        </p>
                        <p className="text-foreground font-medium">{cleanPlusCode(activeRide.dropoff_location)}</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* UPI Payment Status Badge */}
                  {upiPaidLive.paid && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center gap-3"
                    >
                      <div className="p-2 rounded-full bg-green-500/20">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-green-700 text-sm">UPI Payment Received ✅</p>
                        <p className="text-xs text-green-600">Customer has paid ₹{activeRide.fare} online</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Stats */}
                  <motion.div 
                    className="flex items-center justify-between py-4 px-4 bg-muted/50 rounded-xl"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Distance</p>
                      <p className="font-bold text-foreground">{activeRide.distance_km} km</p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Fare</p>
                      <p className="font-bold text-foreground flex items-center">
                        <IndianRupee className="w-4 h-4" />
                        {activeRide.fare}
                      </p>
                    </div>
                    {upiPaidLive.paid && (
                      <>
                        <div className="w-px h-8 bg-border" />
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Payment</p>
                          <p className="font-bold text-green-600 text-sm">UPI ✓</p>
                        </div>
                      </>
                    )}
                  </motion.div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3 pt-2">
                    {/* Navigate Button */}
                    <Button 
                      variant="outline" 
                      className="w-full border-primary text-primary hover:bg-primary/10"
                      onClick={() => {
                        const lat = activeRide.status === 'accepted' ? activeRide.pickup_lat : activeRide.dropoff_lat;
                        const lng = activeRide.status === 'accepted' ? activeRide.pickup_lng : activeRide.dropoff_lng;
                        
                        if (lat && lng) {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                          window.open(url, '_blank');
                        } else {
                          toast.error('Location coordinates not available');
                        }
                      }}
                    >
                      <Locate className="w-4 h-4 mr-2" />
                      Navigate to {activeRide.status === 'accepted' ? 'Pickup' : 'Drop-off'}
                    </Button>

                    <AnimatePresence mode="wait">
                      {activeRide.status === 'accepted' ? (
                        <motion.div 
                          key="pickup-section"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          {/* OTP Input with Customer Name */}
                          {activeRide.otp && (
                            <div className="bg-secondary/10 rounded-xl p-4 border border-secondary/30">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <KeyRound className="w-5 h-5 text-secondary" />
                                  <span className="font-semibold text-foreground">Enter Customer OTP</span>
                                </div>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3 mb-3">
                                <p className="text-xs text-muted-foreground">Customer Name</p>
                                <p className="font-semibold text-foreground">{activeRide.user_name}</p>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                Ask {activeRide.user_name} for their 4-digit OTP
                              </p>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                placeholder="Enter 4-digit OTP"
                                value={otpInput}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '');
                                  setOtpInput(value);
                                  setOtpError(false);
                                }}
                                className={`text-center text-xl font-bold tracking-widest ${
                                  otpError ? 'border-destructive focus-visible:ring-destructive' : ''
                                }`}
                              />
                              {otpError && (
                                <p className="text-destructive text-sm mt-2">Invalid OTP. Please try again.</p>
                              )}
                            </div>
                          )}
                          <Button 
                            variant="hero" 
                            className="w-full bg-primary hover:bg-primary/90"
                            onClick={handleStartRide}
                            disabled={activeRide.otp ? otpInput.length !== 4 : false}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Picked Up Customer
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="dropoff-section"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                        >
                          <Button 
                            variant="hero" 
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={handleFinishRide}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {upiPaidLive.paid ? 'Complete Ride (UPI Paid ✅)' : 'End Ride'}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pending Ride Requests */}
          {isOnline && !activeRide && pendingRides.length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-bold text-foreground">Ride Requests</h3>
              {pendingRides.map((ride) => (
                <RideCard
                  key={ride.id}
                  id={ride.id}
                  type={ride.ride_type}
                  pickup={ride.pickup_location}
                  drop={ride.dropoff_location}
                  distance={`${ride.distance_km || 0} km`}
                  estimatedFare={ride.fare || 0}
                  customerName="Customer"
                  customerRating={4.5}
                  onAccept={() => handleAcceptRide(ride.id)}
                  onDecline={() => handleDeclineRide(ride.id)}
                />
              ))}
            </div>
          )}

          {/* Pending Payments Section */}
          {pendingPaymentRides.length > 0 && (
            <div className="bg-gradient-card rounded-2xl border-2 border-secondary/50 p-5 shadow-card mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-full bg-secondary/20">
                  <IndianRupee className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Pending Payments</h3>
                  <p className="text-xs text-muted-foreground">Collect payment from completed rides</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {pendingPaymentRides.map((ride) => (
                  <div 
                    key={ride.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{ride.user_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {cleanPlusCode(ride.pickup_location)} → {cleanPlusCode(ride.dropoff_location)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="font-bold text-primary flex items-center">
                        <IndianRupee className="w-4 h-4" />
                        {ride.fare}
                      </span>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleAcceptPendingPayment(ride)}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Stats */}
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card mb-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Your Stats</h3>
            
            <div className="flex items-center justify-center mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center text-4xl font-bold text-primary">
                  <IndianRupee className="w-8 h-8" />
                  <span>{driverData.earnings?.toLocaleString() || 0}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Total Earnings</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="text-xl font-bold text-foreground">{driverData.total_rides || 0}</div>
                <div className="text-xs text-muted-foreground">Rides</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="text-xl font-bold text-foreground flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" />
                  --
                </div>
                <div className="text-xs text-muted-foreground">Online</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="text-xl font-bold text-foreground flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 text-secondary" />
                  {driverData.rating?.toFixed(1) || '5.0'}
                </div>
                <div className="text-xs text-muted-foreground">Rating</div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Payment Confirmation Modal */}
      <Dialog
        open={showPaymentConfirmModal}
        onOpenChange={(open) => {
          setShowPaymentConfirmModal(open);
          if (!open) setPaymentContext(null);
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Confirm Payment
            </DialogTitle>
            <DialogDescription>
              Select how you received payment and confirm to complete the ride
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* UPI Payment Already Completed Banner */}
            {paymentContext?.upiPaymentCompleted && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-700">Payment Completed via UPI</p>
                    <p className="text-sm text-green-600">Customer has already paid online</p>
                  </div>
                </div>
                {paymentContext.upiTransactionId && (
                  <div className="mt-3 bg-white/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Transaction Reference</p>
                    <p className="font-mono text-sm font-medium text-foreground break-all">
                      {paymentContext.upiTransactionId}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Amount Display */}
            <div className="text-center py-4 rounded-lg bg-gradient-to-r from-primary/10 to-green-500/10">
              <p className="text-sm text-muted-foreground">Total Fare</p>
              <p className="text-3xl font-bold text-primary flex items-center justify-center">
                <IndianRupee className="w-7 h-7" />
                  {paymentFare}
              </p>
              {paymentContext?.upiPaymentCompleted && (
                <p className="text-sm text-green-600 mt-1 font-medium">✓ Already Paid</p>
              )}
            </div>

            {/* Payment Method Selection - Only show if UPI not already completed */}
            {!paymentContext?.upiPaymentCompleted && (
              <div>
                <p className="text-sm font-medium text-foreground mb-3">How did you receive payment?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentConfirm('cash')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      selectedPaymentConfirm === 'cash'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-muted/30'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${selectedPaymentConfirm === 'cash' ? 'bg-primary/20' : 'bg-muted'}`}>
                      <Banknote className={`w-5 h-5 ${selectedPaymentConfirm === 'cash' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`font-medium text-sm ${selectedPaymentConfirm === 'cash' ? 'text-primary' : 'text-foreground'}`}>
                      Cash
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentConfirm('upi')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      selectedPaymentConfirm === 'upi'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-muted/30'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${selectedPaymentConfirm === 'upi' ? 'bg-primary/20' : 'bg-muted'}`}>
                      <Smartphone className={`w-5 h-5 ${selectedPaymentConfirm === 'upi' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`font-medium text-sm ${selectedPaymentConfirm === 'upi' ? 'text-primary' : 'text-foreground'}`}>
                      UPI
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Payment Button */}
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
              onClick={() => {
                // If no active ride, this is a pending payment collection
                if (!activeRide) {
                  handleConfirmPendingPayment();
                } else {
                  handleConfirmPayment(true);
                }
              }}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {processingPayment 
                ? 'Processing...' 
                : paymentContext?.upiPaymentCompleted
                  ? 'Complete Ride (UPI Already Paid)'
                  : `Yes, Received ₹${paymentFare} via ${selectedPaymentConfirm === 'upi' ? 'UPI' : 'Cash'}`
              }
            </Button>

            {/* Not Paid Button - Only show when ending active ride and UPI not already completed */}
            {activeRide && !paymentContext?.upiPaymentCompleted && (
              <Button
                variant="outline"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                size="lg"
                onClick={() => handleConfirmPayment(false)}
                disabled={processingPayment}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Not Paid - Complete Anyway
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverDashboard;
