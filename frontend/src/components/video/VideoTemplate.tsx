import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video/hooks';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';
import { Scene8 } from './video_scenes/Scene8';

const SCENE_DURATIONS = {
  hero: 7000,
  dashboard: 9000,
  kanban: 9000,
  collab: 8000,
  progress: 8000,
  auth: 8000,
  search: 8000,
  outro: 7000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0d1b2e]">
      {/* Persistent Background */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full blur-[100px] opacity-30"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }}
          animate={{
            x: ['-20vw', '40vw', '10vw'],
            y: ['-10vh', '50vh', '20vh'],
            scale: [1, 1.2, 0.8]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[80px] opacity-20 right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }}
          animate={{
            x: ['10vw', '-30vw', '0vw'],
            y: ['10vh', '-40vh', '-10vh'],
            scale: [1, 1.5, 0.9]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <AnimatePresence initial={false} mode="wait">
        {currentScene === 0 && <Scene1 key="hero" />}
        {currentScene === 1 && <Scene2 key="dashboard" />}
        {currentScene === 2 && <Scene3 key="kanban" />}
        {currentScene === 3 && <Scene4 key="collab" />}
        {currentScene === 4 && <Scene5 key="progress" />}
        {currentScene === 5 && <Scene6 key="auth" />}
        {currentScene === 6 && <Scene7 key="search" />}
        {currentScene === 7 && <Scene8 key="outro" />}
      </AnimatePresence>
    </div>
  );
}
