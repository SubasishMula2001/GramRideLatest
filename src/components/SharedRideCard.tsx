import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  MapPin, 
  Navigation, 
  Clock, 
  IndianRupee,
  UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface SharedRideCardProps {
  id: string;
  routeName: string;
  pickup: string;
  dropoff: string;
  departureTime: string;
  farePerPerson: number;
  currentPassengers: number;
  maxPassengers: number;
  status: 'open' | 'full' | 'in_progress' | 'completed';
  onJoin?: () => void;
  isJoined?: boolean;
  isLoading?: boolean;
}

const SharedRideCard: React.FC<SharedRideCardProps> = ({
  id,
  routeName,
  pickup,
  dropoff,
  departureTime,
  farePerPerson,
  currentPassengers,
  maxPassengers,
  status,
  onJoin,
  isJoined = false,
  isLoading = false,
}) => {
  const { t } = useLanguage();
  const isBengali = t.signIn === 'লগইন করুন';
  
  const spotsLeft = maxPassengers - currentPassengers;
  const departureDate = new Date(departureTime);
  
  const getStatusBadge = () => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500">{isBengali ? 'যোগ দিন' : 'Open'}</Badge>;
      case 'full':
        return <Badge variant="secondary">{isBengali ? 'পূর্ণ' : 'Full'}</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">{isBengali ? 'চলছে' : 'In Progress'}</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-border/50 hover:border-primary/30 transition-all">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{routeName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(departureDate, 'dd MMM, hh:mm a')}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {/* Route */}
        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2">
            <Navigation className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground truncate">{pickup}</p>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground truncate">{dropoff}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between py-3 px-3 bg-muted/50 rounded-lg mb-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{isBengali ? 'ভাড়া/জন' : 'Fare/Person'}</p>
            <p className="font-bold text-primary flex items-center justify-center">
              <IndianRupee className="w-3 h-3" />
              {farePerPerson}
            </p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{isBengali ? 'যাত্রী' : 'Passengers'}</p>
            <p className="font-bold text-foreground">{currentPassengers}/{maxPassengers}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{isBengali ? 'বাকি সিট' : 'Spots Left'}</p>
            <p className={`font-bold ${spotsLeft > 0 ? 'text-green-600' : 'text-destructive'}`}>
              {spotsLeft}
            </p>
          </div>
        </div>

        {/* Action */}
        {status === 'open' && !isJoined && onJoin && (
          <Button 
            className="w-full" 
            onClick={onJoin}
            disabled={isLoading || spotsLeft <= 0}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {isLoading 
              ? (isBengali ? 'যোগ দিচ্ছে...' : 'Joining...') 
              : (isBengali ? 'যোগ দিন' : 'Join Ride')}
          </Button>
        )}
        
        {isJoined && (
          <div className="text-center py-2 bg-green-500/10 rounded-lg">
            <p className="text-sm font-medium text-green-600">
              {isBengali ? '✓ আপনি যোগ দিয়েছেন' : '✓ You have joined'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SharedRideCard;
