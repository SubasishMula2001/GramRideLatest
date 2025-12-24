import React from 'react';

interface StatsCardProps {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({ value, label, icon }) => {
  return (
    <div className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/30">
      {icon && (
        <div className="flex justify-center mb-3">
          {icon}
        </div>
      )}
      <div className="text-3xl md:text-4xl font-bold text-gradient-primary mb-1">
        {value}
      </div>
      <div className="text-sm text-muted-foreground font-medium">
        {label}
      </div>
    </div>
  );
};

export default StatsCard;
