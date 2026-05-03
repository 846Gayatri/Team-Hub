import { useState, useEffect } from 'react';

declare global {
  interface Window {
    startRecording?: () => void;
    stopRecording?: () => void;
  }
}

export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const [currentScene, setCurrentScene] = useState(0);
  // use JSON.stringify to stabilize dependencies
  const sceneKeys = Object.keys(durations);

  useEffect(() => {
    window.startRecording?.();
  }, []);

  useEffect(() => {
    const currentKey = sceneKeys[currentScene];
    const duration = durations[currentKey];

    const timer = setTimeout(() => {
      if (currentScene === sceneKeys.length - 1) {
        window.stopRecording?.();
      }
      setCurrentScene((prev) => (prev + 1) % sceneKeys.length);
    }, duration);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene, JSON.stringify(durations), JSON.stringify(sceneKeys)]);

  return { currentScene };
}
