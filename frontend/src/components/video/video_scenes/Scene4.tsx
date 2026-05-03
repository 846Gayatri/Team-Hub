import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ShieldCheck, UserRound } from 'lucide-react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const members = [
    { name: "Sarah Chen", role: "Admin", icon: ShieldCheck, color: "text-violet-400" },
    { name: "Alex Kumar", role: "Member", icon: UserRound, color: "text-blue-400" },
    { name: "Elena Rossi", role: "Member", icon: UserRound, color: "text-blue-400" },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h2 
        className="text-5xl font-bold mb-16 text-center"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Role-based Collaboration
      </motion.h2>

      <div className="flex space-x-6">
        {members.map((member, i) => (
          <motion.div
            key={i}
            className="glass-panel p-6 rounded-2xl w-64 flex flex-col items-center text-center relative overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: phase >= 1 ? i * 0.15 : 0 }}
          >
            <motion.div 
              className={`w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 border border-slate-700 ${member.color}`}
              animate={phase >= 2 && i === 0 ? { scale: [1, 1.1, 1], boxShadow: "0 0 20px rgba(124, 58, 237, 0.4)" } : {}}
              transition={{ duration: 1, repeat: i===0 ? Infinity : 0, repeatDelay: 2 }}
            >
              <member.icon size={32} />
            </motion.div>
            <h3 className="font-bold text-lg">{member.name}</h3>
            <span className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-wider">{member.role}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
