import React from 'react';
import { TrendingUp, Car, IndianRupee, Calendar } from 'lucide-react';

interface RideSummaryCardProps {
  period: 'week' | 'month';
  totalRides: number;
  totalSpent: number;
  totalDistance: number;
  mostFrequentRoute?: string;
}

const RideSummaryCard: React.FC<RideSummaryCardProps> = ({
  period,
  totalRides,
  totalSpent,
  totalDistance,
  mostFrequentRoute,
}) => {
  return (
    <div className="bg-gradient-card rounded-2xl border border-border/50 p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          {period === 'week' ? 'This Week' : 'This Month'}
        </h3>
        <TrendingUp className="w-5 h-5 text-green-500" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 rounded-xl bg-primary/10">
          <Car className="w-5 h-5 text-primary mx-auto mb-1" />
          <div className="text-xl font-bold text-foreground">{totalRides}</div>
          <div className="text-xs text-muted-foreground">Rides</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-secondary/10">
          <IndianRupee className="w-5 h-5 text-secondary mx-auto mb-1" />
          <div className="text-xl font-bold text-foreground">₹{totalSpent}</div>
          <div className="text-xs text-muted-foreground">Spent</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-muted/50">
          <TrendingUp className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <div className="text-xl font-bold text-foreground">{totalDistance}</div>
          <div className="text-xs text-muted-foreground">km</div>
        </div>
      </div>

      {mostFrequentRoute && (
        <div className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Top Route:</span> {mostFrequentRoute}
        </div>
      )}
    </div>
  );
};

export default RideSummaryCard;
