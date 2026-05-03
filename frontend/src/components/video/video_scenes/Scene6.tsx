import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6 }}
    >
      <div className="glass-panel w-[400px] p-8 rounded-2xl flex flex-col items-center">
        <motion.div 
          className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-6"
          animate={phase >= 2 ? { scale: [1, 1.2, 1], borderColor: '#3b82f6' } : {}}
          transition={{ duration: 0.5 }}
        >
          <Mail className={phase >= 2 ? "text-blue-400" : "text-slate-400"} size={28} />
        </motion.div>

        <h3 className="text-2xl font-bold mb-2 text-center">Reset Password</h3>
        <p className="text-sm text-slate-400 mb-6 text-center">Enter your email to receive a reset link.</p>

        <div className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3 mb-4 flex items-center">
          <span className="text-slate-300 font-mono text-sm">sarah@acmecorp.com</span>
          {phase >= 1 && (
            <motion.div className="ml-auto w-1 h-4 bg-blue-500 rounded-full" animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} />
          )}
        </div>

        <motion.button 
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 overflow-hidden relative"
          animate={phase >= 2 ? { backgroundColor: '#10b981' } : {}}
        >
          {phase < 2 ? (
             <>Send Reset Link <ArrowRight size={18} /></>
          ) : (
            <motion.span initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>Sent via Resend!</motion.span>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
