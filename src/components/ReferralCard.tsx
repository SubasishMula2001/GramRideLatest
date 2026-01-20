import React, { useState } from 'react';
import { Gift, Copy, Share2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ReferralCardProps {
  referralCode: string;
  credits: number;
  referralCount?: number;
}

const ReferralCard: React.FC<ReferralCardProps> = ({
  referralCode,
  credits,
  referralCount = 0,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const handleShare = async () => {
    const shareText = `Join GramRide using my referral code: ${referralCode} and get ₹50 off your first ride! 🚗`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GramRide Referral',
          text: shareText,
        });
      } catch (error) {
        // User cancelled or share failed
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="bg-gradient-card rounded-2xl border border-border/50 overflow-hidden shadow-card">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-white/20">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div className="text-white">
            <h3 className="font-bold text-lg">Refer & Earn</h3>
            <p className="text-sm opacity-90">Invite friends, earn credits!</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Referral Code */}
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-2 text-center">Your Referral Code</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold tracking-wider text-primary">
              {referralCode}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleCopy}
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-xl bg-primary/10">
            <div className="text-2xl font-bold text-primary">₹{credits}</div>
            <div className="text-xs text-muted-foreground">Credits Earned</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-secondary/10">
            <div className="text-2xl font-bold text-secondary">{referralCount}</div>
            <div className="text-xs text-muted-foreground">Friends Referred</div>
          </div>
        </div>

        {/* How it works */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">How it works:</p>
          <p>• Share your code with friends</p>
          <p>• They get ₹50 off their first ride</p>
          <p>• You earn ₹50 when they complete it!</p>
        </div>

        {/* Share Button */}
        <Button variant="hero" className="w-full" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Share Referral Code
        </Button>
      </div>
    </div>
  );
};

export default ReferralCard;
