import React, { useState } from 'react';
import { Calculator } from './components/Calculator';
import { GamesHub } from './components/GamesHub';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [view, setView] = useState('calculator');

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'calculator' ? (
          <motion.div
            key="calc"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 0.4, ease: 'circOut' }}
            className="w-full max-w-md p-4"
          >
            <Calculator onSecretTriggered={() => setView('games')} />
          </motion.div>
        ) : (
          <motion.div
            key="games"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="w-full h-full min-h-screen"
          >
            <GamesHub onBack={() => setView('calculator')} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
