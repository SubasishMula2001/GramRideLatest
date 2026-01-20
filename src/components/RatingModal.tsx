import React, { useState } from 'react';
import { Star, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  driverId: string;
  driverName: string;
  userId: string;
  onRatingSubmitted?: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  rideId,
  driverId,
  driverName,
  userId,
  onRatingSubmitted,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      // Insert rating
      const { error: ratingError } = await supabase
        .from('ratings')
        .insert({
          ride_id: rideId,
          user_id: userId,
          driver_id: driverId,
          rating,
          feedback: feedback.trim() || null,
        });

      if (ratingError) throw ratingError;

      // Update driver's average rating
      const { data: allRatings } = await supabase
        .from('ratings')
        .select('rating')
        .eq('driver_id', driverId);

      if (allRatings && allRatings.length > 0) {
        const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
        await supabase
          .from('drivers')
          .update({ rating: Math.round(avgRating * 10) / 10 })
          .eq('id', driverId);
      }

      toast.success('Thank you for your feedback!');
      onRatingSubmitted?.();
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Rate Your Ride</DialogTitle>
          <DialogDescription className="text-center">
            How was your ride with {driverName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 transition-transform hover:scale-110 focus:outline-none"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= displayRating
                      ? 'fill-secondary text-secondary'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Rating Label */}
          <p className="text-center text-muted-foreground">
            {displayRating === 0 && 'Tap to rate'}
            {displayRating === 1 && 'Poor'}
            {displayRating === 2 && 'Fair'}
            {displayRating === 3 && 'Good'}
            {displayRating === 4 && 'Very Good'}
            {displayRating === 5 && 'Excellent!'}
          </p>

          {/* Feedback */}
          <Textarea
            placeholder="Add a comment (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="resize-none"
            rows={3}
          />

          {/* Submit Button */}
          <Button
            variant="hero"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Rating
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingModal;
