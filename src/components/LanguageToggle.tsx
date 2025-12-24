import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ size = 'default', showLabel = true }) => {
  const { language, toggleLanguage } = useLanguage();

  const sizeClasses = {
    sm: 'h-10 px-3 text-sm',
    default: 'h-12 px-4 text-base',
    lg: 'h-14 px-6 text-lg',
  };

  return (
    <Button
      variant="outline"
      onClick={toggleLanguage}
      className={`${sizeClasses[size]} font-semibold border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all gap-2`}
    >
      <Globe className="w-5 h-5" />
      {showLabel && (
        <span className="font-bold">
          {language === 'en' ? 'বাংলা' : 'English'}
        </span>
      )}
    </Button>
  );
};

export default LanguageToggle;
