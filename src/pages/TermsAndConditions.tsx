import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

const TermsAndConditions = () => {
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
              <h1 className="text-3xl font-bold text-foreground mb-2">শর্তাবলী – GramRide</h1>
              <p className="text-muted-foreground mb-8">কার্যকর তারিখ: ১৮ ফেব্রুয়ারি, ২০২৬</p>

              <p className="text-foreground mb-6">GramRide-এ স্বাগতম। GramRide ব্যবহার করে আপনি নিম্নলিখিত শর্তাবলীতে সম্মত হচ্ছেন:</p>

              <Section title="১. সেবার প্রকৃতি">
                <ul className="list-disc pl-5 space-y-1">
                  <li>GramRide একটি স্থানীয় রাইড বুকিং ও সমন্বয় প্ল্যাটফর্ম।</li>
                  <li>GramRide ব্যবহারকারীদের স্বতন্ত্র স্থানীয় ড্রাইভারদের সাথে সংযুক্ত করে।</li>
                  <li>GramRide কোনো যানবাহনের মালিক, পরিচালক বা নিয়ন্ত্রক নয়।</li>
                </ul>
              </Section>

              <Section title="২. স্বতন্ত্র ড্রাইভার">
                <ul className="list-disc pl-5 space-y-1">
                  <li>GramRide-এ উপলব্ধ সমস্ত যানবাহন স্বতন্ত্র ড্রাইভারদের মালিকানাধীন ও পরিচালিত।</li>
                  <li>যানবাহনের পারমিট, রেজিস্ট্রেশন, বীমা ও আইনি সম্মতি সম্পূর্ণরূপে ড্রাইভারের দায়িত্ব।</li>
                </ul>
              </Section>

              <Section title="৩. বুকিং ও উপলব্ধতা">
                <ul className="list-disc pl-5 space-y-1">
                  <li>রাইড বুকিং ড্রাইভারের উপলব্ধতার উপর নির্ভরশীল।</li>
                  <li>GramRide রাইড গ্রহণ বা আগমনের সময়ের গ্যারান্টি দেয় না।</li>
                </ul>
              </Section>

              <Section title="৪. পেমেন্ট">
                <ul className="list-disc pl-5 space-y-1">
                  <li>রাইডের ভাড়া সরাসরি ড্রাইভারকে প্রদান করা হয়, অন্যথায় বলা না হলে।</li>
                  <li>GramRide পরিবহন পরিচালক হিসেবে কাজ করে না।</li>
                </ul>
              </Section>

              <Section title="৫. ব্যবহারকারীর দায়িত্ব">
                <ul className="list-disc pl-5 space-y-1">
                  <li>ব্যবহারকারীদের সঠিক পিকআপ ও যোগাযোগের তথ্য প্রদান করতে হবে।</li>
                  <li>ভুয়া বুকিং, অপব্যবহার বা অনুচিত আচরণের ফলে প্ল্যাটফর্ম থেকে সীমাবদ্ধতা আরোপ হতে পারে।</li>
                </ul>
              </Section>

              <Section title="৬. বাতিলকরণ">
                <p>রাইডের প্রয়োজন না থাকলে ব্যবহারকারীদের আগেই বুকিং বাতিল করা উচিত।</p>
              </Section>

              <Section title="৭. দায়বদ্ধতার সীমাবদ্ধতা">
                <ul className="list-disc pl-5 space-y-1">
                  <li>রাইড চলাকালীন দুর্ঘটনা, বিলম্ব, বিবাদ, ক্ষতি বা ক্ষতির জন্য GramRide দায়ী নয়।</li>
                  <li>রাইড সম্পর্কিত সমস্ত দায়িত্ব ব্যবহারকারী ও ড্রাইভারের মধ্যে।</li>
                </ul>
              </Section>

              <Section title="৮. শর্তাবলীর পরিবর্তন">
                <p>GramRide পূর্ব বিজ্ঞপ্তি ছাড়াই যেকোনো সময় এই শর্তাবলী আপডেট করতে পারে।</p>
              </Section>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-2">Terms & Conditions – GramRide</h1>
              <p className="text-muted-foreground mb-8">Effective Date: February 18, 2026</p>

              <p className="text-foreground mb-6">Welcome to GramRide. By accessing or using GramRide, you agree to the following terms:</p>

              <Section title="1. Nature of Service">
                <ul className="list-disc pl-5 space-y-1">
                  <li>GramRide is a local ride booking and coordination platform.</li>
                  <li>GramRide connects users with independent local drivers.</li>
                  <li>GramRide does not own, operate, or control any vehicles.</li>
                </ul>
              </Section>

              <Section title="2. Independent Drivers">
                <ul className="list-disc pl-5 space-y-1">
                  <li>All vehicles available through GramRide are owned and operated by independent drivers.</li>
                  <li>Vehicle permits, registration, insurance, and legal compliance are the sole responsibility of the driver.</li>
                </ul>
              </Section>

              <Section title="3. Booking & Availability">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Ride bookings are subject to driver availability.</li>
                  <li>GramRide does not guarantee ride acceptance or arrival time.</li>
                </ul>
              </Section>

              <Section title="4. Payment">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Ride fare is paid directly to the driver unless otherwise stated.</li>
                  <li>GramRide does not act as a transport operator.</li>
                </ul>
              </Section>

              <Section title="5. User Responsibility">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Users must provide accurate pickup and contact details.</li>
                  <li>Fake bookings, misuse, or inappropriate behavior may result in restriction from the platform.</li>
                </ul>
              </Section>

              <Section title="6. Cancellation">
                <p>Users should cancel bookings in advance if the ride is no longer required.</p>
              </Section>

              <Section title="7. Limitation of Liability">
                <ul className="list-disc pl-5 space-y-1">
                  <li>GramRide is not responsible for accidents, delays, disputes, damages, or losses arising during rides.</li>
                  <li>All ride-related responsibility lies between the user and the driver.</li>
                </ul>
              </Section>

              <Section title="8. Changes to Terms">
                <p>GramRide may update these terms at any time without prior notice.</p>
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

export default TermsAndConditions;
