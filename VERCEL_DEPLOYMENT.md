# 🚀 Deploy GramRide to Vercel (100% Free)

This guide will walk you through deploying your GramRide application to Vercel for free, without using Lovable.

## 📋 Prerequisites

Before you begin, make sure you have:
- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account (sign up with GitHub)
- A [Supabase](https://supabase.com) account
- Your API keys ready:
  - Razorpay API keys (see main DEPLOYMENT_GUIDE.md)
  - Google Maps API key (see main DEPLOYMENT_GUIDE.md)

---

## 🎯 Step-by-Step Deployment

### Step 1: Push Your Code to GitHub

1. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Name it `gramride` (or any name you prefer)
   - Make it **Private** (recommended for security)
   - Don't initialize with README (you already have one)
   - Click **Create repository**

2. **Push your local code to GitHub:**

```bash
# Navigate to your project directory
cd "d:\GramRide\GramRide Latest\gramride"

# Initialize git if not already done
git init

# Add all files
git add .

# Commit your code
git commit -m "Initial commit - GramRide app"

# Add your GitHub repository as remote (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

### Step 2: Set Up Supabase

1. **Create a Supabase project:**
   - Go to https://supabase.com/dashboard
   - Click **New Project**
   - Fill in project details:
     - **Name:** GramRide
     - **Database Password:** (create a strong password - save it!)
     - **Region:** Choose closest to your users
     - **Pricing Plan:** Free
   - Click **Create new project** (takes ~2 minutes)

2. **Get your Supabase credentials:**
   - Once created, go to **Project Settings** > **API**
   - Copy these values (you'll need them for Vercel):
     - **Project URL** → `VITE_SUPABASE_URL`
     - **anon public** key → `VITE_SUPABASE_PUBLISHABLE_KEY`

3. **Run database migrations:**
   
   First, install Supabase CLI:
   ```bash
   npm install supabase --save-dev
   ```

   Link your project:
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Get YOUR_PROJECT_REF from your Supabase project URL: `https://YOUR_PROJECT_REF.supabase.co`)

   Push migrations:
   ```bash
   npx supabase db push
   ```

4. **Deploy Edge Functions:**
   ```bash
   # Deploy all edge functions
   npx supabase functions deploy check-payment-status
   npx supabase functions deploy create-razorpay-order
   npx supabase functions deploy maps-autocomplete
   npx supabase functions deploy maps-directions
   npx supabase functions deploy maps-geocode
   npx supabase functions deploy maps-place-details
   npx supabase functions deploy maps-static
   npx supabase functions deploy process-cash-payment
   npx supabase functions deploy verify-razorpay-payment
   ```

5. **Set up Supabase secrets:**
   ```bash
   # Set Razorpay credentials
   npx supabase secrets set RAZORPAY_KEY_ID=your_razorpay_key_id
   npx supabase secrets set RAZORPAY_KEY_SECRET=your_razorpay_key_secret

   # Set Google Maps API key
   npx supabase secrets set GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

---

### Step 3: Deploy to Vercel

1. **Import your project to Vercel:**
   - Go to https://vercel.com/new
   - Click **Import Git Repository**
   - Select your GitHub account and find your `gramride` repository
   - Click **Import**

2. **Configure the project:**
   - **Framework Preset:** Vite (should auto-detect)
   - **Root Directory:** `./` (leave as is)
   - **Build Command:** `npm run build` (should be pre-filled)
   - **Output Directory:** `dist` (should be pre-filled)

3. **Add Environment Variables:**
   Click **Environment Variables** and add these:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | Your Supabase Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |

4. **Deploy:**
   - Click **Deploy**
   - Wait 2-3 minutes for the build to complete
   - 🎉 Your app is now live!

---

### Step 4: Configure Your Custom Domain (Optional)

1. In your Vercel project dashboard, go to **Settings** > **Domains**
2. Enter your custom domain (e.g., `gramride.com`)
3. Follow Vercel's DNS configuration instructions
4. Wait for DNS propagation (can take up to 48 hours, usually much faster)

**Free subdomain**: Vercel provides a free `.vercel.app` domain automatically.

---

### Step 5: Set Up Admin Account

1. **Visit your deployed app:**
   - Open the Vercel deployment URL (e.g., `https://your-app.vercel.app`)

2. **Create admin account:**
   - Go to **Login** page
   - Click **Sign up**
   - Register with your email

3. **Make yourself admin:**
   - Go to your Supabase dashboard
   - Click **Table Editor**
   - Open the `profiles` table
   - Find your user and edit the `role` field to `admin`
   - Save changes

4. **Log out and log back in** to see admin features

---

### Step 6: Configure App Settings (Admin Panel)

1. **Log in as admin** to your deployed app
2. **Go to Admin → Settings**
3. **Configure:**
   - Base fare
   - Per KM charge
   - Commission rate
   - Service area
   - Payment methods
   - App information

---

## 🔧 Automatic Deployments

Vercel automatically deploys your app when you push to GitHub:

```bash
# Make changes to your code
# ...

# Commit and push
git add .
git commit -m "Updated feature X"
git push

# Vercel automatically deploys! 🎉
```

You'll get:
- **Production URL**: Deploys from `main` branch
- **Preview URLs**: Deploys from other branches/PRs

---

## 🆓 Free Tier Limits

### Vercel Free Tier:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Custom domain support
- ✅ Serverless functions (not used in this app)

### Supabase Free Tier:
- ✅ 500MB database storage
- ✅ 1GB file storage
- ✅ 50,000 monthly active users
- ✅ 2GB bandwidth
- ✅ 500,000 Edge Function invocations/month

### Google Maps Free Tier:
- ✅ $200/month credit (≈28,000 map loads)
- ✅ No credit card required for first 90 days

### Razorpay:
- ✅ Free for test mode
- ✅ 2% fee for live transactions

---

## 🔒 Security Best Practices

1. **Environment Variables:**
   - ✅ Never commit `.env` file to Git
   - ✅ Use Vercel's Environment Variables dashboard
   - ✅ Keep API keys secret

2. **Supabase:**
   - ✅ Enable Row Level Security (RLS) on all tables
   - ✅ Use strong database password
   - ✅ Keep Supabase service_role key secure (never expose to frontend)

3. **API Keys:**
   - ✅ Restrict Google Maps API key to your domain
   - ✅ Use Razorpay test keys for testing
   - ✅ Switch to live keys only when ready for production

---

## 📊 Monitoring Your App

### Vercel Dashboard
- **Analytics**: View visitor stats, page views
- **Logs**: Check build logs and function logs
- **Performance**: Monitor Core Web Vitals

### Supabase Dashboard
- **Database**: View tables, run SQL queries
- **Auth**: Manage users
- **Storage**: Check uploaded files
- **Logs**: View API logs

---

## 🐛 Troubleshooting

### Build Fails
**Error: "Module not found"**
```bash
# Make sure all dependencies are in package.json
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Environment Variables Not Working
1. Check spelling in Vercel dashboard
2. Variables must start with `VITE_` to be accessible in frontend
3. Redeploy after adding new variables

### Database Connection Issues
1. Verify Supabase URL and keys are correct
2. Check Supabase project is not paused (free tier pauses after 1 week of inactivity)
3. Run migrations: `npx supabase db push`

### Maps Not Loading
1. Check Google Maps API key is set in Supabase secrets
2. Verify required APIs are enabled in Google Cloud Console
3. Check API key restrictions

---

## 🎓 Next Steps

1. ✅ Test all features on your live app
2. ✅ Configure app settings in admin panel
3. ✅ Set up Razorpay live mode (after testing)
4. ✅ Add your custom domain
5. ✅ Monitor usage to stay within free tiers
6. ✅ Share your app with users!

---

## 💡 Tips for Staying Free

1. **Optimize Images**: Compress images before uploading
2. **Cache Strategy**: Leverage Vercel's edge caching (already configured)
3. **Monitor Usage**: 
   - Check Vercel bandwidth usage monthly
   - Monitor Supabase database size
   - Track Google Maps API calls
4. **Gradual Growth**: Free tiers support significant traffic
5. **Upgrade When Ready**: Easy to upgrade if you exceed free tiers

---

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Google Maps API**: https://developers.google.com/maps/documentation
- **Razorpay Docs**: https://razorpay.com/docs

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Supabase project created
- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Supabase secrets configured (Razorpay, Google Maps)
- [ ] Vercel project created and linked
- [ ] Environment variables added in Vercel
- [ ] First deployment successful
- [ ] Admin account created
- [ ] Admin role assigned in Supabase
- [ ] App settings configured
- [ ] Test booking created successfully
- [ ] Payment flow tested (test mode)
- [ ] Maps and navigation tested
- [ ] Custom domain configured (optional)

---

**🎉 Congratulations! Your GramRide app is now live and running for free!**

For detailed API setup instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).
