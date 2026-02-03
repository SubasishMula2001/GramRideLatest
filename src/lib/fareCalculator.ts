// GramRide Fare Calculator for Village Areas
// Simple fixed per-km rate with configurable night charges

import { supabase } from '@/integrations/supabase/client';

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

// Cache for night charges setting
let nightChargesEnabled: boolean | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Fetch night charges setting from database
 */
export async function fetchNightChargesSetting(): Promise<boolean> {
  const now = Date.now();
  
  // Return cached value if still valid
  if (nightChargesEnabled !== null && (now - lastFetchTime) < CACHE_DURATION) {
    return nightChargesEnabled;
  }
  
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'night_charges_enabled')
      .single();
    
    if (error || !data) {
      console.log('Night charges setting not found, defaulting to disabled');
      nightChargesEnabled = false;
    } else {
      nightChargesEnabled = data.value === true || data.value === 'true';
    }
    
    lastFetchTime = now;
    return nightChargesEnabled;
  } catch (err) {
    console.error('Error fetching night charges setting:', err);
    return false;
  }
}

/**
 * Update the cached night charges setting (used when admin changes it)
 */
export function updateNightChargesCache(enabled: boolean): void {
  nightChargesEnabled = enabled;
  lastFetchTime = Date.now();
}

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
 * @param nightChargesEnabled - Whether night charges are enabled (from settings)
 * @returns Fare breakdown
 */
export function calculateFare(
  distanceKm: number,
  scheduledTime?: Date,
  nightChargesEnabledOverride?: boolean
): {
  baseFare: number;
  nightCharge: number;
  totalFare: number;
  isNight: boolean;
} {
  const checkTime = scheduledTime || new Date();
  const isNight = isNightTime(checkTime);
  
  // Use override if provided, otherwise use cached value (default to false if not loaded)
  const applyNightCharges = nightChargesEnabledOverride !== undefined 
    ? nightChargesEnabledOverride 
    : (nightChargesEnabled ?? false);
  
  // Calculate base fare (distance × rate)
  let baseFare = Math.round(distanceKm * FARE_CONFIG.perKmRate);
  
  // Apply minimum fare
  if (baseFare < FARE_CONFIG.minimumFare) {
    baseFare = FARE_CONFIG.minimumFare;
  }
  
  // Calculate night charge only if enabled and it's night time
  const nightCharge = (isNight && applyNightCharges)
    ? Math.round(baseFare * FARE_CONFIG.nightChargePercent / 100) 
    : 0;
  
  const totalFare = baseFare + nightCharge;
  
  return {
    baseFare,
    nightCharge,
    totalFare,
    isNight: isNight && applyNightCharges, // Only report as night if charges apply
  };
}

/**
 * Format fare display with breakdown
 */
export function formatFareBreakdown(
  distanceKm: number,
  scheduledTime?: Date,
  nightChargesEnabledOverride?: boolean
): string {
  const { baseFare, nightCharge, isNight } = calculateFare(distanceKm, scheduledTime, nightChargesEnabledOverride);
  
  let breakdown = `₹${FARE_CONFIG.perKmRate}/km × ${distanceKm.toFixed(1)} km = ₹${baseFare}`;
  
  if (isNight && nightCharge > 0) {
    breakdown += ` + ₹${nightCharge} (night)`;
  }
  
  return breakdown;
}
