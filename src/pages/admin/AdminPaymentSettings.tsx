import React, { useState, useEffect } from 'react';
import { CreditCard, Key, Shield, ExternalLink, CheckCircle, Info, Loader2, Moon, TrendingUp } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { updateNightChargesCache, updateSurgeCache } from '@/lib/fareCalculator';

const AdminPaymentSettings = () => {
  const { loading: authLoading } = useAuth();
  const [nightChargesEnabled, setNightChargesEnabled] = useState(false);
  const [surgeSettings, setSurgeSettings] = useState({
    enabled: false,
    multiplier: '1.5',
    startHour: '8',
    endHour: '10',
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingNightCharges, setSavingNightCharges] = useState(false);
  const [savingSurge, setSavingSurge] = useState(false);

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value')
          .in('key', [
            'night_charges_enabled',
            'surge_pricing_enabled',
            'surge_multiplier',
            'surge_start_hour',
            'surge_end_hour'
          ]);

        if (error) {
          console.error('Error fetching settings:', error);
        } else if (data) {
          const settings: Record<string, any> = {};
          data.forEach(s => { settings[s.key] = s.value; });
          
          const nightEnabled = settings.night_charges_enabled === true || settings.night_charges_enabled === 'true';
          setNightChargesEnabled(nightEnabled);
          updateNightChargesCache(nightEnabled);
          
          setSurgeSettings({
            enabled: settings.surge_pricing_enabled === true || settings.surge_pricing_enabled === 'true',
            multiplier: settings.surge_multiplier?.toString() || '1.5',
            startHour: settings.surge_start_hour?.toString() || '8',
            endHour: settings.surge_end_hour?.toString() || '10',
          });
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();
  }, []);

  const handleNightChargesToggle = async (enabled: boolean) => {
    setSavingNightCharges(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: enabled })
        .eq('key', 'night_charges_enabled');

      if (error) {
        console.error('Error updating night charges setting:', error);
        toast.error('Failed to update night charges setting');
        return;
      }

      setNightChargesEnabled(enabled);
      updateNightChargesCache(enabled);
      toast.success(enabled ? 'Night charges enabled' : 'Night charges disabled');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to update setting');
    } finally {
      setSavingNightCharges(false);
    }
  };

  const handleSaveSurgeSettings = async () => {
    setSavingSurge(true);
    try {
      const updates = [
        { key: 'surge_pricing_enabled', value: surgeSettings.enabled },
        { key: 'surge_multiplier', value: surgeSettings.multiplier },
        { key: 'surge_start_hour', value: surgeSettings.startHour },
        { key: 'surge_end_hour', value: surgeSettings.endHour },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value: update.value })
          .eq('key', update.key);
        
        if (error) throw error;
      }

      updateSurgeCache({
        enabled: surgeSettings.enabled,
        multiplier: parseFloat(surgeSettings.multiplier),
        startHour: parseInt(surgeSettings.startHour),
        endHour: parseInt(surgeSettings.endHour),
      });
      
      toast.success('Surge pricing settings saved');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to save surge pricing settings');
    } finally {
      setSavingSurge(false);
    }
  };

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
            Manage payment gateway configuration and fare settings
          </p>
        </div>

        {/* Fare Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary" />
              Fare Settings
            </CardTitle>
            <CardDescription>
              Configure pricing and surcharges for rides
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Moon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="night-charges" className="text-base font-medium">
                    Night Charges
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Apply 20% surcharge between 10 PM - 6 AM
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {loadingSettings ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Switch
                      id="night-charges"
                      checked={nightChargesEnabled}
                      onCheckedChange={handleNightChargesToggle}
                      disabled={savingNightCharges}
                    />
                    <Badge 
                      variant={nightChargesEnabled ? "default" : "secondary"}
                      className={nightChargesEnabled 
                        ? "bg-green-500/10 text-green-600" 
                        : "bg-muted text-muted-foreground"
                      }
                    >
                      {nightChargesEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </>
                )}
              </div>
            </div>

            <Alert variant="default" className="bg-muted/30">
              <Info className="h-4 w-4" />
              <AlertDescription>
                When enabled, a 20% surcharge will be automatically added to fares for rides booked between 10 PM and 6 AM.
                This is disabled by default.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Surge Pricing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Surge Pricing
            </CardTitle>
            <CardDescription>
              Configure dynamic pricing during peak hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="surge-enabled" className="text-base font-medium">
                    Enable Surge Pricing
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Apply higher rates during peak hours
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {loadingSettings ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Switch
                      id="surge-enabled"
                      checked={surgeSettings.enabled}
                      onCheckedChange={(checked) => setSurgeSettings(prev => ({ ...prev, enabled: checked }))}
                    />
                    <Badge 
                      variant={surgeSettings.enabled ? "default" : "secondary"}
                      className={surgeSettings.enabled 
                        ? "bg-orange-500/10 text-orange-600" 
                        : "bg-muted text-muted-foreground"
                      }
                    >
                      {surgeSettings.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="surge-multiplier">Surge Multiplier</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="surge-multiplier"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={surgeSettings.multiplier}
                    onChange={(e) => setSurgeSettings(prev => ({ ...prev, multiplier: e.target.value }))}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">×</span>
                </div>
                <p className="text-xs text-muted-foreground">e.g., 1.5 = 50% increase</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="surge-start">Start Hour</Label>
                <Input
                  id="surge-start"
                  type="number"
                  min="0"
                  max="23"
                  value={surgeSettings.startHour}
                  onChange={(e) => setSurgeSettings(prev => ({ ...prev, startHour: e.target.value }))}
                  className="w-20"
                />
                <p className="text-xs text-muted-foreground">24-hour format</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="surge-end">End Hour</Label>
                <Input
                  id="surge-end"
                  type="number"
                  min="0"
                  max="23"
                  value={surgeSettings.endHour}
                  onChange={(e) => setSurgeSettings(prev => ({ ...prev, endHour: e.target.value }))}
                  className="w-20"
                />
                <p className="text-xs text-muted-foreground">24-hour format</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSurgeSettings} disabled={savingSurge}>
                {savingSurge ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Surge Settings
              </Button>
            </div>

            <Alert variant="default" className="bg-muted/30">
              <Info className="h-4 w-4" />
              <AlertDescription>
                When surge pricing is enabled, fares will be multiplied by {surgeSettings.multiplier}× 
                between {surgeSettings.startHour}:00 and {surgeSettings.endHour}:00.
                Example: A ₹100 ride becomes ₹{Math.round(100 * parseFloat(surgeSettings.multiplier || '1'))}.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

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
