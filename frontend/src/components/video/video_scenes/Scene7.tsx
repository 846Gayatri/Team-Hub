import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

export function Scene7() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-start pt-32 z-10"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-4xl font-bold mb-12 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        Find anything. Instantly.
      </h2>

      <motion.div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.4 }}
      >
        <div className="flex items-center px-4 py-4 border-b border-slate-800">
          <Search className="text-slate-400 mr-3" size={20} />
          <span className="text-lg text-slate-300 font-mono">des|</span>
          <div className="ml-auto flex gap-1">
            <kbd className="bg-slate-800 text-xs px-2 py-1 rounded text-slate-400 border border-slate-700">⌘</kbd>
            <kbd className="bg-slate-800 text-xs px-2 py-1 rounded text-slate-400 border border-slate-700">K</kbd>
          </div>
        </div>

        {phase >= 2 && (
          <div className="p-2 space-y-1 bg-slate-900">
            <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Tasks</div>
            <motion.div 
              className="bg-blue-600/20 border-l-2 border-blue-500 px-4 py-3 rounded-r-lg flex flex-col"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <span className="font-bold text-white">Design System Revamp</span>
              <span className="text-xs text-slate-400 mt-1">Project: Frontend Core</span>
            </motion.div>
            <motion.div 
              className="px-4 py-3 rounded flex flex-col"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <span className="font-medium text-slate-300">Design Marketing Assets</span>
              <span className="text-xs text-slate-500 mt-1">Project: Q3 Launch</span>
            </motion.div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
