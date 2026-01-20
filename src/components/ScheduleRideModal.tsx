import React, { useState } from 'react';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format, addDays, setHours, setMinutes, isBefore } from 'date-fns';

interface ScheduleRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (scheduledFor: Date) => void;
}

const ScheduleRideModal: React.FC<ScheduleRideModalProps> = ({
  isOpen,
  onClose,
  onSchedule,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedHour, setSelectedHour] = useState<string>('');
  const [selectedMinute, setSelectedMinute] = useState<string>('');

  const handleSchedule = () => {
    if (!selectedDate || !selectedHour || !selectedMinute) {
      toast.error('Please select date and time');
      return;
    }

    let scheduledTime = setMinutes(
      setHours(selectedDate, parseInt(selectedHour)),
      parseInt(selectedMinute)
    );

    // Check if scheduled time is at least 30 minutes in the future
    const minTime = new Date(Date.now() + 30 * 60 * 1000);
    if (isBefore(scheduledTime, minTime)) {
      toast.error('Please schedule at least 30 minutes in advance');
      return;
    }

    onSchedule(scheduledTime);
    onClose();
    toast.success(`Ride scheduled for ${format(scheduledTime, 'PPp')}`);
  };

  // Generate hour options (6 AM to 11 PM)
  const hours = Array.from({ length: 18 }, (_, i) => {
    const hour = i + 6;
    return {
      value: hour.toString(),
      label: hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`,
    };
  });

  // Generate minute options (00, 15, 30, 45)
  const minutes = ['00', '15', '30', '45'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Schedule Ride
          </DialogTitle>
          <DialogDescription>
            Book a ride for later. Select your preferred date and time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Calendar */}
          <div className="flex justify-center">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => isBefore(date, new Date()) && date.toDateString() !== new Date().toDateString()}
              className="rounded-md border"
              fromDate={new Date()}
              toDate={addDays(new Date(), 7)}
            />
          </div>

          {/* Time Selection */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">Hour</label>
              <Select value={selectedHour} onValueChange={setSelectedHour}>
                <SelectTrigger>
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">Minute</label>
              <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                <SelectTrigger>
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((min) => (
                    <SelectItem key={min} value={min}>
                      :{min}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected DateTime Preview */}
          {selectedDate && selectedHour && selectedMinute && (
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <p className="text-sm text-muted-foreground">Scheduled for</p>
              <p className="font-semibold text-foreground">
                {format(
                  setMinutes(setHours(selectedDate, parseInt(selectedHour)), parseInt(selectedMinute)),
                  'EEEE, MMMM d, yyyy'
                )}
              </p>
              <p className="text-primary font-bold">
                {format(
                  setMinutes(setHours(selectedDate, parseInt(selectedHour)), parseInt(selectedMinute)),
                  'h:mm a'
                )}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="hero"
              className="flex-1"
              onClick={handleSchedule}
              disabled={!selectedDate || !selectedHour || !selectedMinute}
            >
              <Clock className="w-4 h-4 mr-2" />
              Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleRideModal;
