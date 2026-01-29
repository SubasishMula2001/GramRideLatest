import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Package, Shield, Clock, MapPin, Smartphone, Car, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GramRideLogo from '@/components/GramRideLogo';
import BookingTypeCard from '@/components/BookingTypeCard';
import FeatureCard from '@/components/FeatureCard';
import StatsCard from '@/components/StatsCard';
import LanguageToggle from '@/components/LanguageToggle';
import PendingRideBanner from '@/components/PendingRideBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut, userRole } = useAuth();
  const { t, language } = useLanguage();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(language === 'bn' ? 'সফলভাবে লগআউট হয়েছে' : 'Logged out successfully');
    } catch (error) {
      toast.error(language === 'bn' ? 'লগআউট করতে সমস্যা হয়েছে' : 'Failed to logout');
    }
  };

  // Bengali translations for this page
  const pageText = {
    en: {
      tagline: "Your Village's Trusted Ride Partner",
      heroTitle1: "Ride with ",
      heroDesc: "Affordable toto rides for passengers and goods delivery. Connecting villages with reliable, safe, and affordable transportation.",
      bookRide: "Book a Ride",
      becomeDriver: "Become a Driver",
      passengerToto: "Passenger Toto",
      passengerDesc: "Safe rides for you and your family",
      goodsToto: "Goods Toto",
      goodsDesc: "Reliable delivery for your packages",
      happyRiders: "Happy Riders",
      activeDrivers: "Active Drivers",
      villagesCovered: "Villages Covered",
      safeRides: "Safe Rides",
      whyChoose: "Why Choose",
      whyDesc: "We bring the convenience of modern ride-sharing to your village",
      safeSec: "Safe & Secure",
      safeSecDesc: "Verified drivers, live tracking, and emergency support for every ride",
      quickBook: "Quick Booking",
      quickBookDesc: "Book your ride in seconds with our easy-to-use app",
      affordable: "Affordable Fares",
      affordableDesc: "Transparent pricing with no hidden charges",
      liveTrack: "Live Tracking",
      liveTrackDesc: "Track your ride in real-time from pickup to drop",
      readyStart: "Ready to Start Your Ride?",
      readyDesc: "Download the GramRide app or book directly from our website. Your village's trusted ride partner is just a tap away.",
      bookNow: "Book Your Ride Now",
      joinDriver: "Join as Driver",
      copyright: "© 2024 GramRide. All rights reserved. Made with ❤️ for Villages",
      privacy: "Privacy",
      terms: "Terms",
      contact: "Contact",
    },
    bn: {
      tagline: "আপনার গ্রামের বিশ্বস্ত যাত্রার সঙ্গী",
      heroTitle1: "চলুন ",
      heroDesc: "যাত্রী ও মালপত্রের জন্য সাশ্রয়ী টোটো রাইড। নির্ভরযোগ্য, নিরাপদ ও সাশ্রয়ী পরিবহনে গ্রামগুলোকে সংযুক্ত করছি।",
      bookRide: "রাইড বুক করুন",
      becomeDriver: "ড্রাইভার হোন",
      passengerToto: "যাত্রী টোটো",
      passengerDesc: "আপনার ও পরিবারের জন্য নিরাপদ রাইড",
      goodsToto: "মালপত্র টোটো",
      goodsDesc: "আপনার পার্সেলের নির্ভরযোগ্য ডেলিভারি",
      happyRiders: "সন্তুষ্ট যাত্রী",
      activeDrivers: "সক্রিয় ড্রাইভার",
      villagesCovered: "গ্রাম কভার",
      safeRides: "নিরাপদ রাইড",
      whyChoose: "কেন বেছে নেবেন",
      whyDesc: "আমরা আধুনিক রাইড-শেয়ারিং এর সুবিধা আপনার গ্রামে নিয়ে আসছি",
      safeSec: "নিরাপদ ও সুরক্ষিত",
      safeSecDesc: "যাচাইকৃত ড্রাইভার, লাইভ ট্র্যাকিং এবং প্রতিটি রাইডে জরুরি সহায়তা",
      quickBook: "দ্রুত বুকিং",
      quickBookDesc: "আমাদের সহজ অ্যাপে কয়েক সেকেন্ডে রাইড বুক করুন",
      affordable: "সাশ্রয়ী ভাড়া",
      affordableDesc: "কোনো লুকানো চার্জ ছাড়া স্বচ্ছ মূল্য",
      liveTrack: "লাইভ ট্র্যাকিং",
      liveTrackDesc: "পিকআপ থেকে ড্রপ পর্যন্ত রিয়েল-টাইমে আপনার রাইড ট্র্যাক করুন",
      readyStart: "রাইড শুরু করতে প্রস্তুত?",
      readyDesc: "গ্রামরাইড অ্যাপ ডাউনলোড করুন বা সরাসরি আমাদের ওয়েবসাইট থেকে বুক করুন। আপনার গ্রামের বিশ্বস্ত রাইড পার্টনার এক ট্যাপেই।",
      bookNow: "এখনই রাইড বুক করুন",
      joinDriver: "ড্রাইভার হিসেবে যোগ দিন",
      copyright: "© ২০২৪ গ্রামরাইড। সর্বস্বত্ব সংরক্ষিত। গ্রামের জন্য ❤️ দিয়ে তৈরি",
      privacy: "গোপনীয়তা",
      terms: "শর্তাবলী",
      contact: "যোগাযোগ",
    }
  };

  const txt = pageText[language];

  return (
    <div className="min-h-screen bg-gradient-hero pt-16">

      {/* Pending Ride Banner - shows if user has an active pending ride */}
      <div className="container mx-auto px-4 pt-8">
        <PendingRideBanner />
      </div>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
              <MapPin className="w-4 h-4" />
              {txt.tagline}
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-slide-up">
              {txt.heroTitle1}
              <span className="text-gradient-primary">Gram</span>
              <span className="text-secondary">Ride</span>
              {language === 'bn' && ' এ'}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
              {txt.heroDesc}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Button variant="hero" size="xl" asChild>
                <Link to="/book">
                  <Car className="w-5 h-5" />
                  {txt.bookRide}
                </Link>
              </Button>
              <Button variant="heroOutline" size="xl" asChild>
                <Link to="/driver">
                  {txt.becomeDriver}
                </Link>
              </Button>
            </div>
          </div>

          {/* Booking Type Selection */}
          <div className="max-w-2xl mx-auto mt-16 grid md:grid-cols-2 gap-4">
            <BookingTypeCard
              icon={Users}
              title={txt.passengerToto}
              description={txt.passengerDesc}
              onClick={() => navigate('/book')}
              variant="passenger"
            />
            <BookingTypeCard
              icon={Package}
              title={txt.goodsToto}
              description={txt.goodsDesc}
              onClick={() => navigate('/book')}
              variant="goods"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gradient-primary">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <StatsCard value="10K+" label={txt.happyRiders} />
            <StatsCard value="500+" label={txt.activeDrivers} />
            <StatsCard value="50+" label={txt.villagesCovered} />
            <StatsCard value="99%" label={txt.safeRides} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {txt.whyChoose} <span className="text-gradient-primary">GramRide</span>?
            </h2>
            <p className="text-muted-foreground">
              {txt.whyDesc}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={Shield}
              title={txt.safeSec}
              description={txt.safeSecDesc}
              delay={0}
            />
            <FeatureCard
              icon={Clock}
              title={txt.quickBook}
              description={txt.quickBookDesc}
              delay={100}
            />
            <FeatureCard
              icon={TrendingUp}
              title={txt.affordable}
              description={txt.affordableDesc}
              delay={200}
            />
            <FeatureCard
              icon={Smartphone}
              title={txt.liveTrack}
              description={txt.liveTrackDesc}
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-card">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {txt.readyStart}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              {txt.readyDesc}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/book">{txt.bookNow}</Link>
              </Button>
              <Button variant="secondary" size="xl" asChild>
                <Link to="/driver">{txt.joinDriver}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-foreground text-primary-foreground">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <GramRideLogo size="md" />
            <p className="text-primary-foreground/70 text-sm">
              {txt.copyright}
            </p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">{txt.privacy}</Link>
              <Link to="/terms" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">{txt.terms}</Link>
              <Link to="/contact" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">{txt.contact}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
