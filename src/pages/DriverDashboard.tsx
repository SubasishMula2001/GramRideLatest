import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Power, 
  TrendingUp, 
  Clock, 
  Star, 
  IndianRupee, 
  Navigation,
  Bell,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import GramRideLogo from '@/components/GramRideLogo';
import RideCard from '@/components/RideCard';

const DriverDashboard = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [showRideRequest, setShowRideRequest] = useState(false);

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
    if (!isOnline) {
      // Simulate incoming ride request
      setTimeout(() => setShowRideRequest(true), 2000);
    } else {
      setShowRideRequest(false);
    }
  };

  const handleAcceptRide = () => {
    setShowRideRequest(false);
    // Navigate to ride in progress
  };

  const handleDeclineRide = () => {
    setShowRideRequest(false);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <GramRideLogo size="md" />
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/driver/profile">
                <User className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-lg">
          
          {/* Online Toggle Card */}
          <div className={`
            rounded-2xl p-6 mb-6 transition-all duration-500
            ${isOnline 
              ? 'bg-gradient-primary shadow-glow' 
              : 'bg-gradient-card border border-border/50 shadow-card'
            }
          `}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-bold ${isOnline ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {isOnline ? "You're Online" : "You're Offline"}
                </h2>
                <p className={`text-sm ${isOnline ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {isOnline ? 'Waiting for ride requests...' : 'Go online to receive rides'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Power className={`w-6 h-6 ${isOnline ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                <Switch
                  checked={isOnline}
                  onCheckedChange={handleToggleOnline}
                  className="data-[state=checked]:bg-secondary"
                />
              </div>
            </div>

            {isOnline && (
              <div className="mt-4 pt-4 border-t border-primary-foreground/20 flex items-center gap-2 text-primary-foreground/80 text-sm">
                <Navigation className="w-4 h-4 animate-pulse" />
                <span>GPS Active • High demand area</span>
              </div>
            )}
          </div>

          {/* Incoming Ride Request */}
          {showRideRequest && (
            <div className="mb-6">
              <RideCard
                id="ride-1"
                type="passenger"
                pickup="Gram Panchayat Office, Rampur"
                drop="Primary Health Center, Rampur"
                distance="2.3 km"
                estimatedFare={35}
                customerName="Ramesh Kumar"
                customerRating={4.8}
                onAccept={handleAcceptRide}
                onDecline={handleDeclineRide}
              />
            </div>
          )}

          {/* Today's Stats */}
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card mb-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Today's Earnings</h3>
            
            <div className="flex items-center justify-center mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center text-4xl font-bold text-primary">
                  <IndianRupee className="w-8 h-8" />
                  <span>1,250</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Total Earnings</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="text-xl font-bold text-foreground">8</div>
                <div className="text-xs text-muted-foreground">Rides</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="text-xl font-bold text-foreground flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" />
                  4.2h
                </div>
                <div className="text-xs text-muted-foreground">Online</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <div className="text-xl font-bold text-foreground flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 text-secondary" />
                  4.9
                </div>
                <div className="text-xs text-muted-foreground">Rating</div>
              </div>
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="bg-gradient-card rounded-2xl border border-border/50 p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">This Week</h3>
              <Button variant="ghost" size="sm" className="text-primary">
                View Details
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <IndianRupee className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground">Total Earnings</span>
                </div>
                <span className="font-bold text-foreground">₹8,450</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <TrendingUp className="w-5 h-5 text-secondary" />
                  </div>
                  <span className="text-foreground">Total Rides</span>
                </div>
                <span className="font-bold text-foreground">42</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Clock className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-foreground">Online Hours</span>
                </div>
                <span className="font-bold text-foreground">28h</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;
