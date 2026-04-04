import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

export default function SplashScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-neutral-950 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative flex flex-col items-center">
        {/* Animated Logo Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 0.8, 
            ease: [0.22, 1, 0.36, 1],
            type: "spring",
            stiffness: 100 
          }}
          className="w-32 h-32 relative mb-8"
        >
          <div className="absolute inset-0 bg-orange-600/20 rounded-[2.5rem] blur-2xl animate-pulse" />
          <div className="relative p-4 bg-neutral-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden group">
            <motion.img 
              src={logo} 
              alt="Mr. Wu Logo" 
              className="w-full h-full object-contain"
              animate={{ 
                rotateY: [0, 10, 0, -10, 0],
                y: [0, -5, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.div>

        {/* Branding */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center space-y-1"
        >
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Mr Wu's</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/80">Premium Chinese Delivery</p>
        </motion.div>

        {/* Loading Progress Bar (Native Style) */}
        <div className="mt-16 w-48 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.6)] rounded-full"
          />
        </div>
      </div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1 }}
        className="absolute bottom-12 left-0 right-0 text-center"
      >
        <p className="text-[9px] uppercase tracking-[0.5em] font-light text-white">Modern Delivery Infrastructure</p>
      </motion.div>
    </div>
  );
}
