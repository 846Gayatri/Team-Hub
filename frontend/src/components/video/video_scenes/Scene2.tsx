import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LayoutDashboard, CheckSquare, Clock, AlertTriangle } from 'lucide-react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 8000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const stats = [
    { icon: LayoutDashboard, label: "Projects", value: "12", color: "text-blue-400", bg: "bg-blue-400/10" },
    { icon: CheckSquare, label: "Tasks", value: "148", color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { icon: Clock, label: "In Progress", value: "34", color: "text-amber-400", bg: "bg-amber-400/10" },
    { icon: AlertTriangle, label: "Overdue", value: "5", color: "text-rose-400", bg: "bg-rose-400/10" },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-20"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h2 
        className="text-5xl font-bold mb-12 self-start"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Command Center
      </motion.h2>

      <div className="grid grid-cols-4 gap-6 w-full mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            className="glass-panel p-6 rounded-2xl flex flex-col"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, delay: phase >= 1 ? i * 0.1 : 0 }}
          >
            <div className={`w-12 h-12 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <span className="text-4xl font-bold mb-1">{stat.value}</span>
            <span className="text-slate-400 font-medium">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      <motion.div 
        className="glass-panel w-full p-8 rounded-2xl flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-xl font-bold mb-6">Team Workload</h3>
        <div className="space-y-4">
          {[85, 60, 40].map((val, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-8 h-8 rounded-full bg-slate-700 shrink-0" />
              <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={phase >= 2 ? { width: `${val}%` } : { width: 0 }}
                  transition={{ duration: 1.2, delay: phase >= 2 ? 0.4 + (i * 0.2) : 0, ease: "easeOut" }}
                />
              </div>
              <span className="text-sm font-mono w-10 text-right">{val}%</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
