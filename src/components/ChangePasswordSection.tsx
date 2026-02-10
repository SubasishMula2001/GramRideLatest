import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ChangePasswordSection: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!currentPassword.trim()) newErrors.current = 'Current password is required';
    if (newPassword.length < 8) newErrors.new = 'Must be at least 8 characters';
    else if (!/[A-Z]/.test(newPassword)) newErrors.new = 'Must contain an uppercase letter';
    else if (!/[a-z]/.test(newPassword)) newErrors.new = 'Must contain a lowercase letter';
    else if (!/[0-9]/.test(newPassword)) newErrors.new = 'Must contain a number';
    else if (!/[^A-Za-z0-9]/.test(newPassword)) newErrors.new = 'Must contain a special character';
    if (newPassword !== confirmPassword) newErrors.confirm = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // Verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('User not found');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setErrors({ current: 'Current password is incorrect' });
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card">
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Lock className="w-5 h-5 text-primary" />
        Change Password
      </h3>

      <div className="space-y-4">
        {/* Current Password */}
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Current Password</label>
          <div className="relative">
            <Input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.current && <p className="text-destructive text-sm mt-1">{errors.current}</p>}
        </div>

        {/* New Password */}
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">New Password</label>
          <div className="relative">
            <Input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.new && <p className="text-destructive text-sm mt-1">{errors.new}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Confirm New Password</label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
          {errors.confirm && <p className="text-destructive text-sm mt-1">{errors.confirm}</p>}
        </div>

        <Button
          onClick={handleChangePassword}
          disabled={loading}
          className="w-full"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Change Password
        </Button>
      </div>
    </div>
  );
};

export default ChangePasswordSection;
