import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

const PrivacyPolicy = () => {
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
              <h1 className="text-3xl font-bold text-foreground mb-2">গোপনীয়তা নীতি – GramRide</h1>
              <p className="text-muted-foreground mb-8">কার্যকর তারিখ: ১৮ ফেব্রুয়ারি, ২০২৬</p>
              <p className="text-foreground mb-6">GramRide আপনার গোপনীয়তাকে মূল্য দেয়।</p>

              <Section title="১. আমরা যে তথ্য সংগ্রহ করি">
                <p>আমরা সংগ্রহ করতে পারি:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>নাম</li>
                  <li>ফোন নম্বর</li>
                  <li>পিকআপ ও ড্রপ লোকেশন</li>
                  <li>বুকিং বিবরণ</li>
                </ul>
              </Section>
              <Section title="২. কীভাবে তথ্য ব্যবহার করি">
                <p>তথ্য ব্যবহার করা হয়:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>ব্যবহারকারীদের ড্রাইভারদের সাথে সংযুক্ত করতে</li>
                  <li>বুকিং পরিচালনা করতে</li>
                  <li>সেবার মান উন্নত করতে</li>
                </ul>
              </Section>
              <Section title="৩. তথ্য শেয়ারিং">
                <ul className="list-disc pl-5 space-y-1">
                  <li>আমরা ব্যক্তিগত তথ্য তৃতীয় পক্ষের কাছে বিক্রি বা শেয়ার করি না।</li>
                  <li>শুধুমাত্র বুকিং সমন্বয়ের জন্য ড্রাইভারদের সাথে তথ্য শেয়ার করা হতে পারে।</li>
                </ul>
              </Section>
              <Section title="৪. পেমেন্ট নিরাপত্তা">
                <ul className="list-disc pl-5 space-y-1">
                  <li>অনলাইন পেমেন্ট সক্ষম থাকলে, লেনদেন অনুমোদিত পেমেন্ট গেটওয়ের মাধ্যমে প্রক্রিয়া করা হয়।</li>
                  <li>GramRide ডেবিট/ক্রেডিট কার্ডের তথ্য সংরক্ষণ করে না।</li>
                </ul>
              </Section>
              <Section title="৫. তথ্য সুরক্ষা">
                <p>আমরা ব্যবহারকারীর তথ্য সুরক্ষিত রাখতে যুক্তিসঙ্গত পদক্ষেপ নিই।</p>
              </Section>
              <Section title="৬. নীতি আপডেট">
                <p>এই নীতি সময়ে সময়ে আপডেট করা হতে পারে।</p>
              </Section>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy – GramRide</h1>
              <p className="text-muted-foreground mb-8">Effective Date: February 18, 2026</p>
              <p className="text-foreground mb-6">GramRide values your privacy.</p>

              <Section title="1. Information We Collect">
                <p>We may collect:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Name</li>
                  <li>Phone number</li>
                  <li>Pickup and drop location</li>
                  <li>Booking details</li>
                </ul>
              </Section>
              <Section title="2. How We Use Information">
                <p>Information is used to:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Connect users with drivers</li>
                  <li>Manage bookings</li>
                  <li>Improve service quality</li>
                </ul>
              </Section>
              <Section title="3. Data Sharing">
                <ul className="list-disc pl-5 space-y-1">
                  <li>We do not sell or share personal data with third parties.</li>
                  <li>User information may be shared with drivers only for booking coordination.</li>
                </ul>
              </Section>
              <Section title="4. Payment Security">
                <ul className="list-disc pl-5 space-y-1">
                  <li>If online payments are enabled, transactions are processed through authorized payment gateways.</li>
                  <li>GramRide does not store debit/credit card details.</li>
                </ul>
              </Section>
              <Section title="5. Data Protection">
                <p>We take reasonable measures to protect user information.</p>
              </Section>
              <Section title="6. Policy Updates">
                <p>This policy may be updated from time to time.</p>
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

export default PrivacyPolicy;
