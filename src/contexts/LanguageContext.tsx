import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'bn';

interface Translations {
  // Common
  appName: string;
  tagline: string;
  loading: string;
  backToHome: string;
  
  // Login Page
  welcomeBack: string;
  createAccount: string;
  signIn: string;
  signUp: string;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  sendOtp: string;
  verifyOtp: string;
  resendOtp: string;
  changeNumber: string;
  loginWithPhone: string;
  verifyCode: string;
  otpSentTo: string;
  enterPhoneWithCode: string;
  
  // User Types
  user: string;
  driver: string;
  admin: string;
  
  // Auth Methods
  emailMethod: string;
  phoneMethod: string;
  
  // Messages
  noAccount: string;
  haveAccount: string;
  demoMode: string;
  demoWarning: string;
  
  // Errors
  invalidEmail: string;
  passwordRequired: string;
  nameRequired: string;
  invalidPhone: string;
  invalidOtp: string;
  
  // Success
  welcomeMessage: string;
  accountCreated: string;
  otpSent: string;
  
  // Buttons
  bookRide: string;
  becomeDriver: string;
  
  // Home page
  heroTitle: string;
  heroSubtitle: string;
  passengerRide: string;
  passengerRideDesc: string;
  goodsDelivery: string;
  goodsDeliveryDesc: string;
}

const translations: Record<Language, Translations> = {
  en: {
    appName: 'GramRide',
    tagline: "Your Village's Trusted Ride Partner",
    loading: 'Loading...',
    backToHome: 'Back to Home',
    
    welcomeBack: 'Welcome Back!',
    createAccount: 'Create Account',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    email: 'Email Address',
    password: 'Password',
    fullName: 'Full Name',
    phone: 'Phone Number',
    sendOtp: 'Send OTP',
    verifyOtp: 'Verify & Login',
    resendOtp: 'Resend OTP',
    changeNumber: '← Change Number',
    loginWithPhone: 'Login with Phone',
    verifyCode: 'Verify Code',
    otpSentTo: 'Enter the 6-digit code sent to',
    enterPhoneWithCode: 'Enter your phone number with country code',
    
    user: 'Passenger',
    driver: 'Driver',
    admin: 'Admin',
    
    emailMethod: 'Email',
    phoneMethod: 'Phone',
    
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    demoMode: '⚠️ Demo Mode (For Testing)',
    demoWarning: 'Use these accounts to test the app',
    
    invalidEmail: 'Please enter a valid email',
    passwordRequired: 'Password is required',
    nameRequired: 'Name is required',
    invalidPhone: 'Enter valid phone (e.g., +919876543210)',
    invalidOtp: 'Please enter 6-digit OTP',
    
    welcomeMessage: 'Welcome back!',
    accountCreated: 'Account created! You can sign in now.',
    otpSent: 'OTP sent to your phone!',
    
    bookRide: 'Book a Ride',
    becomeDriver: 'Become a Driver',
    
    heroTitle: 'Safe & Affordable Rides for Villages',
    heroSubtitle: 'Book auto, bike or delivery for your daily needs',
    passengerRide: 'Book Passenger Ride',
    passengerRideDesc: 'Travel safely to market, hospital, or anywhere',
    goodsDelivery: 'Send Goods / Delivery',
    goodsDeliveryDesc: 'Send parcels, groceries, or farm products',
  },
  bn: {
    appName: 'গ্রাম রাইড',
    tagline: 'আপনার গ্রামের বিশ্বস্ত যাত্রার সঙ্গী',
    loading: 'লোড হচ্ছে...',
    backToHome: 'হোমে ফিরুন',
    
    welcomeBack: 'স্বাগতম!',
    createAccount: 'নতুন অ্যাকাউন্ট খুলুন',
    signIn: 'লগইন করুন',
    signUp: 'সাইন আপ',
    email: 'ইমেইল',
    password: 'পাসওয়ার্ড',
    fullName: 'পুরো নাম',
    phone: 'ফোন নম্বর',
    sendOtp: 'OTP পাঠান',
    verifyOtp: 'যাচাই করুন ও লগইন',
    resendOtp: 'আবার OTP পাঠান',
    changeNumber: '← নম্বর বদলান',
    loginWithPhone: 'ফোন দিয়ে লগইন',
    verifyCode: 'কোড যাচাই',
    otpSentTo: '৬ সংখ্যার কোড পাঠানো হয়েছে',
    enterPhoneWithCode: 'দেশের কোড সহ ফোন নম্বর দিন',
    
    user: 'যাত্রী',
    driver: 'ড্রাইভার',
    admin: 'অ্যাডমিন',
    
    emailMethod: 'ইমেইল',
    phoneMethod: 'ফোন',
    
    noAccount: 'অ্যাকাউন্ট নেই?',
    haveAccount: 'অ্যাকাউন্ট আছে?',
    demoMode: '⚠️ ডেমো মোড (পরীক্ষার জন্য)',
    demoWarning: 'অ্যাপ পরীক্ষা করতে এই অ্যাকাউন্ট ব্যবহার করুন',
    
    invalidEmail: 'সঠিক ইমেইল দিন',
    passwordRequired: 'পাসওয়ার্ড দরকার',
    nameRequired: 'নাম দরকার',
    invalidPhone: 'সঠিক ফোন নম্বর দিন (যেমন: +919876543210)',
    invalidOtp: '৬ সংখ্যার OTP দিন',
    
    welcomeMessage: 'স্বাগতম!',
    accountCreated: 'অ্যাকাউন্ট তৈরি হয়েছে! এখন লগইন করুন।',
    otpSent: 'আপনার ফোনে OTP পাঠানো হয়েছে!',
    
    bookRide: 'রাইড বুক করুন',
    becomeDriver: 'ড্রাইভার হোন',
    
    heroTitle: 'গ্রামের জন্য নিরাপদ ও সাশ্রয়ী রাইড',
    heroSubtitle: 'অটো, বাইক বা ডেলিভারি বুক করুন',
    passengerRide: 'যাত্রী রাইড বুক করুন',
    passengerRideDesc: 'বাজার, হাসপাতাল বা যেকোনো জায়গায় নিরাপদে যান',
    goodsDelivery: 'মালপত্র পাঠান',
    goodsDeliveryDesc: 'পার্সেল, মুদি বা কৃষি পণ্য পাঠান',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('gramride-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('gramride-language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState(prev => prev === 'en' ? 'bn' : 'en');
  };

  const value = {
    language,
    setLanguage,
    t: translations[language],
    toggleLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
