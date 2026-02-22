import React from 'react';
import { IndianRupee, Clock, Navigation, TrendingUp, Info } from 'lucide-react';
import { calculateFare, FARE_CONFIG } from '@/lib/fareCalculator';
import { motion } from 'framer-motion';

interface VehicleType {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  image_url: string | null;
  base_fare: number;
  per_km_rate: number;
}

interface FareEstimationCardProps {
  vehicleTypes: VehicleType[];
  distance: number;
  estimatedTime: number;
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
  scheduledFor?: Date;
  nightChargesEnabled?: boolean;
}

const FareEstimationCard: React.FC<FareEstimationCardProps> = ({
  vehicleTypes,
  distance,
  estimatedTime,
  selectedVehicleId,
  onSelectVehicle,
  scheduledFor,
  nightChargesEnabled = false
}) => {
  return (
    <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-elevated">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground text-lg">Choose Your Ride</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Navigation className="w-4 h-4" />
          <span>{distance} km</span>
          <Clock className="w-4 h-4 ml-2" />
          <span>{estimatedTime} min</span>
        </div>
      </div>

      <div className="space-y-3">
        {vehicleTypes.map((vehicle, index) => {
          // Calculate fare for this specific vehicle type
          const fareBreakdown = calculateFare(
            distance,
            scheduledFor,
            nightChargesEnabled,
            vehicle.per_km_rate,
            vehicle.base_fare
          );
          const isSelected = selectedVehicleId === vehicle.id;

          return (
            <motion.button
              key={vehicle.id}
              type="button"
              onClick={() => onSelectVehicle(vehicle.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Vehicle Info */}
                <div className="flex items-start gap-3 flex-1">
                  {vehicle.image_url ? (
                    <img 
                      src={vehicle.image_url} 
                      alt={vehicle.display_name}
                      className="w-14 h-14 object-contain"
                    />
                  ) : (
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <IndianRupee className={`w-7 h-7 ${
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${
                        isSelected ? 'text-primary' : 'text-foreground'
                      }`}>
                        {vehicle.display_name}
                      </h4>
                      {fareBreakdown.isNight && (
                        <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
                          🌙 Night
                        </span>
                      )}
                    </div>
                    {vehicle.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                        {vehicle.description}
                      </p>
                    )}
                    
                    {/* Fare Breakdown (compact) */}
                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Base fare:</span>
                        <span>₹{vehicle.base_fare}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Distance ({distance} km × ₹{vehicle.per_km_rate}):</span>
                        <span>₹{fareBreakdown.distanceFare}</span>
                      </div>
                      {fareBreakdown.nightCharge > 0 && (
                        <div className="flex items-center justify-between text-secondary">
                          <span>Night charge (+{FARE_CONFIG.nightChargePercent}%):</span>
                          <span>₹{fareBreakdown.nightCharge}</span>
                        </div>
                      )}
                      {fareBreakdown.surgeCharge > 0 && (
                        <div className="flex items-center justify-between text-orange-600">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Surge pricing:
                          </span>
                          <span>₹{fareBreakdown.surgeCharge}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Total Fare */}
                <div className={`text-right flex flex-col items-end justify-center ${
                  isSelected ? 'scale-110' : ''
                } transition-transform`}>
                  <div className="text-xs text-muted-foreground mb-1">Total</div>
                  <div className={`text-xl font-bold flex items-center ${
                    isSelected ? 'text-primary' : 'text-foreground'
                  }`}>
                    <IndianRupee className="w-5 h-5" />
                    {fareBreakdown.totalFare}
                  </div>
                  {isSelected && (
                    <div className="text-xs text-primary mt-1 font-medium">
                      ✓ Selected
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Fares are estimated based on distance and time. Actual fare may vary based on traffic, waiting time, and route changes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FareEstimationCard;
