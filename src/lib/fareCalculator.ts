// GramRide Fare Calculator for Village Areas
// Simple fixed per-km rate with configurable night charges and surge pricing

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

// Cache for settings
let nightChargesEnabled: boolean | null = null;
let surgeSettings: {
  enabled: boolean;
  multiplier: number;
  startHour: number;
  endHour: number;
} | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Fetch all fare settings from database
 */
export async function fetchFareSettings(): Promise<void> {
  const now = Date.now();
  
  // Return cached value if still valid
  if (nightChargesEnabled !== null && surgeSettings !== null && (now - lastFetchTime) < CACHE_DURATION) {
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'night_charges_enabled',
        'surge_pricing_enabled',
        'surge_multiplier',
        'surge_start_hour',
        'surge_end_hour'
      ]);
    
    if (error || !data) {
      console.log('Settings not found, using defaults');
      nightChargesEnabled = false;
      surgeSettings = { enabled: false, multiplier: 1.5, startHour: 8, endHour: 10 };
    } else {
      const settings: Record<string, any> = {};
      data.forEach(s => { settings[s.key] = s.value; });
      
      nightChargesEnabled = settings.night_charges_enabled === true || settings.night_charges_enabled === 'true';
      surgeSettings = {
        enabled: settings.surge_pricing_enabled === true || settings.surge_pricing_enabled === 'true',
        multiplier: parseFloat(settings.surge_multiplier) || 1.5,
        startHour: parseInt(settings.surge_start_hour) || 8,
        endHour: parseInt(settings.surge_end_hour) || 10,
      };
    }
    
    lastFetchTime = now;
  } catch (err) {
    console.error('Error fetching fare settings:', err);
    nightChargesEnabled = false;
    surgeSettings = { enabled: false, multiplier: 1.5, startHour: 8, endHour: 10 };
  }
}

/**
 * Fetch night charges setting from database (legacy support)
 */
export async function fetchNightChargesSetting(): Promise<boolean> {
  await fetchFareSettings();
  return nightChargesEnabled ?? false;
}

/**
 * Update the cached night charges setting (used when admin changes it)
 */
export function updateNightChargesCache(enabled: boolean): void {
  nightChargesEnabled = enabled;
  lastFetchTime = Date.now();
}

/**
 * Update the cached surge settings (used when admin changes them)
 */
export function updateSurgeCache(settings: { enabled: boolean; multiplier: number; startHour: number; endHour: number }): void {
  surgeSettings = settings;
  lastFetchTime = Date.now();
}

/**
 * Check if current time is during surge hours
 */
export function isSurgeTime(date: Date = new Date()): boolean {
  if (!surgeSettings?.enabled) return false;
  const hour = date.getHours();
  return hour >= surgeSettings.startHour && hour < surgeSettings.endHour;
}

/**
 * Get current surge multiplier
 */
export function getSurgeMultiplier(date: Date = new Date()): number {
  if (!isSurgeTime(date)) return 1;
  return surgeSettings?.multiplier || 1;
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
  surgeCharge: number;
  totalFare: number;
  isNight: boolean;
  isSurge: boolean;
  surgeMultiplier: number;
} {
  const checkTime = scheduledTime || new Date();
  const isNight = isNightTime(checkTime);
  const isSurge = isSurgeTime(checkTime);
  const surgeMultiplier = getSurgeMultiplier(checkTime);
  
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
  
  // Calculate surge charge
  const fareAfterNight = baseFare + nightCharge;
  const surgeCharge = isSurge 
    ? Math.round(fareAfterNight * (surgeMultiplier - 1))
    : 0;
  
  const totalFare = baseFare + nightCharge + surgeCharge;
  
  return {
    baseFare,
    nightCharge,
    surgeCharge,
    totalFare,
    isNight: isNight && applyNightCharges, // Only report as night if charges apply
    isSurge,
    surgeMultiplier,
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
  const { baseFare, nightCharge, surgeCharge, isNight, isSurge, surgeMultiplier } = calculateFare(distanceKm, scheduledTime, nightChargesEnabledOverride);
  
  let breakdown = `₹${FARE_CONFIG.perKmRate}/km × ${distanceKm.toFixed(1)} km = ₹${baseFare}`;
  
  if (isNight && nightCharge > 0) {
    breakdown += ` + ₹${nightCharge} (night)`;
  }
  
  if (isSurge && surgeCharge > 0) {
    breakdown += ` + ₹${surgeCharge} (${surgeMultiplier}x surge)`;
  }
  
  return breakdown;
}
