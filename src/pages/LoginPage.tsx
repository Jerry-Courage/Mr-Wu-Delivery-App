import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { Eye, EyeOff, ArrowRight, Chrome } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";

type Tab = "login" | "register";

const LoginPage = () => {
  const [tab, setTab] = useState<Tab>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const isStaffMode = searchParams.get("mode") === "staff";
  const roleParam = searchParams.get("role");
  const signupParam = searchParams.get("signup") === "true";

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "", email: "", password: "", phone: "", address: "", role: "customer", adminSecret: "",
  });

  useEffect(() => {
    if (signupParam) setTab("register");
    if (roleParam) {
      setRegisterData(p => ({ ...p, role: roleParam }));
    } else if (isStaffMode) {
      setRegisterData(p => ({ ...p, role: "kitchen" }));
    } else {
      setRegisterData(p => ({ ...p, role: "customer", adminSecret: "" }));
    }
  }, [roleParam, signupParam, isStaffMode]);

  const { user, login, register, loginWithGoogle, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as { from?: string })?.from || "/";

  const roleHome: Record<string, string> = {
    customer: "/",
    kitchen: "/management",
    rider: "/rider",
    admin: "/admin",
  };

  useEffect(() => {
    if (!authLoading && user) {
      const dest = (user.role === "customer" && from !== "/") ? from : (roleHome[user.role] || "/");
      navigate(dest, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(loginData.email, loginData.password);
      const dest = (user.role === "customer" && from !== "/") ? from : (roleHome[user.role] || "/");
      navigate(dest, { replace: true });
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
      const user = await register(registerData);
      navigate(roleHome[user.role] || "/", { replace: true });
    } catch (err: unknown) {
      toast({ title: "Registration failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      setLoading(true);
      try {
        await loginWithGoogle(credentialResponse.credential);
        toast({ title: "Success", description: "Logged in with Google" });
      } catch (err: any) {
        toast({ title: "Google login failed", description: err.message || "Failed to sign in", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4 overflow-hidden relative">
      {/* Kinetic Background Blobs */}
      <motion.div 
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-20 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div 
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -100, 0],
          y: [0, -80, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none"
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-24 h-24 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl border border-white/10 overflow-hidden p-3"
          >
            <img src={logo} alt="Mr. Wu Logo" className="w-full h-full object-contain brightness-110" />
          </motion.div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-1">MR WU'S</h1>
          <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">Imperial Chinese Cuisine</p>
        </div>

        {/* Auth Container */}
        <div className="bg-white/5 backdrop-blur-3xl rounded-[2rem] border border-white/10 p-1 shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex p-1.5 gap-1">
            {(["login", "register"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 rounded-[1.2rem] text-xs font-black uppercase tracking-widest transition-all ${
                  tab === t 
                    ? "bg-white text-black shadow-xl" 
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                {t === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {tab === "login" ? (
                <motion.form 
                  key="login-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleLogin} 
                  className="space-y-4"
                >
                  <AuthInput 
                    id="login-email"
                    label="Email Address"
                    type="email"
                    placeholder="name@empire.com"
                    value={loginData.email}
                    onChange={v => setLoginData(p => ({ ...p, email: v }))}
                  />

                  <AuthInput 
                    id="login-password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={v => setLoginData(p => ({ ...p, password: v }))}
                    suffix={
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/20 hover:text-white/50 transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-black font-black uppercase tracking-widest py-4 rounded-2xl shadow-[0_0_20px_rgba(var(--primary),0.3)] disabled:opacity-50 transition-all hover:brightness-110"
                  >
                    {loading ? "Logging in..." : "Login"}
                  </motion.button>
                </motion.form>
              ) : (
                <motion.form 
                  key="register-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleRegister} 
                  className="space-y-4"
                >
                  <AuthInput 
                    id="reg-name"
                    label="Full Name"
                    placeholder="Your Name"
                    value={registerData.name}
                    onChange={v => setRegisterData(p => ({ ...p, name: v }))}
                  />
                  <AuthInput 
                    id="reg-email"
                    label="Email"
                    type="email"
                    placeholder="you@empire.com"
                    value={registerData.email}
                    onChange={v => setRegisterData(p => ({ ...p, email: v }))}
                  />
                  <AuthInput 
                    id="reg-password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={registerData.password}
                    onChange={v => setRegisterData(p => ({ ...p, password: v }))}
                    suffix={
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/20 hover:text-white/50 transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />

                  {(registerData.role === "kitchen" || registerData.role === "admin" || isStaffMode) && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="pt-4 border-t border-white/10 space-y-4"
                    >
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest text-center">Staff Authentication</p>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Rank</label>
                        <select
                          value={registerData.role}
                          onChange={e => setRegisterData(p => ({ ...p, role: e.target.value as any }))}
                          className="w-full px-5 py-4 bg-white/5 rounded-2xl text-white font-bold border border-white/5 focus:outline-none focus:border-primary/30 transition-all appearance-none"
                        >
                          <option value="customer" className="bg-[#111]">Customer</option>
                          <option value="rider" className="bg-[#111]">Delivery Rider</option>
                          <option value="kitchen" className="bg-[#111]">Kitchen Staff</option>
                          <option value="admin" className="bg-[#111]">Super Admin</option>
                        </select>
                      </div>
                      <AuthInput 
                        id="reg-secret"
                        label="Security Clearance"
                        type="password"
                        placeholder="Secret Key"
                        value={registerData.adminSecret}
                        onChange={v => setRegisterData(p => ({ ...p, adminSecret: v }))}
                      />
                    </motion.div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 text-black font-black uppercase tracking-widest py-4 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-all hover:brightness-110"
                  >
                    {loading ? "Processing..." : "Sign Up"}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Google Divider */}
            <div className="relative my-8 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <span className="relative bg-transparent px-4 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] backdrop-blur-3xl">Or continue with</span>
            </div>

            {/* Google Button */}
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast({ title: "Error", description: "Google login failed", variant: "destructive" })}
                useOneTap
                theme="filled_black"
                shape="pill"
                width="100%"
              />
            </div>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="mt-10 flex flex-col items-center gap-6">
          <div className="text-center group">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2 group-hover:text-emerald-500/50 transition-colors">Want to join our elite fleet?</p>
            <motion.button 
              whileHover={{ x: 5 }}
              onClick={() => navigate("/rider-onboarding")}
              className="inline-flex items-center gap-3 text-sm font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors"
            >
              Deliver with Mr Wu <ArrowRight size={18} />
            </motion.button>
          </div>

          <p className="text-center text-[9px] font-bold uppercase tracking-[0.3em] text-white/20 px-8 leading-loose">
            By entering the empire you agree to our <span className="text-white/40 underline cursor-pointer">Terms</span> & <span className="text-white/40 underline cursor-pointer">Privacy Protocol</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const AuthInput = ({ id, label, type = "text", placeholder, value, onChange, suffix }: { 
  id: string; 
  label: string; 
  type?: string; 
  placeholder: string; 
  value: string; 
  onChange: (v: string) => void;
  suffix?: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      <input
        id={id}
        type={type}
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-5 py-4 bg-white/5 rounded-2xl text-white font-bold placeholder:text-white/10 border border-white/5 focus:outline-none focus:border-primary/30 transition-all focus:bg-white/[0.08]"
      />
      {suffix && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {suffix}
        </div>
      )}
    </div>
  </div>
);

export default LoginPage;
