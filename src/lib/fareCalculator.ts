// GramRide Fare Calculator for Village Areas
// Simple fixed per-km rate with night charges

export interface FareConfig {
  perKmRate: number;       // ₹ per kilometer
  minimumFare: number;     // Minimum fare regardless of distance
  nightChargePercent: number; // Extra % during night hours
  nightStartHour: number;  // Night charges start (24h format)
  nightEndHour: number;    // Night charges end (24h format)
}

// Village-friendly rates (same for passenger and goods as requested)
export const FARE_CONFIG: FareConfig = {
  perKmRate: 10,           // ₹10 per km - affordable for villages
  minimumFare: 10,         // Minimum ₹10 per ride
  nightChargePercent: 20,  // 20% extra at night
  nightStartHour: 22,      // Night starts at 10 PM
  nightEndHour: 6,         // Night ends at 6 AM
};

/**
 * Check if current time is during night hours
 */
export function isNightTime(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= FARE_CONFIG.nightStartHour || hour < FARE_CONFIG.nightEndHour;
}

/**
 * Calculate fare based on distance
 * @param distanceKm - Distance in kilometers
 * @param scheduledTime - Optional scheduled time (for pre-checking night charges)
 * @returns Fare breakdown
 */
export function calculateFare(
  distanceKm: number,
  scheduledTime?: Date
): {
  baseFare: number;
  nightCharge: number;
  totalFare: number;
  isNight: boolean;
} {
  const checkTime = scheduledTime || new Date();
  const isNight = isNightTime(checkTime);
  
  // Calculate base fare (distance × rate)
  let baseFare = Math.round(distanceKm * FARE_CONFIG.perKmRate);
  
  // Apply minimum fare
  if (baseFare < FARE_CONFIG.minimumFare) {
    baseFare = FARE_CONFIG.minimumFare;
  }
  
  // Calculate night charge
  const nightCharge = isNight 
    ? Math.round(baseFare * FARE_CONFIG.nightChargePercent / 100) 
    : 0;
  
  const totalFare = baseFare + nightCharge;
  
  return {
    baseFare,
    nightCharge,
    totalFare,
    isNight,
  };
}

/**
 * Format fare display with breakdown
 */
export function formatFareBreakdown(
  distanceKm: number,
  scheduledTime?: Date
): string {
  const { baseFare, nightCharge, isNight } = calculateFare(distanceKm, scheduledTime);
  
  let breakdown = `₹${FARE_CONFIG.perKmRate}/km × ${distanceKm.toFixed(1)} km = ₹${baseFare}`;
  
  if (isNight) {
    breakdown += ` + ₹${nightCharge} (night)`;
  }
  
  return breakdown;
}
