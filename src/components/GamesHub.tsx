import React, { useState } from 'react';
import { Gamepad2, Trophy, Users, Star, Play, ArrowLeft, Zap, Target, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Game {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: string;
}

const GAMES: Game[] = [
  {
    id: 'reflex',
    title: 'Reflex Master',
    description: 'Test your reaction time in this fast-paced clicker.',
    icon: <Zap className="w-8 h-8" />,
    color: 'bg-yellow-500',
    category: 'Action'
  },
  {
    id: 'aim',
    title: 'Aim Trainer',
    description: 'Precision is key. Hit the targets as they appear.',
    icon: <Target className="w-8 h-8" />,
    color: 'bg-red-500',
    category: 'Skill'
  },
  {
    id: 'clicker',
    title: 'Neon Clicker',
    description: 'The ultimate idle experience with a neon twist.',
    icon: <MousePointer2 className="w-8 h-8" />,
    color: 'bg-blue-500',
    category: 'Idle'
  }
];

export const GamesHub: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-lg">
            <Gamepad2 className="text-black" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">GAMES HUB</h1>
        </div>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm uppercase tracking-widest font-semibold"
        >
          <ArrowLeft size={16} /> Exit Portal
        </button>
      </header>

      <AnimatePresence mode="wait">
        {!selectedGame ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {GAMES.map((game) => (
              <motion.div
                key={game.id}
                whileHover={{ y: -5 }}
                className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col group cursor-pointer"
                onClick={() => setSelectedGame(game)}
              >
                <div className={`w-14 h-14 ${game.color} rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-black/50 group-hover:scale-110 transition-transform`}>
                  {game.icon}
                </div>
                <div className="text-xs font-bold text-emerald-500 mb-2 uppercase tracking-widest">{game.category}</div>
                <h3 className="text-xl font-bold mb-2">{game.title}</h3>
                <p className="text-white/50 text-sm mb-6 flex-grow">{game.description}</p>
                <button className="w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 group-hover:bg-emerald-400 transition-colors">
                  <Play size={18} fill="currentColor" /> PLAY NOW
                </button>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="game"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center h-[60vh] text-center"
          >
            <div className={`w-24 h-24 ${selectedGame.color} rounded-3xl flex items-center justify-center mb-8 shadow-2xl`}>
              {selectedGame.icon}
            </div>
            <h2 className="text-5xl font-black mb-4 uppercase italic tracking-tighter">{selectedGame.title}</h2>
            <p className="text-xl text-white/60 mb-12 max-w-md">Initializing secure game environment...</p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setSelectedGame(null)}
                className="px-8 py-4 border border-white/20 rounded-full font-bold hover:bg-white/5 transition-colors"
              >
                BACK TO HUB
              </button>
              <button className="px-12 py-4 bg-emerald-500 text-black rounded-full font-bold hover:bg-emerald-400 transition-all hover:scale-105">
                START SESSION
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-white/30 text-xs uppercase tracking-widest font-medium">
        <div>© 2026 NOVA GAMING NETWORK</div>
        <div className="flex gap-8">
          <span className="flex items-center gap-2"><Trophy size={14} /> 1.2M ACTIVE PLAYERS</span>
          <span className="flex items-center gap-2"><Users size={14} /> 42 SERVERS ONLINE</span>
        </div>
      </footer>
    </div>
  );
};
