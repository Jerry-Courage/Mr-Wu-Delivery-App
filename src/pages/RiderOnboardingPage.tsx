import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Banknote, Clock, ShieldCheck, ArrowRight, Sparkles, Zap, Bike } from "lucide-react";

const riderSlides = [
  {
    id: 1,
    title: "Elite Earnings",
    description: "Earn competitive rates with instant daily payouts directly to your account.",
    icon: <Banknote className="text-emerald-500" size={48} />,
    badge: <Sparkles size={14} className="text-emerald-400" />,
    badgeText: "High Income",
    color: "from-emerald-500/20 to-transparent"
  },
  {
    id: 2,
    title: "Total Flexibility",
    description: "Be your own boss. Work when you want, where you want, with no fixed schedules.",
    icon: <Clock className="text-blue-500" size={48} />,
    badge: <Zap size={14} className="text-blue-400" />,
    badgeText: "Your Schedule",
    color: "from-blue-500/20 to-transparent"
  },
  {
    id: 3,
    title: "Ride with Pride",
    description: "Join Ghana's most premium delivery fleet. Get top-tier gear and 24/7 support.",
    icon: <Bike className="text-orange-500" size={48} />,
    badge: <ShieldCheck size={14} className="text-orange-400" />,
    badgeText: "Elite Fleet",
    color: "from-orange-500/20 to-transparent"
  }
];

export default function RiderOnboardingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = React.useState(0);

  const handleNext = () => {
    if (currentSlide < riderSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/login?role=rider&signup=true");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex-1 w-full flex flex-col items-center justify-between py-12 px-6 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-8"
          >
            {/* Decorative Background Blob */}
            <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br ${riderSlides[currentSlide].color} rounded-full blur-[100px] pointer-events-none transition-all duration-700`} />

            {/* Visual Icon Container */}
            <div className="relative">
              <div className="absolute inset-0 bg-white/5 rounded-[2.5rem] blur-2xl" />
              <div className="w-32 h-32 bg-neutral-900 border border-white/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative z-10 transition-transform duration-500 hover:scale-110">
                {riderSlides[currentSlide].icon}
              </div>
            </div>

            {/* Text Content */}
            <div className="space-y-4 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60"
              >
                {riderSlides[currentSlide].badge} {riderSlides[currentSlide].badgeText}
              </motion.div>
              <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white leading-[0.9]">
                {riderSlides[currentSlide].title}
              </h2>
              <p className="text-neutral-400 text-base font-medium leading-relaxed max-w-[280px] mx-auto">
                {riderSlides[currentSlide].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer Controls */}
        <div className="w-full space-y-8 relative z-10">
          {/* Pagination Dots */}
          <div className="flex justify-center gap-2">
            {riderSlides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentSlide ? "w-8 bg-emerald-600 shadow-[0_0_10px_rgba(5,150,105,0.6)]" : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleNext}
              className="w-full h-16 rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-lg shadow-xl shadow-emerald-600/10 active:scale-95 transition-all"
            >
              {currentSlide === riderSlides.length - 1 ? "Join the Fleet" : "Next"}
              <ArrowRight size={20} className="ml-2" />
            </Button>

            <button 
              onClick={() => navigate("/login?role=rider&signup=true")}
              className="py-2 text-[10px] font-black uppercase tracking-[0.4em] text-white/30 hover:text-white transition-colors"
            >
              Already Registered? Sign In
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center opacity-30 pointer-events-none">
        <p className="text-[10px] uppercase tracking-[0.3em] font-light">Become a Fishing Panda Rider v2.1</p>
      </div>
    </div>
  );
}
