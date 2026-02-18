import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import BookRide from "./pages/BookRide";
import SharedRides from "./pages/SharedRides";
import DriverDashboard from "./pages/DriverDashboard";
import DriverProfile from "./pages/DriverProfile";
import DriverAnalytics from "./pages/driver/DriverAnalytics";
import DriverRegistration from "./pages/DriverRegistration";
import UserProfile from "./pages/UserProfile";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDrivers from "./pages/admin/AdminDrivers";
import AdminRides from "./pages/admin/AdminRides";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminReports from "./pages/admin/AdminReports";
import AdminPaymentSettings from "./pages/admin/AdminPaymentSettings";
import AdminLiveMonitor from "./pages/admin/AdminLiveMonitor";
import AdminPromoCodes from "./pages/admin/AdminPromoCodes";
import AdminPayouts from "./pages/admin/AdminPayouts";
import NotFound from "./pages/NotFound";
import TermsAndConditions from "./pages/TermsAndConditions";
import DriverTerms from "./pages/DriverTerms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Disclaimer from "./pages/Disclaimer";
import CancellationPolicy from "./pages/CancellationPolicy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            
            {/* User Routes */}
            <Route path="/book" element={
              <ProtectedRoute allowedRoles={['user']}>
                <BookRide />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['user']}>
                <UserProfile />
              </ProtectedRoute>
            } />
            <Route path="/shared-rides" element={
              <ProtectedRoute allowedRoles={['user']}>
                <SharedRides />
              </ProtectedRoute>
            } />
            
            {/* Driver Routes */}
            <Route path="/driver/register" element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverRegistration />
              </ProtectedRoute>
            } />
            <Route path="/driver" element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverDashboard />
              </ProtectedRoute>
            } />
            <Route path="/driver/profile" element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverProfile />
              </ProtectedRoute>
            } />
            <Route path="/driver/analytics" element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverAnalytics />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/live" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLiveMonitor />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            } />
            <Route path="/admin/drivers" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDrivers />
              </ProtectedRoute>
            } />
            <Route path="/admin/rides" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminRides />
              </ProtectedRoute>
            } />
            <Route path="/admin/logs" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLogs />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminReports />
              </ProtectedRoute>
            } />
            <Route path="/admin/payments" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPaymentSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/promo-codes" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPromoCodes />
              </ProtectedRoute>
            } />
            <Route path="/admin/payouts" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPayouts />
              </ProtectedRoute>
            } />
            
            {/* Legal Pages */}
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/driver-terms" element={<DriverTerms />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/cancellation-policy" element={<CancellationPolicy />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
