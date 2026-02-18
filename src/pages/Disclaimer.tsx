import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

const Disclaimer = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>{language === 'bn' ? 'ফিরে যান' : 'Back'}</span>
          </Link>
          <LanguageToggle size="default" />
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-10 shadow-sm">
          {language === 'bn' ? (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-6">দাবিত্যাগ – GramRide</h1>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                <p>GramRide একটি স্থানীয় রাইড বুকিং ও সমন্বয় প্ল্যাটফর্ম।</p>
                <p>GramRide কোনো যানবাহনের মালিক, পরিচালক বা ব্যবস্থাপক নয়। সমস্ত যানবাহন স্থানীয় ড্রাইভারদের মালিকানাধীন ও স্বতন্ত্রভাবে পরিচালিত।</p>
                <p>যানবাহনের পারমিট, বীমা, নিরাপত্তা ও আইনি সম্মতি সম্পূর্ণরূপে ড্রাইভারের দায়িত্ব।</p>
                <p>GramRide শুধুমাত্র ব্যবহারকারী ও ড্রাইভারের মধ্যে যোগাযোগ ও বুকিং সুবিধা প্রদান করে।</p>
                <p>রাইড চলাকালীন দুর্ঘটনা, বিবাদ, ক্ষতি বা আইনি বিষয়ের জন্য GramRide দায়ী থাকবে না।</p>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-6">Disclaimer – GramRide</h1>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
                <p>GramRide is a local ride booking and coordination platform.</p>
                <p>GramRide does not own, operate, or manage any vehicles. All vehicles are independently owned and operated by local drivers.</p>
                <p>Vehicle permits, insurance, safety, and legal compliance are the sole responsibility of the driver.</p>
                <p>GramRide only facilitates communication and booking between users and drivers.</p>
                <p>GramRide shall not be held liable for accidents, disputes, losses, or legal matters arising during rides.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
