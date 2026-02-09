# GramRide — Deployment & Configuration Guide

> Complete guide to deploy GramRide for your area with all required API keys and settings.

---

## Table of Contents

1. [Overview](#overview)
2. [Required API Keys](#required-api-keys)
3. [Step 1: Razorpay Setup (Payments)](#step-1-razorpay-setup-payments)
4. [Step 2: Google Maps Setup (Maps & Navigation)](#step-2-google-maps-setup-maps--navigation)
5. [Step 3: Backend Secrets Configuration](#step-3-backend-secrets-configuration)
6. [Step 4: Supabase Self-Hosting (Optional)](#step-4-supabase-self-hosting-optional)
7. [Step 5: Frontend Deployment](#step-5-frontend-deployment)
8. [Step 6: Admin Account Setup](#step-6-admin-account-setup)
9. [Step 7: App Settings (Admin Panel)](#step-7-app-settings-admin-panel)
10. [Checklist Before Launch](#checklist-before-launch)

---

## Overview

GramRide requires **2 external services** to function:

| Service | Purpose | Free Tier? |
|---------|---------|------------|
| **Razorpay** | UPI & online payments | Yes (test mode) |
| **Google Maps** | Autocomplete, directions, static maps | $200/month free credit |

All other functionality (auth, database, real-time) is handled by the built-in backend (Supabase/Lovable Cloud).

---

## Required API Keys

| Secret Name | Where to Get | Used For |
|-------------|-------------|----------|
| `RAZORPAY_KEY_ID` | [Razorpay Dashboard](https://dashboard.razorpay.com) | Payment gateway (public key) |
| `RAZORPAY_KEY_SECRET` | [Razorpay Dashboard](https://dashboard.razorpay.com) | Payment verification (private) |
| `GOOGLE_MAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) | Maps, directions, places |

---

## Step 1: Razorpay Setup (Payments)

### 1.1 Create Account
1. Go to [https://razorpay.com](https://razorpay.com)
2. Sign up with your business details
3. Complete KYC verification (required for live payments)

### 1.2 Get API Keys
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Settings → API Keys**
3. Click **Generate Key** (or **Regenerate** if exists)
4. Copy both:
   - **Key ID** → `RAZORPAY_KEY_ID` (starts with `rzp_live_` for production)
   - **Key Secret** → `RAZORPAY_KEY_SECRET`

### 1.3 Test vs Live Mode
| Mode | Key Prefix | Real Money? |
|------|-----------|-------------|
| **Test** | `rzp_test_` | No — use for testing |
| **Live** | `rzp_live_` | Yes — use for production |

> ⚠️ **Important:** Switch to **Live mode** in Razorpay Dashboard before generating production keys. Test keys will NOT process real payments.

### 1.4 Razorpay via Admin Panel
You can also update Razorpay keys directly from the app:
1. Log in as **Admin**
2. Go to **Admin → Payment Settings**
3. Enter your `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
4. Click **Save**

---

## Step 2: Google Maps Setup (Maps & Navigation)

### 2.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project → New Project**
3. Name it (e.g., "GramRide") and create

### 2.2 Enable Required APIs
Navigate to **APIs & Services → Library** and enable these:

| API | Purpose |
|-----|---------|
| **Maps JavaScript API** | Map display |
| **Places API** | Location autocomplete |
| **Directions API** | Route calculation |
| **Maps Static API** | Static map images |
| **Geocoding API** | Address lookup |

### 2.3 Create API Key
1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → API Key**
3. Copy the key → this is your `GOOGLE_MAPS_API_KEY`

### 2.4 Restrict API Key (Recommended)
1. Click on your API key in the Credentials page
2. Under **API restrictions**, select **Restrict key**
3. Select only the 5 APIs listed above
4. Under **Application restrictions**:
   - For production: Add **HTTP referrers** (your domain)
   - Or use **IP restrictions** for edge functions
5. Click **Save**

### 2.5 Billing
- Google Maps gives **$200 free credit/month**
- For a village ride-hailing app, this is usually sufficient
- Set up **budget alerts** at [Billing → Budgets](https://console.cloud.google.com/billing)

---

## Step 3: Backend Secrets Configuration

### If using Lovable Cloud (Current Setup)
Secrets are already configured. To update them:

**Option A: Via Admin Panel (Razorpay only)**
- Admin → Payment Settings → Update keys

**Option B: Via Lovable Chat**
- Ask Lovable to update the secret value

### If self-hosting with Supabase CLI
Run these commands in your terminal:

```bash
# Set Razorpay keys
supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
supabase secrets set RAZORPAY_KEY_SECRET=your_secret_here

# Set Google Maps key
supabase secrets set GOOGLE_MAPS_API_KEY=AIzaSy_your_key_here

# Set demo user password (optional, for testing)
supabase secrets set DEMO_USER_PASSWORD=your_demo_password
```

Verify secrets are set:
```bash
supabase secrets list
```

---

## Step 4: Supabase Self-Hosting (Optional)

If you want to host the backend independently:

### 4.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project, note down:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon Key** (public key)
   - **Service Role Key** (private — never expose in frontend)

### 4.2 Run Database Migrations
```bash
# Link to your project
supabase link --project-ref your-project-id

# Run all migrations
supabase db push
```

### 4.3 Deploy Edge Functions
```bash
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy check-payment-status
supabase functions deploy process-cash-payment
supabase functions deploy maps-autocomplete
supabase functions deploy maps-directions
supabase functions deploy maps-geocode
supabase functions deploy maps-place-details
supabase functions deploy maps-static
supabase functions deploy create-demo-user
supabase functions deploy setup-demo-users
supabase functions deploy reset-demo-passwords
```

Or deploy all at once:
```bash
supabase functions deploy
```

### 4.4 Set Secrets on Your Supabase Project
```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
supabase secrets set RAZORPAY_KEY_SECRET=your_secret_here
supabase secrets set GOOGLE_MAPS_API_KEY=AIzaSy_your_key_here
```

---

## Step 5: Frontend Deployment

### Option A: Lovable (Easiest)
1. Click **Publish** in Lovable editor (top right)
2. Your app is live at `https://gramride.lovable.app`
3. Optionally connect a custom domain in **Settings → Domains**

### Option B: Vercel / Netlify
1. Connect your GitHub repo
2. Set environment variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   VITE_SUPABASE_PROJECT_ID=your-project-id
   ```
3. Deploy

### Option C: Static Hosting
```bash
npm run build
# Upload the `dist/` folder to any static host
```

---

## Step 6: Admin Account Setup

### Create Your Admin User
1. Sign up normally through the app
2. In the database, manually assign admin role:

```sql
-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('your-user-id-here', 'admin');
```

> ⚠️ Admin role cannot be self-assigned through the app (security measure).

---

## Step 7: App Settings (Admin Panel)

After logging in as admin, configure these settings:

| Setting | Location | Purpose |
|---------|----------|---------|
| Night charges | Admin → Settings | Enable/disable night fare surcharge |
| Surge pricing | Admin → Settings | Configure peak hour multiplier |
| Razorpay keys | Admin → Payment Settings | Update payment credentials |
| Driver verification | Admin → Drivers | Approve new drivers |
| Promo codes | Admin → Promo Codes | Create discount codes |

---

## Checklist Before Launch

### Critical ✅
- [ ] Razorpay **live keys** configured (not test keys)
- [ ] Google Maps API key set with correct APIs enabled
- [ ] Admin account created
- [ ] At least 1 verified driver registered
- [ ] Test a complete ride flow (book → accept → pickup → complete → pay)
- [ ] Test UPI payment with a real ₹1 transaction
- [ ] Test cash payment flow

### Recommended ✅
- [ ] Google Maps API key restricted to your domain
- [ ] Razorpay webhook configured (optional, for extra reliability)
- [ ] Set up Google Cloud billing alerts
- [ ] Custom domain connected
- [ ] Bengali translations verified
- [ ] Mobile responsiveness tested
- [ ] Night charges & surge pricing configured as desired

### Optional ✅
- [ ] Promo codes created for launch promotion
- [ ] Driver onboarding materials prepared
- [ ] User support contact/WhatsApp set up
- [ ] Razorpay test mode payment verified before switching to live

---

## Support & Troubleshooting

| Issue | Solution |
|-------|----------|
| Payments not working | Check Razorpay keys are **live** mode, not test |
| Maps not loading | Verify Google Maps APIs are enabled & key is valid |
| Driver can't register | Ensure "driver" role is being assigned during signup |
| Admin panel not accessible | Manually assign admin role via database |
| UPI not showing on driver screen | Check that `payments` table has realtime enabled |

---

## Architecture Summary

```
┌─────────────────────────────────────────┐
│              Frontend (React)            │
│         Hosted on Lovable/Vercel         │
├─────────────────────────────────────────┤
│           Supabase Backend              │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ │
│  │   Auth   │ │ Database │ │ Realtime │ │
│  └─────────┘ └──────────┘ └──────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │         Edge Functions              │ │
│  │  • Razorpay (create/verify/check)   │ │
│  │  • Google Maps (proxy)              │ │
│  │  • Cash payment processing          │ │
│  └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│          External Services              │
│  ┌───────────┐    ┌──────────────────┐  │
│  │ Razorpay  │    │  Google Maps     │  │
│  │ (Payments)│    │  (Navigation)    │  │
│  └───────────┘    └──────────────────┘  │
└─────────────────────────────────────────┘
```

---

*Last updated: February 2026*
*GramRide — Village Ride-Hailing Platform*
