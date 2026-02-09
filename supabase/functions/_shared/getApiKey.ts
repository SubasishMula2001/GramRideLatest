import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

// Map of app_settings keys to env var names
const KEY_MAP: Record<string, string> = {
  'razorpay_key_id': 'RAZORPAY_KEY_ID',
  'razorpay_key_secret': 'RAZORPAY_KEY_SECRET',
  'google_maps_api_key': 'GOOGLE_MAPS_API_KEY',
};

// Cache to avoid repeated DB queries within the same function invocation
const keyCache: Record<string, string> = {};

/**
 * Get an API key from app_settings (DB) with fallback to env var.
 * Uses service role to bypass RLS.
 */
export async function getApiKey(settingsKey: string): Promise<string | null> {
  // Return from cache if available
  if (keyCache[settingsKey]) return keyCache[settingsKey];

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', settingsKey)
      .single();

    if (!error && data) {
      // value is stored as JSON, could be a string like "\"actual_key\"" or just the key
      let val = data.value;
      if (typeof val === 'string') {
        val = val.replace(/^"|"$/g, ''); // strip surrounding quotes
      }
      if (val && val !== '') {
        keyCache[settingsKey] = val;
        return val;
      }
    }
  } catch (err) {
    console.log(`DB key lookup failed for ${settingsKey}, falling back to env var`);
  }

  // Fallback to environment variable
  const envKey = KEY_MAP[settingsKey] || settingsKey.toUpperCase();
  const envVal = Deno.env.get(envKey) || null;
  if (envVal) keyCache[settingsKey] = envVal;
  return envVal;
}
