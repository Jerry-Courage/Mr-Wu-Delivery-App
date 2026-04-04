import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChefHat, Bike, MapPin, ArrowRight, Sparkles, Zap, Clock } from "lucide-react";

const slides = [
  {
    id: 1,
    title: "Authentic Masterpieces",
    description: "Every dish is a work of art, crafted by master chefs using centuries-old techniques.",
    icon: <ChefHat className="text-orange-500" size={48} />,
    badge: <Sparkles size={14} className="text-orange-400" />,
    badgeText: "Culinary Excellence",
    color: "from-orange-500/20 to-transparent"
  },
  {
    id: 2,
    title: "Lightning Delivery",
    description: "Our elite fleet is optimized for speed, ensuring your flavors arrive piping hot.",
    icon: <Bike className="text-blue-500" size={48} />,
    badge: <Zap size={14} className="text-blue-400" />,
    badgeText: "Kinetic Logistics",
    color: "from-blue-500/20 to-transparent"
  },
  {
    id: 3,
    title: "Total Control",
    description: "Real-time AI tracking gives you full oversight from the kitchen to your doorstep.",
    icon: <MapPin className="text-emerald-500" size={48} />,
    badge: <Clock size={14} className="text-emerald-400" />,
    badgeText: "Live Oversight",
    color: "from-emerald-500/20 to-transparent"
  }
];

interface MobileCarouselProps {
  onComplete: () => void;
}

export default function MobileCarousel({ onComplete }: MobileCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-between py-12 px-6">
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
          <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br ${slides[currentSlide].color} rounded-full blur-[100px] pointer-events-none transition-all duration-700`} />

          {/* Visual Icon Container */}
          <div className="relative">
            <div className="absolute inset-0 bg-white/5 rounded-[2.5rem] blur-2xl" />
            <div className="w-32 h-32 bg-neutral-900 border border-white/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative z-10 transition-transform duration-500 hover:scale-110">
              {slides[currentSlide].icon}
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
              {slides[currentSlide].badge} {slides[currentSlide].badgeText}
            </motion.div>
            <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white leading-[0.9]">
              {slides[currentSlide].title}
            </h2>
            <p className="text-neutral-400 text-base font-medium leading-relaxed max-w-[280px] mx-auto">
              {slides[currentSlide].description}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Footer Controls */}
      <div className="w-full space-y-8 relative z-10">
        {/* Pagination Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentSlide ? "w-8 bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.6)]" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleNext}
            className="w-full h-16 rounded-[2rem] bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-lg shadow-xl shadow-orange-600/10 active:scale-95 transition-all"
          >
            {currentSlide === slides.length - 1 ? "Get Started" : "Continue"}
            <ArrowRight size={20} className="ml-2" />
          </Button>

          {currentSlide < slides.length - 1 && (
            <button 
              onClick={onComplete}
              className="py-2 text-[10px] font-black uppercase tracking-[0.4em] text-white/30 hover:text-white transition-colors"
            >
              Skip Introduction
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
