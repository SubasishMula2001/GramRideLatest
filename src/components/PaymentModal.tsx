import React, { useState } from 'react';
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
  const { toast } = useToast();
  const { t } = useLanguage();

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

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        {
          body: { ride_id: rideId, amount: amount },
        }
      );

      if (orderError || !orderData) {
        throw new Error(orderError?.message || 'Failed to create payment order');
      }

      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user?.id)
        .single();

      // Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount * 100,
        currency: orderData.currency,
        name: 'GramRide',
        description: 'Ride Payment',
        order_id: orderData.order_id,
        prefill: {
          name: profile?.full_name || '',
          email: profile?.email || user?.email || '',
          contact: profile?.phone || '',
        },
        theme: {
          color: '#22c55e',
        },
        handler: async (response: any) => {
          try {
            // Verify payment
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
              throw new Error(verifyError?.message || 'Payment verification failed');
            }

            setPaymentStatus('success');
            toast({
              title: 'Payment Successful! ✅',
              description: `₹${amount} paid via UPI`,
            });
            
            setTimeout(() => {
              onPaymentComplete();
              onClose();
            }, 2000);
          } catch (err) {
            console.error('Verification error:', err);
            setPaymentStatus('failed');
            toast({
              title: 'Payment Failed',
              description: 'Could not verify payment. Please contact support.',
              variant: 'destructive',
            });
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentStatus('idle');
            setIsLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        setPaymentStatus('failed');
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
      setPaymentStatus('failed');
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
        body: {
          ride_id: rideId,
          amount: amount,
          confirmed_by: 'user',
        },
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
    if (selectedMethod === 'upi') {
      handleUPIPayment();
    } else if (selectedMethod === 'cash') {
      handleCashPayment();
    }
  };

  const resetState = () => {
    setSelectedMethod(null);
    setPaymentStatus('idle');
    setIsLoading(false);
  };

  const handleClose = () => {
    if (paymentStatus !== 'processing') {
      resetState();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {t.signIn === 'লগইন করুন' ? 'পেমেন্ট করুন' : 'Complete Payment'}
          </DialogTitle>
          <DialogDescription>
            {t.signIn === 'লগইন করুন' 
              ? 'আপনার রাইডের জন্য পেমেন্ট পদ্ধতি বেছে নিন' 
              : 'Select a payment method for your ride'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount Display */}
          <div className="text-center py-4 bg-gradient-to-r from-primary/10 to-green-500/10 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {t.signIn === 'লগইন করুন' ? 'মোট টাকা' : 'Total Amount'}
            </p>
            <p className="text-3xl font-bold text-primary">₹{amount}</p>
          </div>

          {/* Payment Status */}
          {paymentStatus === 'success' && (
            <div className="flex flex-col items-center gap-2 py-6">
              <CheckCircle className="h-16 w-16 text-green-500 animate-pulse" />
              <p className="text-lg font-semibold text-green-600">
                {t.signIn === 'লগইন করুন' ? 'পেমেন্ট সফল!' : 'Payment Successful!'}
              </p>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="flex flex-col items-center gap-2 py-4">
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-sm text-destructive">
                {t.signIn === 'লগইন করুন' ? 'পেমেন্ট ব্যর্থ হয়েছে' : 'Payment Failed'}
              </p>
              <Button variant="outline" size="sm" onClick={resetState}>
                {t.signIn === 'লগইন করুন' ? 'আবার চেষ্টা করুন' : 'Try Again'}
              </Button>
            </div>
          )}

          {/* Payment Methods */}
          {paymentStatus === 'idle' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {/* UPI Option */}
                <Card
                  className={`cursor-pointer transition-all ${
                    selectedMethod === 'upi'
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedMethod('upi')}
                >
                  <CardContent className="flex flex-col items-center justify-center p-4 gap-2">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Smartphone className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-medium">UPI</span>
                    <Badge variant="secondary" className="text-xs">
                      {t.signIn === 'লগইন করুন' ? 'তাৎক্ষণিক' : 'Instant'}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Cash Option */}
                <Card
                  className={`cursor-pointer transition-all ${
                    selectedMethod === 'cash'
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedMethod('cash')}
                >
                  <CardContent className="flex flex-col items-center justify-center p-4 gap-2">
                    <div className="p-3 bg-green-500/10 rounded-full">
                      <Banknote className="h-6 w-6 text-green-600" />
                    </div>
                    <span className="font-medium">
                      {t.signIn === 'লগইন করুন' ? 'নগদ' : 'Cash'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {t.signIn === 'লগইন করুন' ? 'ড্রাইভারকে দিন' : 'Pay Driver'}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* UPI Apps Info */}
              {selectedMethod === 'upi' && (
                <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                  GPay • PhonePe • Paytm • BHIM • Any UPI App
                </div>
              )}

              {/* Pay Button */}
              <Button
                className="w-full"
                size="lg"
                disabled={!selectedMethod || isLoading}
                onClick={handlePayment}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.signIn === 'লগইন করুন' ? 'প্রক্রিয়াকরণ...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    {selectedMethod === 'upi' 
                      ? (t.signIn === 'লগইন করুন' ? 'UPI দিয়ে পে করুন' : 'Pay with UPI')
                      : selectedMethod === 'cash'
                      ? (t.signIn === 'লগইন করুন' ? 'নগদ নিশ্চিত করুন' : 'Confirm Cash')
                      : (t.signIn === 'লগইন করুন' ? 'পদ্ধতি বেছে নিন' : 'Select Method')}
                  </>
                )}
              </Button>
            </>
          )}

          {/* Processing State */}
          {paymentStatus === 'processing' && !isLoading && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                {t.signIn === 'লগইন করুন' ? 'পেমেন্ট চলছে...' : 'Processing payment...'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
