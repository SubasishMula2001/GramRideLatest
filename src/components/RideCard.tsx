import React from 'react';
import { MapPin, Navigation, Clock, IndianRupee, User, Package } from 'lucide-react';
import { Button } from './ui/button';

interface RideCardProps {
  id: string;
  type: 'passenger' | 'goods';
  pickup: string;
  drop: string;
  distance: string;
  estimatedFare: number;
  customerName: string;
  customerRating: number;
  onAccept: () => void;
  onDecline: () => void;
}

const RideCard: React.FC<RideCardProps> = ({
  type,
  pickup,
  drop,
  distance,
  estimatedFare,
  customerName,
  customerRating,
  onAccept,
  onDecline,
}) => {
  return (
    <div className="bg-gradient-card rounded-2xl border border-border/50 shadow-elevated overflow-hidden animate-scale-in">
      {/* Header */}
      <div className={`px-5 py-3 flex items-center justify-between ${
        type === 'passenger' ? 'bg-gradient-primary' : 'bg-gradient-secondary'
      }`}>
        <div className="flex items-center gap-2 text-primary-foreground">
          {type === 'passenger' ? (
            <User className="w-5 h-5" />
          ) : (
            <Package className="w-5 h-5" />
          )}
          <span className="font-semibold capitalize">{type} Ride</span>
        </div>
        <div className="flex items-center gap-1 text-primary-foreground/90 text-sm">
          <Clock className="w-4 h-4" />
          <span>2 min ago</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Customer Info */}
        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <User className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{customerName}</p>
            <div className="flex items-center gap-1">
              <span className="text-secondary">★</span>
              <span className="text-sm text-muted-foreground">{customerRating}</span>
            </div>
          </div>
        </div>

        {/* Locations */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 p-1.5 rounded-full bg-primary/10">
              <Navigation className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Pickup</p>
              <p className="text-foreground font-medium">{pickup}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="mt-1 p-1.5 rounded-full bg-secondary/10">
              <MapPin className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Drop</p>
              <p className="text-foreground font-medium">{drop}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between py-4 px-4 bg-muted/50 rounded-xl">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Distance</p>
            <p className="font-bold text-foreground">{distance}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Fare</p>
            <p className="font-bold text-foreground flex items-center">
              <IndianRupee className="w-4 h-4" />
              {estimatedFare}
            </p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">ETA</p>
            <p className="font-bold text-foreground">5 min</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button 
            variant="outline" 
            className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={onDecline}
          >
            Decline
          </Button>
          <Button 
            variant="hero" 
            className="flex-1"
            onClick={onAccept}
          >
            Accept Ride
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RideCard;
