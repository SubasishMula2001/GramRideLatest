import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Smartphone, Banknote, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  amount: number;
  onPaymentComplete: () => void;
}

type PaymentMethod = 'upi' | 'cash' | null;
type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  rideId,
  amount,
  onPaymentComplete,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const paymentIdRef = useRef<string | null>(null);
  const paymentStatusRef = useRef<PaymentStatus>('idle');

  const isBengali = t.signIn === 'লগইন করুন';

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const checkPaymentStatus = useCallback(async () => {
    if (!paymentIdRef.current) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { payment_id: paymentIdRef.current },
      });

      if (error) {
        console.error('Payment status check error:', error);
        return;
      }

      if (data?.status === 'completed') {
        stopPolling();
        setTransactionId(data.razorpay_payment_id || null);
        setPaymentStatus('success');
        paymentStatusRef.current = 'success';
        setIsLoading(false);
        toast({
          title: 'Payment Successful! ✅',
          description: `₹${amount} paid via UPI`,
        });
        setTimeout(() => {
          onPaymentComplete();
          onClose();
        }, 3000);
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, [amount, onPaymentComplete, onClose, stopPolling, toast]);

  const startPolling = useCallback(() => {
    stopPolling();
    // Poll every 5 seconds for up to 5 minutes
    let pollCount = 0;
    pollingRef.current = setInterval(() => {
      pollCount++;
      if (pollCount > 60) {
        stopPolling();
        return;
      }
      checkPaymentStatus();
    }, 5000);
  }, [checkPaymentStatus, stopPolling]);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUPIPayment = async () => {
    setIsLoading(true);
    setPaymentStatus('processing');
    paymentStatusRef.current = 'processing';
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error('Failed to load payment gateway');

      // Create order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        { body: { ride_id: rideId, amount } }
      );

      if (orderError || !orderData) {
        throw new Error(orderError?.message || 'Failed to create payment order');
      }

      // Store payment_id for polling
      paymentIdRef.current = orderData.payment_id;

      // Start polling immediately — this is the safety net
      startPolling();

      // Get user info (best-effort, don't fail if it errors)
      let prefill = { name: '', email: '', contact: '' };
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('id', user.id)
            .single();
          prefill = {
            name: profile?.full_name || '',
            email: profile?.email || user.email || '',
            contact: profile?.phone || '',
          };
        }
      } catch {
        // Non-critical, continue with empty prefill
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount * 100,
        currency: orderData.currency,
        name: 'GramRide',
        description: 'Ride Payment',
        order_id: orderData.order_id,
        prefill,
        theme: { color: '#22c55e' },
        handler: async (response: any) => {
          // Try to refresh session first — it may have expired while in UPI app
          try {
            await supabase.auth.refreshSession();
          } catch {
            console.warn('Session refresh failed, will rely on polling');
          }

          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'verify-razorpay-payment',
              {
                body: {
                  payment_id: orderData.payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              }
            );

            if (verifyError || !verifyData?.success) {
              // Client verify failed — polling will catch it
              console.warn('Client-side verify failed, polling will handle it');
              return;
            }

            stopPolling();
            setTransactionId(response.razorpay_payment_id);
            setPaymentStatus('success');
            paymentStatusRef.current = 'success';
            toast({
              title: 'Payment Successful! ✅',
              description: `₹${amount} paid via UPI`,
            });
            setTimeout(() => {
              onPaymentComplete();
              onClose();
            }, 3000);
          } catch (err) {
            console.warn('Handler verify error, polling will catch it:', err);
          }
        },
        modal: {
          ondismiss: async () => {
            // Try to recover session when user returns from UPI app
            try {
              await supabase.auth.refreshSession();
            } catch {
              console.warn('Session refresh on dismiss failed');
            }
            // Do a final check
            checkPaymentStatus();
            // Wait a short time, then reset if not completed
            setTimeout(() => {
              if (paymentStatusRef.current !== 'success') {
                stopPolling();
                setPaymentStatus('idle');
                paymentStatusRef.current = 'idle';
                setIsLoading(false);
              }
            }, 5000);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        stopPolling();
        setPaymentStatus('failed');
        paymentStatusRef.current = 'failed';
        toast({
          title: 'Payment Failed',
          description: response.error.description || 'Payment could not be processed',
          variant: 'destructive',
        });
      });

      razorpay.open();
      setIsLoading(false);
    } catch (error) {
      console.error('UPI payment error:', error);
      stopPolling();
      setPaymentStatus('failed');
      paymentStatusRef.current = 'failed';
      setIsLoading(false);
      toast({
        title: 'Payment Error',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  const handleCashPayment = async () => {
    setIsLoading(true);
    setPaymentStatus('processing');

    try {
      const { data, error } = await supabase.functions.invoke('process-cash-payment', {
        body: { ride_id: rideId, amount, confirmed_by: 'user' },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || 'Failed to confirm cash payment');
      }

      setPaymentStatus('success');
      toast({
        title: 'Cash Payment Confirmed! 💵',
        description: `₹${amount} to be paid in cash to driver`,
      });

      setTimeout(() => {
        onPaymentComplete();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Cash payment error:', error);
      setPaymentStatus('failed');
      setIsLoading(false);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  const handlePayment = () => {
    if (selectedMethod === 'upi') handleUPIPayment();
    else if (selectedMethod === 'cash') handleCashPayment();
  };

  const resetState = () => {
    setSelectedMethod(null);
    setPaymentStatus('idle');
    paymentStatusRef.current = 'idle';
    setIsLoading(false);
    setTransactionId(null);
    stopPolling();
    paymentIdRef.current = null;
  };

  const handleClose = () => {
    if (paymentStatus !== 'processing') {
      resetState();
      onClose();
    }
  };

  const isRazorpayOpen = paymentStatus === 'processing';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose} modal={!isRazorpayOpen}>
      <DialogContent 
        className="sm:max-w-md"
        onInteractOutside={(e) => {
          if (isRazorpayOpen) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isRazorpayOpen) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {isBengali ? 'পেমেন্ট করুন' : 'Complete Payment'}
          </DialogTitle>
          <DialogDescription>
            {isBengali
              ? 'আপনার রাইডের জন্য পেমেন্ট পদ্ধতি বেছে নিন'
              : 'Select a payment method for your ride'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount Display */}
          <div className="text-center py-4 bg-gradient-to-r from-primary/10 to-green-500/10 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {isBengali ? 'মোট টাকা' : 'Total Amount'}
            </p>
            <p className="text-3xl font-bold text-primary">₹{amount}</p>
          </div>

          {/* Payment Status */}
          {paymentStatus === 'success' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="h-16 w-16 text-green-500 animate-pulse" />
              <p className="text-lg font-semibold text-green-600">
                {isBengali ? 'পেমেন্ট সফল!' : 'Payment Successful!'}
              </p>
              <div className="w-full bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isBengali ? 'টাকা' : 'Amount'}</span>
                  <span className="font-semibold text-primary">₹{amount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isBengali ? 'পদ্ধতি' : 'Method'}</span>
                  <span className="font-medium">
                    {selectedMethod === 'upi' ? 'UPI' : (isBengali ? 'নগদ' : 'Cash')}
                  </span>
                </div>
                {transactionId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {isBengali ? 'ট্রানজাকশন আইডি' : 'Transaction ID'}
                    </span>
                    <span className="font-mono text-xs bg-background px-2 py-0.5 rounded">
                      {transactionId.slice(0, 16)}...
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="flex flex-col items-center gap-2 py-4">
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-sm text-destructive">
                {isBengali ? 'পেমেন্ট ব্যর্থ হয়েছে' : 'Payment Failed'}
              </p>
              <Button variant="outline" size="sm" onClick={resetState}>
                {isBengali ? 'আবার চেষ্টা করুন' : 'Try Again'}
              </Button>
            </div>
          )}

          {/* Payment Methods */}
          {paymentStatus === 'idle' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Card
                  className={`cursor-pointer transition-all ${
                    selectedMethod === 'upi' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedMethod('upi')}
                >
                  <CardContent className="flex flex-col items-center justify-center p-4 gap-2">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Smartphone className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-medium">UPI</span>
                    <Badge variant="secondary" className="text-xs">
                      {isBengali ? 'তাৎক্ষণিক' : 'Instant'}
                    </Badge>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    selectedMethod === 'cash' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedMethod('cash')}
                >
                  <CardContent className="flex flex-col items-center justify-center p-4 gap-2">
                    <div className="p-3 bg-green-500/10 rounded-full">
                      <Banknote className="h-6 w-6 text-green-600" />
                    </div>
                    <span className="font-medium">{isBengali ? 'নগদ' : 'Cash'}</span>
                    <Badge variant="outline" className="text-xs">
                      {isBengali ? 'ড্রাইভারকে দিন' : 'Pay Driver'}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {selectedMethod === 'upi' && (
                <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                  GPay • PhonePe • Paytm • BHIM • Any UPI App
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={!selectedMethod || isLoading}
                onClick={handlePayment}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isBengali ? 'প্রক্রিয়াকরণ...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    {selectedMethod === 'upi'
                      ? (isBengali ? 'UPI দিয়ে পে করুন' : 'Pay with UPI')
                      : selectedMethod === 'cash'
                      ? (isBengali ? 'নগদ নিশ্চিত করুন' : 'Confirm Cash')
                      : (isBengali ? 'পদ্ধতি বেছে নিন' : 'Select Method')}
                  </>
                )}
              </Button>
            </>
          )}

          {/* Processing State */}
          {paymentStatus === 'processing' && isLoading && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                {isBengali ? 'পেমেন্ট চলছে...' : 'Processing payment...'}
              </p>
            </div>
          )}

          {/* Waiting for payment (Razorpay modal open, polling active) */}
          {paymentStatus === 'processing' && !isLoading && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                {isBengali ? 'পেমেন্টের জন্য অপেক্ষা করা হচ্ছে...' : 'Waiting for payment confirmation...'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isBengali ? 'পেমেন্ট সম্পন্ন হলে স্বয়ংক্রিয়ভাবে আপডেট হবে' : 'Will update automatically once payment is confirmed'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  stopPolling();
                  setPaymentStatus('idle');
                  paymentStatusRef.current = 'idle';
                  setIsLoading(false);
                }}
              >
                {isBengali ? 'বাতিল করুন' : 'Cancel & Go Back'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
