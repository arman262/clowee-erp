import { MainLayout } from "@/components/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CounterReadings from "./pages/CounterReadings";
import Dashboard from "./pages/Dashboard";
import Franchises from "./pages/Franchises";
import Machines from "./pages/Machines";
import Sales from "./pages/Sales";

import Banks from "./pages/Banks";
import ExpenseCategories from "./pages/ExpenseCategories";
import Expenses from "./pages/Expenses";
import Inventory from "./pages/Inventory";
import Login from "./pages/Login";
import MonthlyReport from "./pages/MonthlyReport";
import NotFound from "./pages/NotFound";
import Payments from "./pages/Payments";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Users from "./pages/Users";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/franchises" element={<ProtectedRoute><Franchises /></ProtectedRoute>} />
        <Route path="/machines" element={<ProtectedRoute><Machines /></ProtectedRoute>} />
        <Route path="/counter-readings" element={<ProtectedRoute><CounterReadings /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

        <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
        <Route path="/expense-categories" element={<ProtectedRoute><ExpenseCategories /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="/banks" element={<ProtectedRoute><Banks /></ProtectedRoute>} />
        <Route path="/monthly-report" element={<ProtectedRoute><MonthlyReport /></ProtectedRoute>} />

        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MainLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
