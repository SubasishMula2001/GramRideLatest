// Shared CORS configuration for all edge functions
// Restricts access to known origins for security

const ALLOWED_ORIGINS = [
  // Production domains
  "https://gramride.com",
  "https://www.gramride.com",
  // Lovable preview/staging domains
  "https://anwscfwpyfipcpdffkuc.lovableproject.com",
  // Development
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

// Check if origin matches any allowed origin pattern
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // Exact match
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Allow any Lovable preview domain
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/)) return true;
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovable\.app$/)) return true;
  
  return false;
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    return new Response(null, { headers: getCorsHeaders(origin) });
  }
  return null;
}
