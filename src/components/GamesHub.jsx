import React, { useState, useEffect } from 'react';
import { Gamepad2, Trophy, Users, ArrowLeft, Play, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const GamesHub = ({ onBack }) => {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('./games.json')
      .then(res => res.json())
      .then(data => {
        setGames(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load games:", err);
        setLoading(false);
      });
  }, []);

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
        {loading ? (
          <div className="flex items-center justify-center h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : !selectedGame ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {games.map((game) => (
              <motion.div
                key={game.id}
                whileHover={{ y: -5 }}
                className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col group cursor-pointer"
                onClick={() => setSelectedGame(game)}
              >
                <div className={`w-14 h-14 ${game.color} rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-black/50 group-hover:scale-110 transition-transform`}>
                  <Gamepad2 className="w-8 h-8" />
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
            className="flex flex-col h-[80vh]"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedGame(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-bold">{selectedGame.title}</h2>
              </div>
              <a 
                href={selectedGame.iframeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-white/50 hover:text-white"
              >
                Open in new tab <ExternalLink size={14} />
              </a>
            </div>
            
            <div className="flex-grow bg-white/5 rounded-2xl overflow-hidden border border-white/10 relative">
              <iframe 
                src={selectedGame.iframeUrl}
                className="w-full h-full border-none"
                title={selectedGame.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-white/30 text-xs uppercase tracking-widest font-medium">
        <div>© 2026 NOVA GAMING NETWORK</div>
        <div className="flex gap-8">
          <span className="flex items-center gap-2"><Trophy size={14} /> 1.2M ACTIVE PLAYERS</span>
          <span className="flex items-center gap-2"><Users size={14} /> 42 SERVERS ONLINE</span>
        </div>
      </footer>
    </div>
  );
};
