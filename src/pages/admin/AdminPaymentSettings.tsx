import React, { useState, useEffect } from 'react';
import { CreditCard, Key, Shield, ExternalLink, CheckCircle, Info, Loader2, Moon, TrendingUp, Map, Eye, EyeOff, Save, IndianRupee } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  const [commissionPercent, setCommissionPercent] = useState('10');
  const [savingCommission, setSavingCommission] = useState(false);

  // API Key states
  const [apiKeys, setApiKeys] = useState({
    razorpay_key_id: '',
    razorpay_key_secret: '',
    google_maps_api_key: '',
  });
  const [showKeys, setShowKeys] = useState({
    razorpay_key_id: false,
    razorpay_key_secret: false,
    google_maps_api_key: false,
  });
  const [savingKeys, setSavingKeys] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(true);

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
            'surge_end_hour',
            'platform_commission_percent'
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

          if (settings.platform_commission_percent != null) {
            setCommissionPercent(String(settings.platform_commission_percent));
          }
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoadingSettings(false);
      }
    };

    const fetchApiKeys = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value')
          .in('key', ['razorpay_key_id', 'razorpay_key_secret', 'google_maps_api_key']);

        if (error) {
          console.error('Error fetching API keys:', error);
        } else if (data) {
          const keys: Record<string, string> = {};
          data.forEach(s => {
            let val = s.value;
            if (typeof val === 'string') {
              val = val.replace(/^"|"$/g, '');
            } else {
              val = String(val ?? '');
            }
            keys[s.key] = val || '';
          });
          setApiKeys(prev => ({ ...prev, ...keys }));
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoadingKeys(false);
      }
    };

    fetchSettings();
    fetchApiKeys();
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

  const handleSaveCommission = async () => {
    setSavingCommission(true);
    try {
      const val = parseFloat(commissionPercent);
      if (isNaN(val) || val < 0 || val > 100) {
        toast.error('Commission must be between 0 and 100');
        return;
      }
      const { error } = await supabase
        .from('app_settings')
        .update({ value: commissionPercent })
        .eq('key', 'platform_commission_percent');
      if (error) throw error;
      toast.success(`Platform commission set to ${commissionPercent}%`);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to save commission setting');
    } finally {
      setSavingCommission(false);
    }
  };

  const handleSaveApiKeys = async () => {
    setSavingKeys(true);
    try {
      const updates = [
        { key: 'razorpay_key_id', value: apiKeys.razorpay_key_id },
        { key: 'razorpay_key_secret', value: apiKeys.razorpay_key_secret },
        { key: 'google_maps_api_key', value: apiKeys.google_maps_api_key },
      ];

      for (const update of updates) {
        if (update.value) {
          const { error } = await supabase
            .from('app_settings')
            .update({ value: JSON.stringify(update.value) })
            .eq('key', update.key);
          
          if (error) throw error;
        }
      }

      toast.success('API keys saved successfully! Changes will take effect on next request.');
    } catch (err) {
      console.error('Error saving API keys:', err);
      toast.error('Failed to save API keys');
    } finally {
      setSavingKeys(false);
    }
  };

  const toggleKeyVisibility = (key: keyof typeof showKeys) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
            Payment & API Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage payment gateway, maps configuration, and fare settings
          </p>
        </div>

        {/* Razorpay API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Razorpay API Keys
            </CardTitle>
            <CardDescription>
              Configure Razorpay credentials for payment processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingKeys ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="razorpay-key-id">Razorpay Key ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="razorpay-key-id"
                      type={showKeys.razorpay_key_id ? 'text' : 'password'}
                      value={apiKeys.razorpay_key_id}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, razorpay_key_id: e.target.value }))}
                      placeholder="rzp_live_xxxxxxxxxxxxx"
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleKeyVisibility('razorpay_key_id')}
                    >
                      {showKeys.razorpay_key_id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="razorpay-key-secret">Razorpay Key Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      id="razorpay-key-secret"
                      type={showKeys.razorpay_key_secret ? 'text' : 'password'}
                      value={apiKeys.razorpay_key_secret}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, razorpay_key_secret: e.target.value }))}
                      placeholder="Enter your Razorpay secret key"
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleKeyVisibility('razorpay_key_secret')}
                    >
                      {showKeys.razorpay_key_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

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
              </>
            )}
          </CardContent>
        </Card>

        {/* Google Maps API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              Google Maps API Key
            </CardTitle>
            <CardDescription>
              Configure Google Maps for location and routing services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingKeys ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="google-maps-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="google-maps-key"
                      type={showKeys.google_maps_api_key ? 'text' : 'password'}
                      value={apiKeys.google_maps_api_key}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, google_maps_api_key: e.target.value }))}
                      placeholder="AIzaSy..."
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleKeyVisibility('google_maps_api_key')}
                    >
                      {showKeys.google_maps_api_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Requires: Maps JavaScript, Places, Directions, Static Maps, and Geocoding APIs enabled
                  </p>
                </div>

                <Button variant="outline" asChild>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Google Cloud Console
                  </a>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Save API Keys Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveApiKeys} disabled={savingKeys || loadingKeys} size="lg">
            {savingKeys ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save All API Keys
          </Button>
        </div>

        <Alert variant="default" className="bg-muted/30">
          <Info className="h-4 w-4" />
          <AlertDescription>
            API keys are stored securely and only accessible to admin users. They are read by backend functions for payment processing and maps services. Changes take effect immediately on the next API call.
          </AlertDescription>
        </Alert>

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

        {/* Platform Commission */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              Platform Commission
            </CardTitle>
            <CardDescription>
              Set the percentage deducted from each ride fare as platform profit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="commission-percent">Commission Percentage (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="commission-percent"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            <Alert variant="default" className="bg-muted/30">
              <Info className="h-4 w-4" />
              <AlertDescription>
                For a ₹100 ride with {commissionPercent}% commission: Driver receives ₹{Math.round(100 - 100 * parseFloat(commissionPercent || '0') / 100)}, Platform earns ₹{Math.round(100 * parseFloat(commissionPercent || '0') / 100)}.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button onClick={handleSaveCommission} disabled={savingCommission}>
                {savingCommission ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Commission
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Payment Gateway Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Payment Gateway Status
            </CardTitle>
            <CardDescription>
              Current configuration status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Razorpay</p>
                    <p className="text-sm text-muted-foreground">UPI, Cards, Wallets</p>
                  </div>
                </div>
                <Badge 
                  variant="default" 
                  className={apiKeys.razorpay_key_id 
                    ? "bg-green-500/10 text-green-600" 
                    : "bg-orange-500/10 text-orange-600"
                  }
                >
                  {apiKeys.razorpay_key_id ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Configured</>
                  ) : 'Not Configured'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Map className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Google Maps</p>
                    <p className="text-sm text-muted-foreground">Location & Routes</p>
                  </div>
                </div>
                <Badge 
                  variant="default" 
                  className={apiKeys.google_maps_api_key 
                    ? "bg-green-500/10 text-green-600" 
                    : "bg-orange-500/10 text-orange-600"
                  }
                >
                  {apiKeys.google_maps_api_key ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Configured</>
                  ) : 'Not Configured'}
                </Badge>
              </div>
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
                <Badge variant="default" className="bg-green-500/10 text-green-600">Active</Badge>
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
                <Badge variant="default" className="bg-green-500/10 text-green-600">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentSettings;
