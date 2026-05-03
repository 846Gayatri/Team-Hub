import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-20"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6 }}
    >
      <div className="glass-panel w-full max-w-3xl p-10 rounded-3xl relative overflow-hidden">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-violet-500/10"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        />
        
        <h2 className="text-3xl font-bold mb-2 relative z-10">Q3 Marketing Launch</h2>
        <p className="text-slate-400 mb-8 relative z-10">24 of 28 tasks completed</p>

        <div className="relative z-10 mb-2 flex justify-between text-sm font-bold">
          <span>Progress</span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          >
            85%
          </motion.span>
        </div>
        
        <div className="h-4 bg-slate-800 rounded-full overflow-hidden relative z-10">
          <motion.div 
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 glow-cyan"
            initial={{ width: "20%" }}
            animate={phase >= 1 ? { width: "85%" } : { width: "20%" }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        </div>

        {phase >= 2 && (
          <motion.div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
          >
            <div className="bg-emerald-500 text-white px-6 py-3 rounded-full font-bold text-xl shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              Milestone Reached
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
