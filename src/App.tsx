import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Franchises from "./pages/Franchises";
import Machines from "./pages/Machines";
import CounterReadings from "./pages/CounterReadings";
import Sales from "./pages/Sales";
import Invoices from "./pages/Invoices";
import Expenses from "./pages/Expenses";
import Payments from "./pages/Payments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/franchises" element={<Franchises />} />
            <Route path="/machines" element={<Machines />} />
            <Route path="/counter-readings" element={<CounterReadings />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/accounting" element={<div className="p-8 text-center text-muted-foreground">Accounting - Coming Soon</div>} />
            <Route path="/inventory" element={<div className="p-8 text-center text-muted-foreground">Inventory - Coming Soon</div>} />
            <Route path="/users" element={<div className="p-8 text-center text-muted-foreground">Users - Coming Soon</div>} />
            <Route path="/settings" element={<div className="p-8 text-center text-muted-foreground">Settings - Coming Soon</div>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
