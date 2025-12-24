import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Package, Shield, Clock, MapPin, Smartphone, Car, TrendingUp, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GramRideLogo from '@/components/GramRideLogo';
import BookingTypeCard from '@/components/BookingTypeCard';
import FeatureCard from '@/components/FeatureCard';
import StatsCard from '@/components/StatsCard';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut, userRole } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero pt-16">

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
              <MapPin className="w-4 h-4" />
              Your Village's Trusted Ride Partner
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-slide-up">
              Ride with{' '}
              <span className="text-gradient-primary">Gram</span>
              <span className="text-secondary">Ride</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
              Affordable toto rides for passengers and goods delivery. 
              Connecting villages with reliable, safe, and affordable transportation.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Button variant="hero" size="xl" asChild>
                <Link to="/book">
                  <Car className="w-5 h-5" />
                  Book a Ride
                </Link>
              </Button>
              <Button variant="heroOutline" size="xl" asChild>
                <Link to="/driver">
                  Become a Driver
                </Link>
              </Button>
            </div>
          </div>

          {/* Booking Type Selection */}
          <div className="max-w-2xl mx-auto mt-16 grid md:grid-cols-2 gap-4">
            <BookingTypeCard
              icon={Users}
              title="Passenger Toto"
              description="Safe rides for you and your family"
              onClick={() => {}}
              variant="passenger"
            />
            <BookingTypeCard
              icon={Package}
              title="Goods Toto"
              description="Reliable delivery for your packages"
              onClick={() => {}}
              variant="goods"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gradient-primary">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <StatsCard value="10K+" label="Happy Riders" />
            <StatsCard value="500+" label="Active Drivers" />
            <StatsCard value="50+" label="Villages Covered" />
            <StatsCard value="99%" label="Safe Rides" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose <span className="text-gradient-primary">GramRide</span>?
            </h2>
            <p className="text-muted-foreground">
              We bring the convenience of modern ride-sharing to your village
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={Shield}
              title="Safe & Secure"
              description="Verified drivers, live tracking, and emergency support for every ride"
              delay={0}
            />
            <FeatureCard
              icon={Clock}
              title="Quick Booking"
              description="Book your ride in seconds with our easy-to-use app"
              delay={100}
            />
            <FeatureCard
              icon={TrendingUp}
              title="Affordable Fares"
              description="Transparent pricing with no hidden charges"
              delay={200}
            />
            <FeatureCard
              icon={Smartphone}
              title="Live Tracking"
              description="Track your ride in real-time from pickup to drop"
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
              Ready to Start Your Ride?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Download the GramRide app or book directly from our website. 
              Your village's trusted ride partner is just a tap away.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/book">Book Your Ride Now</Link>
              </Button>
              <Button variant="secondary" size="xl" asChild>
                <Link to="/driver">Join as Driver</Link>
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
              © 2024 GramRide. All rights reserved. Made with ❤️ for Villages
            </p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">Terms</Link>
              <Link to="/contact" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
