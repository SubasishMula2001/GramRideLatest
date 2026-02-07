import { supabase } from '@/integrations/supabase/client';

interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
}

// Get device/browser info from user agent
const getDeviceInfo = (): DeviceInfo => {
  const ua = navigator.userAgent;
  
  // Detect browser
  let browser = 'Unknown Browser';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  
  // Detect OS
  let os = 'Unknown OS';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  // Detect device type
  let device = 'Desktop';
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
    device = /iPad/i.test(ua) ? 'Tablet' : 'Mobile';
  }
  
  return { browser, os, device };
};

// Format device info as string
const formatDeviceInfo = (): string => {
  const { browser, os, device } = getDeviceInfo();
  return `${browser} on ${os} (${device})`;
};

// Fetch public IP address
const getPublicIP = async (): Promise<string | null> => {
  try {
    // Using ipify API to get public IP
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    if (response.ok) {
      const data = await response.json();
      return data.ip;
    }
  } catch (error) {
    console.warn('Could not fetch IP address:', error);
  }
  return null;
};

// Cache the IP to avoid multiple fetches
let cachedIP: string | null = null;
let ipFetchPromise: Promise<string | null> | null = null;

const getCachedIP = async (): Promise<string | null> => {
  if (cachedIP) return cachedIP;
  
  if (!ipFetchPromise) {
    ipFetchPromise = getPublicIP().then(ip => {
      cachedIP = ip;
      return ip;
    });
  }
  
  return ipFetchPromise;
};

export interface ActivityLogParams {
  userId: string;
  action: string;
  details?: Record<string, any>;
}

export const logActivity = async ({ userId, action, details }: ActivityLogParams): Promise<void> => {
  try {
    const [ipAddress] = await Promise.all([getCachedIP()]);
    const deviceInfo = formatDeviceInfo();
    
    const { error } = await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      details: details || null,
      ip_address: ipAddress,
      device_info: deviceInfo
    });
    
    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
  }
};

// React hook version for components
export const useActivityLog = () => {
  return { logActivity };
};
