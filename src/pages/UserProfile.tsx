import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  LogOut, 
  User, 
  Phone, 
  Mail, 
  MapPin,
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
import ChangePasswordSection from '@/components/ChangePasswordSection';

interface UserProfileData {
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
  });
  const [rideCount, setRideCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    
    if (user) {
      fetchProfile();
      fetchRideCount();
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      const profileData: UserProfileData = {
        full_name: data?.full_name || null,
        phone: data?.phone || null,
        email: data?.email || user.email || null,
      };

      setProfile(profileData);
      setEditForm({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchRideCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;
      setRideCount(count || 0);
    } catch (error) {
      console.error('Error fetching ride count:', error);
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
                  {profile?.full_name || 'User'}
                </h1>
                <p className="text-muted-foreground text-sm">{profile?.email}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="text-xl font-bold text-foreground">{rideCount}</div>
                <div className="text-xs text-muted-foreground">Total Rides</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="flex items-center justify-center gap-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-xl font-bold text-foreground">Active</span>
                </div>
                <div className="text-xs text-muted-foreground">Status</div>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card">
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

          {/* Change Password */}
          <div className="mt-6">
            <ChangePasswordSection />
          </div>

          {/* Ride History */}
          {user && <RideHistory userId={user.id} userType="user" />}

        </div>
      </main>
    </div>
  );
};

export default UserProfile;
