import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import UserPage from "./pages/UserPage";
import IssuerPage from "./pages/IssuerPage";
import VerifierPage from "./pages/VerifierPage";
import WalletPage from "./pages/WalletPage";
import AuthPage from "./pages/AuthPage";
import FaceVerifyPage from "./pages/FaceVerifyPage";
import FaceRegisterPage from "./pages/FaceRegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WalletProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/face-verify" element={<FaceVerifyPage />} />
              <Route path="/face-register" element={<FaceRegisterPage />} />
              
              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout><Index /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/user" element={
                <ProtectedRoute>
                  <Layout><UserPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/issuer" element={
                <ProtectedRoute>
                  <Layout><IssuerPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/verifier" element={
                <ProtectedRoute>
                  <Layout><VerifierPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/wallet" element={
                <ProtectedRoute>
                  <Layout><WalletPage /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<Layout><NotFound /></Layout>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WalletProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
