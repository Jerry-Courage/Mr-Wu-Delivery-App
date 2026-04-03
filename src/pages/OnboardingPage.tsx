import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ShoppingBag, 
  Bike, 
  ChefHat, 
  LayoutDashboard, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const roles = [
  {
    id: "customer",
    title: "Customer",
    description: "Order delicious food from Mr Wu's and get it delivered to your door.",
    icon: ShoppingBag,
    color: "from-orange-500 to-red-500",
    features: ["Real-time tracking", "AI recommendations", "Express delivery"]
  },
  {
    id: "rider",
    title: "Rider",
    description: "Join our elite fleet and deliver joy (and food) to our valued customers.",
    icon: Bike,
    color: "from-blue-500 to-indigo-600",
    features: ["Flexible hours", "Instant payouts", "Rider assistance"]
  },
  {
    id: "kitchen",
    title: "Kitchen Staff",
    description: "The heart of the operation. Manage orders and ensure quality.",
    icon: ChefHat,
    color: "from-emerald-500 to-teal-600",
    features: ["Order management", "Inventory control", "Performance analytics"],
    isPrivate: true
  },
  {
    id: "admin",
    title: "Oversight",
    description: "Complete restaurant management and AI business insights.",
    icon: LayoutDashboard,
    color: "from-purple-500 to-pink-600",
    features: ["Full analytics", "Menu management", "AI Consultant"],
    isPrivate: true
  }
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
  } as const;

  const handleNext = () => {
    if (step === 1 && selectedRole) setStep(2);
    else if (step === 2) navigate(`/login?role=${selectedRole}&signup=true`);
  };

  const currentRoleData = roles.find(r => r.id === selectedRole);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-8"
            >
              <div className="space-y-2 text-center">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-orange-400 mb-2"
                >
                  <Sparkles size={14} /> Welcome to Mr Wu's
                </motion.div>
                <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                  Select your role
                </h1>
                <p className="text-neutral-400">Choose how you want to interact with the platform</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {roles.filter(r => !r.isPrivate).map((role) => (
                  <Card
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={cn(
                      "relative p-5 cursor-pointer transition-all duration-300 border bg-white/5 backdrop-blur-xl group overflow-hidden",
                      selectedRole === role.id 
                        ? "border-orange-500/50 bg-orange-500/5" 
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-2xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110",
                        role.color
                      )}>
                        <role.icon className="text-white" size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{role.title}</h3>
                        </div>
                        <p className="text-sm text-neutral-400 line-clamp-1">{role.description}</p>
                      </div>
                      {selectedRole === role.id && (
                        <motion.div layoutId="check" className="text-orange-500">
                          <CheckCircle2 size={24} />
                        </motion.div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              <Button
                disabled={!selectedRole}
                onClick={handleNext}
                className="w-full h-14 rounded-2xl bg-white text-black hover:bg-neutral-200 transition-all font-semibold text-lg gap-2"
              >
                Continue <ArrowRight size={20} />
              </Button>

              <p className="text-center text-sm text-neutral-500">
                Already have an account?{" "}
                <button 
                  onClick={() => navigate("/login")}
                  className="text-orange-500 hover:underline font-medium"
                >
                  Sign In
                </button>
              </p>
            </motion.div>
          )}

          {step === 2 && currentRoleData && (
            <motion.div
              key="step2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-8"
            >
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} /> Back
              </button>

              <div className="space-y-6">
                <div className={cn(
                  "w-20 h-20 rounded-3xl bg-gradient-to-br flex items-center justify-center mx-auto shadow-2xl shadow-orange-500/20",
                  currentRoleData.color
                )}>
                  <currentRoleData.icon className="text-white" size={40} />
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold">The {currentRoleData.title} Experience</h2>
                  <p className="text-neutral-400">{currentRoleData.description}</p>
                </div>

                <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">What you get</h4>
                  <div className="space-y-3">
                    {currentRoleData.features.map((feature, i) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        key={i}
                        className="flex items-center gap-3 text-neutral-300"
                      >
                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                          <CheckCircle2 size={12} className="text-orange-500" />
                        </div>
                        {feature}
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                    <ShieldCheck className="mx-auto mb-2 text-orange-400" size={20} />
                    <p className="text-[10px] text-neutral-500 uppercase">Secure</p>
                    <p className="text-sm font-medium">Safe Access</p>
                  </div>
                  <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                    <Clock className="mx-auto mb-2 text-blue-400" size={20} />
                    <p className="text-[10px] text-neutral-500 uppercase">Live</p>
                    <p className="text-sm font-medium">24/7 Support</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleNext}
                className="w-full h-14 rounded-2xl bg-white text-black hover:bg-neutral-200 transition-all font-semibold text-lg gap-2"
              >
                Join as {currentRoleData.title} <ArrowRight size={20} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center opacity-30 pointer-events-none">
        <p className="text-[10px] uppercase tracking-[0.3em] font-light">Mr Wu's Modern Delivery Infrastructure v2.1</p>
      </div>
    </div>
  );
}
