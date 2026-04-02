import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ChefHat } from "lucide-react";

type Tab = "login" | "register";

const LoginPage = () => {
  const [tab, setTab] = useState<Tab>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "", email: "", password: "", phone: "", address: "", role: "customer",
  });

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as { from?: string })?.from || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginData.email, loginData.password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      toast({ title: "Login failed", description: err instanceof Error ? err.message : "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(registerData);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      toast({ title: "Registration failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-3">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Mr Wu's</h1>
          <p className="text-muted-foreground text-sm">Chinese Delivery</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1 mb-6">
          {(["login", "register"] as Tab[]).map(t => (
            <button
              key={t}
              data-testid={`tab-${t}`}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {t === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Email</label>
              <input
                data-testid="input-email"
                type="email"
                required
                value={loginData.email}
                onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Password</label>
              <div className="relative">
                <input
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginData.password}
                  onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              data-testid="button-login"
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Full Name</label>
              <input
                data-testid="input-name"
                type="text"
                required
                value={registerData.name}
                onChange={e => setRegisterData(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Alex Chen"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Email</label>
              <input
                data-testid="input-email-register"
                type="email"
                required
                value={registerData.email}
                onChange={e => setRegisterData(p => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Password</label>
              <div className="relative">
                <input
                  data-testid="input-password-register"
                  type={showPassword ? "text" : "password"}
                  required
                  value={registerData.password}
                  onChange={e => setRegisterData(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                  placeholder="Min. 6 characters"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Phone (optional)</label>
              <input
                data-testid="input-phone"
                type="tel"
                value={registerData.phone}
                onChange={e => setRegisterData(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="+1 555 0000"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Delivery Address (optional)</label>
              <input
                data-testid="input-address"
                type="text"
                value={registerData.address}
                onChange={e => setRegisterData(p => ({ ...p, address: e.target.value }))}
                className="w-full px-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Account Type</label>
              <select
                data-testid="select-role"
                value={registerData.role}
                onChange={e => setRegisterData(p => ({ ...p, role: e.target.value }))}
                className="w-full px-4 py-3 bg-muted rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="customer">Customer</option>
                <option value="kitchen">Kitchen Staff</option>
                <option value="rider">Delivery Rider</option>
              </select>
            </div>
            <button
              data-testid="button-register"
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
