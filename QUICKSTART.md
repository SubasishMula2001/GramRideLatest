# 🚀 Quick Start - Deploy GramRide to Vercel

## Prerequisites
- GitHub account
- Vercel account (sign up free at https://vercel.com)
- Supabase account (sign up free at https://supabase.com)

## 5-Minute Setup

### 1. Push to GitHub
```bash
cd "d:\GramRide\GramRide Latest\gramride"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Save your **Project URL** and **anon key**

### 3. Deploy Supabase Resources
```bash
# Link project (replace YOUR_PROJECT_REF)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push database
npx supabase db push

# Deploy functions (run each command)
npx supabase functions deploy check-payment-status
npx supabase functions deploy create-razorpay-order
npx supabase functions deploy maps-autocomplete
npx supabase functions deploy maps-directions
npx supabase functions deploy maps-geocode
npx supabase functions deploy maps-place-details
npx supabase functions deploy maps-static
npx supabase functions deploy process-cash-payment
npx supabase functions deploy verify-razorpay-payment

# Set secrets
npx supabase secrets set RAZORPAY_KEY_ID=your_key
npx supabase secrets set RAZORPAY_KEY_SECRET=your_secret
npx supabase secrets set GOOGLE_MAPS_API_KEY=your_key
```

### 4. Deploy to Vercel
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Add environment variables:
   - `VITE_SUPABASE_URL` = Your Supabase URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Your Supabase anon key
4. Click **Deploy**

### 5. Create Admin Account
1. Open your deployed app
2. Sign up with your email
3. Go to Supabase → Table Editor → profiles
4. Edit your user, set `role` to `admin`
5. Log out and back in

## 🎉 Done!

Your app is now live at `https://your-app.vercel.app`

---

## 📚 Full Documentation

- **Complete Guide**: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- **API Setup**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 🔑 Get API Keys

- **Razorpay**: https://dashboard.razorpay.com → Settings → API Keys
- **Google Maps**: https://console.cloud.google.com → APIs & Services → Credentials

## 💡 Next Steps

1. Configure app settings in Admin Panel
2. Test payment flow (test mode)
3. Test maps and navigation
4. Add custom domain (optional)
5. Switch to Razorpay live mode when ready

## 🆓 100% Free Tier Includes

- ✅ Unlimited Vercel deployments
- ✅ 100GB bandwidth/month
- ✅ 50,000 Supabase users/month
- ✅ $200/month Google Maps credit
- ✅ Custom HTTPS domain
