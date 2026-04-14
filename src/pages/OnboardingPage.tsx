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
import MobileCarousel from "@/components/ui/MobileCarousel";

const roles = [
  {
    id: "customer",
    title: "Customer",
    description: "Order delicious food from Fishing Panda and get it delivered to your door.",
    icon: ShoppingBag,
    color: "from-primary to-primary/70",
    features: ["Real-time tracking", "AI recommendations", "Express delivery"]
  },
  {
    id: "rider",
    title: "Rider",
    description: "Join our elite fleet and deliver joy (and food) to our valued customers.",
    icon: Bike,
    color: "from-zinc-400 to-zinc-600",
    features: ["Flexible hours", "Instant payouts", "Rider assistance"]
  },
  {
    id: "kitchen",
    title: "Kitchen Staff",
    description: "The heart of the operation. Manage orders and ensure quality.",
    icon: ChefHat,
    color: "from-zinc-500 to-zinc-700",
    features: ["Order management", "Inventory control", "Performance analytics"],
    isPrivate: true
  },
  {
    id: "admin",
    title: "Oversight",
    description: "Complete restaurant management and AI business insights.",
    icon: LayoutDashboard,
    color: "from-zinc-600 to-zinc-800",
    features: ["Full analytics", "Menu management", "AI Consultant"],
    isPrivate: true
  }
];


export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showCarousel, setShowCarousel] = useState(true);

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
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {showCarousel ? (
          <motion.div
            key="carousel"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full flex-1 flex flex-col pt-12"
          >
            <MobileCarousel onComplete={() => navigate("/login?role=customer&signup=true")} />
          </motion.div>
        ) : (
          <div className="w-full max-w-md relative z-10 px-4">
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
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-primary mb-2 shadow-[0_0_15px_rgba(255,184,0,0.15)]"
                    >
                      <Sparkles size={14} /> Welcome to Fishing Panda
                    </motion.div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-[0.9] bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                      Select your role
                    </h1>
                    <p className="text-neutral-400 font-medium">Choose how you want to interact with the platform</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {roles.filter(r => !r.isPrivate).map((role) => (
                      <Card
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={cn(
                          "relative p-5 cursor-pointer transition-all duration-300 border bg-black/40 backdrop-blur-3xl group overflow-hidden rounded-[1.5rem]",
                          selectedRole === role.id 
                            ? "border-primary/50 shadow-[0_0_30px_rgba(255,184,0,0.1)] scale-[1.02]" 
                            : "border-white/5 hover:border-white/20 hover:scale-[1.01]"
                        )}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-center gap-4">
                          <div className={cn(
                            "p-3.5 rounded-2xl bg-gradient-to-br transition-all duration-300 group-hover:scale-110 shadow-lg",
                            role.color,
                            selectedRole === role.id ? "shadow-primary/20" : "shadow-black/50"
                          )}>
                            <role.icon className={selectedRole === role.id && role.id === 'customer' ? "text-primary-foreground" : "text-white"} size={26} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-lg uppercase tracking-tight text-white mb-0.5">{role.title}</h3>
                            </div>
                            <p className="text-sm text-neutral-400 font-medium line-clamp-2 leading-tight">{role.description}</p>
                          </div>
                          {selectedRole === role.id && (
                            <motion.div layoutId="check" className="text-primary flex-shrink-0">
                              <CheckCircle2 size={28} className="fill-primary/20" />
                            </motion.div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>

                  <Button
                    disabled={!selectedRole}
                    onClick={handleNext}
                    className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-primary-foreground transition-all font-black uppercase tracking-widest text-lg gap-2 shadow-[0_10px_40px_-10px_rgba(255,184,0,0.5)]"
                  >
                    Continue <ArrowRight size={20} />
                  </Button>

                  <p className="text-center text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    Already have an account?{" "}
                    <button 
                      onClick={() => navigate("/login")}
                      className="text-primary hover:underline font-black"
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
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft size={16} /> Back to Roles
                  </button>

                  <div className="space-y-6">
                    <div className={cn(
                      "w-20 h-20 rounded-[2rem] bg-gradient-to-br flex items-center justify-center mx-auto shadow-[0_20px_50px_-10px_rgba(255,184,0,0.3)]",
                      currentRoleData.color
                    )}>
                      <currentRoleData.icon className={currentRoleData.id === 'customer' ? "text-primary-foreground" : "text-white"} size={40} />
                    </div>

                    <div className="text-center space-y-2">
                      <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-[0.9]">{currentRoleData.title} Experience</h2>
                      <p className="text-neutral-400 font-medium">{currentRoleData.description}</p>
                    </div>

                    <div className="bg-black/40 rounded-[2rem] p-6 border border-white/5 backdrop-blur-3xl space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">What you get</h4>
                      <div className="space-y-3">
                        {currentRoleData.features.map((feature, i) => (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * i }}
                            key={i}
                            className="flex items-center gap-3 text-neutral-200 text-sm font-bold tracking-tight"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 size={14} className="text-primary" />
                            </div>
                            {feature}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1 p-4 bg-black/40 rounded-[1.5rem] border border-white/5 backdrop-blur-3xl text-center">
                        <ShieldCheck className="mx-auto mb-2 text-primary" size={24} />
                        <p className="text-[10px] text-neutral-500 uppercase font-black tracking-wider">Secure</p>
                        <p className="text-sm font-black text-white">Safe Access</p>
                      </div>
                      <div className="flex-1 p-4 bg-black/40 rounded-[1.5rem] border border-white/5 backdrop-blur-3xl text-center">
                        <Clock className="mx-auto mb-2 text-zinc-400" size={24} />
                        <p className="text-[10px] text-neutral-500 uppercase font-black tracking-wider">Live</p>
                        <p className="text-sm font-black text-white">24/7 Support</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleNext}
                    className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-primary-foreground transition-all font-black uppercase tracking-widest text-lg gap-2 shadow-[0_10px_40px_-10px_rgba(255,184,0,0.5)]"
                  >
                    Join as {currentRoleData.title} <ArrowRight size={20} />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-8 left-0 right-0 text-center opacity-30 pointer-events-none">
        <p className="text-[10px] uppercase tracking-[0.3em] font-light">Fishing Panda Modern Delivery Infrastructure v2.1</p>
      </div>
    </div>
  );
}
