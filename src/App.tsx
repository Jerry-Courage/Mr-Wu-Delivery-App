import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppShell from "@/components/layout/AppShell";
import HomePage from "./pages/HomePage";
import MenuPage from "./pages/MenuPage";
import ItemDetailPage from "./pages/ItemDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import TrackingPage from "./pages/TrackingPage";
import NearbyPage from "./pages/NearbyPage";
import ProfilePage from "./pages/ProfilePage";
import HelpPage from "./pages/HelpPage";
import SearchPage from "./pages/SearchPage";
import LoginPage from "./pages/LoginPage";
import ManagementPage from "./pages/ManagementPage";
import RiderPage from "./pages/RiderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppShell><HomePage /></AppShell>} />
      <Route path="/menu" element={<AppShell><MenuPage /></AppShell>} />
      <Route path="/item/:id" element={<AppShell><ItemDetailPage /></AppShell>} />
      <Route path="/checkout" element={<AppShell><CheckoutPage /></AppShell>} />
      <Route path="/orders" element={<AppShell><OrdersPage /></AppShell>} />
      <Route path="/tracking/:id" element={<AppShell><TrackingPage /></AppShell>} />
      <Route path="/tracking" element={<AppShell><TrackingPage /></AppShell>} />
      <Route path="/nearby" element={<AppShell><NearbyPage /></AppShell>} />
      <Route path="/profile" element={<AppShell><ProfilePage /></AppShell>} />
      <Route path="/help" element={<AppShell><HelpPage /></AppShell>} />
      <Route path="/search" element={<AppShell><SearchPage /></AppShell>} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/management"
        element={
          <ProtectedRoute allowedRoles={["kitchen"]}>
            <ManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rider"
        element={
          <ProtectedRoute allowedRoles={["rider"]}>
            <RiderPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
