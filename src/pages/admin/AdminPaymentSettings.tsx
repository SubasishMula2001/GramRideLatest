import React from 'react';
import { CreditCard, Key, Shield, ExternalLink, CheckCircle, Info, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

const AdminPaymentSettings = () => {
  const { loading: authLoading } = useAuth();

  // ProtectedRoute already handles auth and role checks
  // No need for redundant navigation logic here

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" />
            Payment Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage payment gateway configuration and API keys
          </p>
        </div>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Payment Gateway Status
            </CardTitle>
            <CardDescription>
              Current configuration status for Razorpay payment gateway
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Razorpay</p>
                  <p className="text-sm text-muted-foreground">UPI, Cards, Wallets</p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">API Key ID</span>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  ••••••••••••••••
                </p>
                <Badge variant="outline" className="mt-2 text-xs">
                  Configured via Backend Secrets
                </Badge>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">API Secret Key</span>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  ••••••••••••••••
                </p>
                <Badge variant="outline" className="mt-2 text-xs">
                  Configured via Backend Secrets
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Update API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Update Razorpay API Keys
            </CardTitle>
            <CardDescription>
              To update your Razorpay API keys, use the chat assistant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>How to Update API Keys</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-3">
                  For security reasons, API keys are stored as encrypted backend secrets. 
                  To update them:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Open the Lovable chat assistant</li>
                  <li>Type: "I want to update my Razorpay API keys"</li>
                  <li>The assistant will provide a secure form to enter your new keys</li>
                  <li>Your keys will be securely stored and encrypted</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-4">
              <Button variant="outline" asChild>
                <a 
                  href="https://dashboard.razorpay.com/app/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Razorpay Dashboard
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Enabled Payment Methods</CardTitle>
            <CardDescription>
              Payment options available to users during checkout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">UPI Payment</p>
                    <p className="text-sm text-muted-foreground">GPay, PhonePe, Paytm</p>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-500/10 text-green-600">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <span className="text-lg">💵</span>
                  </div>
                  <div>
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-muted-foreground">Pay driver directly</p>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-500/10 text-green-600">
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Flow Info */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Flow</CardTitle>
            <CardDescription>
              How payments work in GramRide
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="p-2 bg-primary text-primary-foreground rounded-full text-sm font-bold w-8 h-8 flex items-center justify-center">
                  1
                </div>
                <div>
                  <p className="font-medium">Pre-Booking Selection</p>
                  <p className="text-sm text-muted-foreground">
                    Users choose their preferred payment method (UPI or Cash) before confirming the ride
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="p-2 bg-primary text-primary-foreground rounded-full text-sm font-bold w-8 h-8 flex items-center justify-center">
                  2
                </div>
                <div>
                  <p className="font-medium">Pay During Ride</p>
                  <p className="text-sm text-muted-foreground">
                    Users can pay via UPI anytime during the ride using the "Pay Now" button
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="p-2 bg-primary text-primary-foreground rounded-full text-sm font-bold w-8 h-8 flex items-center justify-center">
                  3
                </div>
                <div>
                  <p className="font-medium">Driver Confirmation</p>
                  <p className="text-sm text-muted-foreground">
                    Drivers confirm payment receipt when ending the ride, updating records automatically
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="p-2 bg-primary text-primary-foreground rounded-full text-sm font-bold w-8 h-8 flex items-center justify-center">
                  4
                </div>
                <div>
                  <p className="font-medium">Auto-Complete</p>
                  <p className="text-sm text-muted-foreground">
                    Razorpay payments automatically update the ride's payment status to "completed"
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentSettings;
