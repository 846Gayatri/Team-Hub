import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 8000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const columns = ['TODO', 'IN PROGRESS', 'DONE'];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-12"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6 }}
    >
      <div className="w-full flex space-x-6 h-[70vh]">
        {columns.map((col, i) => (
          <motion.div 
            key={col}
            className="flex-1 glass-panel rounded-2xl p-4 flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <h3 className="font-bold text-slate-300 mb-4 px-2 tracking-wide text-sm">{col}</h3>
            <div className="flex-1 space-y-3 relative">
              {i === 0 && (
                <motion.div 
                  className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 shadow-lg z-20"
                  initial={{ opacity: 0, x: -20 }}
                  animate={phase >= 1 ? 
                    (phase >= 2 ? { x: '110%', y: 20, rotate: 2 } : { opacity: 1, x: 0 }) 
                    : { opacity: 0, x: -20 }}
                  transition={phase >= 2 ? { type: 'spring', stiffness: 80, damping: 15 } : { duration: 0.4 }}
                  style={phase >= 2 ? { position: 'absolute', width: '100%' } : {}}
                >
                  <div className="flex space-x-2 mb-2">
                    <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">High Priority</span>
                  </div>
                  <p className="font-medium text-sm">Design System Revamp</p>
                </motion.div>
              )}
              {i === 1 && (
                <motion.div 
                  className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 shadow-lg opacity-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  transition={{ delay: 0.8 }}
                >
                  <p className="font-medium text-sm">API Integration</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.h2 
        className="text-4xl font-bold mt-8 text-center"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        Fluid workflows.
      </motion.h2>
    </motion.div>
  );
}
