import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

const CancellationPolicy = () => {
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
              <h1 className="text-3xl font-bold text-foreground mb-2">বাতিল ও ফেরত নীতি – GramRide</h1>
              <p className="text-muted-foreground mb-8">কার্যকর তারিখ: ১৮ ফেব্রুয়ারি, ২০২৬</p>

              <Section title="১. ব্যবহারকারী বাতিল">
                <ul className="list-disc pl-5 space-y-1">
                  <li>ড্রাইভার আসার আগে ব্যবহারকারীরা বুকিং বাতিল করতে পারেন।</li>
                  <li>বারবার অপব্যবহারের ফলে সীমাবদ্ধতা আরোপ হতে পারে।</li>
                </ul>
              </Section>
              <Section title="২. ড্রাইভার বাতিল">
                <p>ড্রাইভাররা উপলব্ধতা বা অন্যান্য বৈধ কারণে রাইড প্রত্যাখ্যান বা বাতিল করতে পারেন।</p>
              </Section>
              <Section title="৩. ফেরত">
                <ul className="list-disc pl-5 space-y-1">
                  <li>রাইডের ভাড়া সরাসরি ড্রাইভারকে প্রদান করা হয়, তাই GramRide রাইড পেমেন্টের জন্য ফেরত প্রক্রিয়া করে না।</li>
                  <li>GramRide সরাসরি কোনো সার্ভিস চার্জ সংগ্রহ করলে, ফেরত (প্রযোজ্য হলে) যুক্তিসঙ্গত সময়ের মধ্যে প্রক্রিয়া করা হবে।</li>
                </ul>
              </Section>
              <Section title="৪. বিবাদ">
                <p>রাইড সম্পর্কিত বিবাদ সরাসরি ব্যবহারকারী ও ড্রাইভারের মধ্যে সমাধান করা উচিত।</p>
              </Section>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-2">Cancellation & Refund Policy – GramRide</h1>
              <p className="text-muted-foreground mb-8">Effective Date: February 18, 2026</p>

              <Section title="1. User Cancellation">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Users may cancel a booking before driver arrival.</li>
                  <li>Repeated misuse may lead to restriction.</li>
                </ul>
              </Section>
              <Section title="2. Driver Cancellation">
                <p>Drivers may decline or cancel rides based on availability or other valid reasons.</p>
              </Section>
              <Section title="3. Refunds">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Since ride fare is paid directly to the driver, GramRide does not process refunds for ride payments.</li>
                  <li>If any service charge is collected directly by GramRide, refunds (if applicable) will be processed within a reasonable timeframe.</li>
                </ul>
              </Section>
              <Section title="4. Disputes">
                <p>Ride-related disputes should be resolved directly between the user and the driver.</p>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
    <div className="text-muted-foreground text-sm leading-relaxed">{children}</div>
  </div>
);

export default CancellationPolicy;
