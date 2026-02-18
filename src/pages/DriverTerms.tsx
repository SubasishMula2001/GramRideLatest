import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

const DriverTerms = () => {
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
              <h1 className="text-3xl font-bold text-foreground mb-2">ড্রাইভার শর্তাবলী – GramRide</h1>
              <p className="text-muted-foreground mb-8">কার্যকর তারিখ: ১৮ ফেব্রুয়ারি, ২০২৬</p>
              <p className="text-foreground mb-6">GramRide-এ যোগদান করে ড্রাইভার নিম্নলিখিত শর্তাবলীতে সম্মত হচ্ছেন:</p>

              <Section title="১. স্বতন্ত্র মর্যাদা">
                <p>ড্রাইভার একজন স্বতন্ত্র ব্যক্তি এবং GramRide-এর কর্মচারী, এজেন্ট বা অংশীদার নন।</p>
              </Section>
              <Section title="২. যানবাহনের দায়িত্ব">
                <ul className="list-disc pl-5 space-y-1">
                  <li>ড্রাইভার নিজের দায়িত্বে যানবাহনের মালিক ও পরিচালক।</li>
                  <li>সমস্ত পারমিট, বীমা, রেজিস্ট্রেশন ও আইনি সম্মতি সম্পূর্ণরূপে ড্রাইভারের দায়িত্ব।</li>
                </ul>
              </Section>
              <Section title="৩. পেমেন্ট পরিচালনা">
                <ul className="list-disc pl-5 space-y-1">
                  <li>ড্রাইভাররা সরাসরি গ্রাহকদের কাছ থেকে রাইডের ভাড়া সংগ্রহ করেন।</li>
                  <li>স্পষ্টভাবে বলা না হলে GramRide রাইডের পেমেন্ট ধারণ বা নিয়ন্ত্রণ করে না।</li>
                </ul>
              </Section>
              <Section title="৪. আচরণ">
                <ul className="list-disc pl-5 space-y-1">
                  <li>ড্রাইভারদের যাত্রীদের সাথে সম্মানজনক আচরণ করতে হবে।</li>
                  <li>যেকোনো অসদাচরণের ফলে প্ল্যাটফর্ম থেকে স্থগিত বা অপসারণ হতে পারে।</li>
                </ul>
              </Section>
              <Section title="৫. রাইড গ্রহণ">
                <p>ড্রাইভাররা তাদের বিবেচনায় বুকিং অনুরোধ গ্রহণ বা প্রত্যাখ্যান করতে পারেন।</p>
              </Section>
              <Section title="৬. দায়বদ্ধতা">
                <p>ড্রাইভার বা যানবাহন সম্পর্কিত দুর্ঘটনা, জরিমানা, পুলিশি বিষয়, আইনি বিবাদ বা ক্ষতির জন্য GramRide দায়ী নয়।</p>
              </Section>
              <Section title="৭. প্ল্যাটফর্ম ব্যবহার">
                <p>ড্রাইভাররা শুধুমাত্র বৈধ ও আইনসম্মত রাইড পরিষেবার জন্য GramRide ব্যবহার করতে সম্মত।</p>
              </Section>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-2">Driver Terms – GramRide</h1>
              <p className="text-muted-foreground mb-8">Effective Date: February 18, 2026</p>
              <p className="text-foreground mb-6">By joining GramRide, the driver agrees to the following:</p>

              <Section title="1. Independent Status">
                <p>The driver is an independent individual and not an employee, agent, or partner of GramRide.</p>
              </Section>
              <Section title="2. Vehicle Responsibility">
                <ul className="list-disc pl-5 space-y-1">
                  <li>The driver owns and operates the vehicle at their own responsibility.</li>
                  <li>All permits, insurance, registration, and legal compliance are the sole responsibility of the driver.</li>
                </ul>
              </Section>
              <Section title="3. Payment Handling">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Drivers collect ride fare directly from customers.</li>
                  <li>GramRide does not hold or control ride payments unless clearly stated.</li>
                </ul>
              </Section>
              <Section title="4. Conduct">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Drivers must behave respectfully with passengers.</li>
                  <li>Any misconduct may result in suspension or removal from the platform.</li>
                </ul>
              </Section>
              <Section title="5. Ride Acceptance">
                <p>Drivers may accept or decline booking requests at their discretion.</p>
              </Section>
              <Section title="6. Liability">
                <p>GramRide is not responsible for accidents, fines, police matters, legal disputes, or damages involving the driver or vehicle.</p>
              </Section>
              <Section title="7. Platform Usage">
                <p>Drivers agree to use GramRide only for lawful and legitimate ride services.</p>
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

export default DriverTerms;
