import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  LogOut, 
  User, 
  Phone, 
  Mail, 
  Car, 
  FileText,
  Star,
  IndianRupee,
  Loader2,
  Edit2,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GramRideLogo from '@/components/GramRideLogo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RideHistory from '@/components/RideHistory';

interface DriverProfile {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  vehicle_number: string | null;
  license_number: string | null;
  rating: number | null;
  total_rides: number | null;
  earnings: number | null;
  is_available: boolean;
  is_verified: boolean;
}

const DriverProfile = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    
    if (user) {
      fetchProfile();
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Fetch driver data
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('vehicle_number, license_number, rating, total_rides, earnings, is_available, is_verified')
        .eq('user_id', user.id)
        .maybeSingle();

      if (driverError && driverError.code !== 'PGRST116') throw driverError;

      const combinedProfile: DriverProfile = {
        full_name: profileData?.full_name || null,
        phone: profileData?.phone || null,
        email: profileData?.email || user.email || null,
        vehicle_number: driverData?.vehicle_number || null,
        license_number: driverData?.license_number || null,
        rating: driverData?.rating || 5.0,
        total_rides: driverData?.total_rides || 0,
        earnings: driverData?.earnings || 0,
        is_available: driverData?.is_available || false,
        is_verified: driverData?.is_verified || false,
      };

      setProfile(combinedProfile);
      setEditForm({
        full_name: combinedProfile.full_name || '',
        phone: combinedProfile.phone || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        full_name: editForm.full_name,
        phone: editForm.phone,
      } : null);
      
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
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

  return (
    <div className="min-h-screen bg-gradient-hero pt-16">
      <main className="pt-8 pb-12 px-4">
        <div className="container mx-auto max-w-lg">
          
          {/* Profile Header */}
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground">
                  {profile?.full_name || 'Driver'}
                </h1>
                <p className="text-muted-foreground text-sm">{profile?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {profile?.is_verified ? (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      ✓ Verified Driver
                    </span>
                  ) : (
                    <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full">
                      Pending Verification
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-foreground">
                  <Star className="w-4 h-4 text-secondary" />
                  {profile?.rating?.toFixed(1) || '5.0'}
                </div>
                <div className="text-xs text-muted-foreground">Rating</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="text-xl font-bold text-foreground">
                  {profile?.total_rides || 0}
                </div>
                <div className="text-xs text-muted-foreground">Rides</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-foreground">
                  <IndianRupee className="w-4 h-4" />
                  {profile?.earnings?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Earnings</div>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Personal Info</h3>
              {!editing ? (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                {editing ? (
                  <Input
                    value={editForm.full_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Full Name"
                    className="flex-1"
                  />
                ) : (
                  <span className="text-foreground">{profile?.full_name || 'Not set'}</span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                {editing ? (
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone Number"
                    className="flex-1"
                  />
                ) : (
                  <span className="text-foreground">{profile?.phone || 'Not set'}</span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">{profile?.email}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card">
            <h3 className="text-lg font-bold text-foreground mb-4">Vehicle Details</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Vehicle Number</div>
                  <span className="text-foreground font-medium">
                    {profile?.vehicle_number || 'Not registered'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">License Number</div>
                  <span className="text-foreground font-medium">
                    {profile?.license_number || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ride History */}
          {user && <RideHistory userId={user.id} userType="driver" />}

        </div>
      </main>
    </div>
  );
};

export default DriverProfile;
