
import React, { useEffect, useState, Suspense } from 'react';
import { Rock } from '../types';
import { Rock3DViewer } from './Rock3DModel';
import { Sparkles, Zap, Star, Trophy, ArrowRight, Share2, Download } from 'lucide-react';
import { playSound } from '../services/audioUtils';

interface DiscoveryRevealProps {
  rock: Rock;
  onDismiss: () => void;
}

export const DiscoveryReveal: React.FC<DiscoveryRevealProps> = ({ rock, onDismiss }) => {
  const [phase, setPhase] = useState<'FLASH' | 'BEAM' | 'SPECIMEN' | 'UI'>('FLASH');
  
  useEffect(() => {
    playSound('revealImpact');
    setTimeout(() => playSound('revealChime'), 200);
    
    const timers = [
        setTimeout(() => setPhase('BEAM'), 100),
        setTimeout(() => setPhase('SPECIMEN'), 800),
        setTimeout(() => setPhase('UI'), 2000)
    ];
    
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const isLegendary = rock.rarityScore > 85;
  const isRare = rock.rarityScore > 60 && rock.rarityScore <= 85;
  
  const rarityColor = isLegendary ? '#fbbf24' : isRare ? '#818cf8' : '#22d3ee';
  const rarityClass = isLegendary ? 'LEGENDARY' : isRare ? 'RARE' : 'COMMON';

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#030508] overflow-hidden font-sans">
      <style>{`
        @keyframes beam-rise { 0% { transform: scaleY(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: scaleY(1); opacity: 0; } }
        @keyframes glitch-text { 
            0% { transform: translate(0); text-shadow: -2px 0 red, 2px 0 blue; }
            20% { transform: translate(-2px, 2px); }
            40% { transform: translate(-2px, -2px); }
            60% { transform: translate(2px, 2px); }
            80% { transform: translate(2px, -2px); }
            100% { transform: translate(0); }
        }
        @keyframes specimen-bounce { 
            0% { transform: scale(0) translateY(100px); opacity: 0; }
            60% { transform: scale(1.1) translateY(-20px); opacity: 1; }
            100% { transform: scale(1) translateY(0); }
        }
        .liquid-border { position: relative; border: 1px solid transparent; background: linear-gradient(#030508, #030508) padding-box, linear-gradient(to right, ${rarityColor}, transparent) border-box; }
      `}</style>

      {/* PHASE 1: FLASHBANG */}
      <div className={`absolute inset-0 z-50 bg-white transition-opacity duration-700 pointer-events-none ${phase === 'FLASH' ? 'opacity-100' : 'opacity-0'}`} />

      {/* PHASE 2: RARITY BEAM */}
      <div className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${phase === 'BEAM' ? 'opacity-100' : 'opacity-0'}`}>
          <div 
            className="w-32 h-[200%] blur-3xl animate-[beam-rise_1.5s_ease-out]"
            style={{ background: `linear-gradient(to top, transparent, ${rarityColor}, transparent)` }}
          />
      </div>

      {/* PHASE 3: THE SPECIMEN */}
      <div className={`relative z-10 w-full h-[50vh] transition-all duration-1000 ${phase === 'SPECIMEN' || phase === 'UI' ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`w-full h-full ${phase === 'SPECIMEN' ? 'animate-[specimen-bounce_1.2s_cubic-bezier(0.34,1.56,0.64,1)]' : ''}`}>
              <Suspense fallback={null}>
                  <Rock3DViewer modelUrl="https://aistudiocdn.com/assets/rock.glb" rock={rock} />
              </Suspense>
          </div>
      </div>

      {/* PHASE 4: UI INFO CARDS */}
      <div className={`relative z-20 w-full max-w-sm px-6 space-y-6 transition-all duration-700 ${phase === 'UI' ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
          <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="h-[1px] w-8 bg-white/20" />
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.5em]">RockHound-Go Neural Link</span>
                  <div className="h-[1px] w-8 bg-white/20" />
              </div>
              <div className={`inline-block px-4 py-1 rounded-full text-[10px] font-black tracking-[0.3em] uppercase mb-4 shadow-lg`} style={{ backgroundColor: `${rarityColor}20`, color: rarityColor, border: `1px solid ${rarityColor}40` }}>
                  {rarityClass} ASSET ACQUIRED
              </div>
              <h1 className="text-5xl font-black text-white tracking-tighter italic animate-[glitch-text_2s_infinite] drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                  {rock.name.toUpperCase()}
              </h1>
          </div>

          <div className="bg-[#0a0f18]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 liquid-border">
              <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Yield Bonus</span>
                  </div>
                  <span className="text-xl font-black text-white">+{rock.bonusXP.rarity + rock.bonusXP.expertEye} XP</span>
              </div>
              
              <p className="text-sm text-gray-400 leading-relaxed italic mb-8 border-l-2 border-white/10 pl-4">
                  "{rock.expertExplanation || rock.description.slice(0, 100) + '...'}"
              </p>

              <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">
                      <Download size={14} /> Local Archive
                  </button>
                  <button className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">
                      <Share2 size={14} /> Broadcast
                  </button>
              </div>
          </div>

          <button 
            onClick={onDismiss}
            className="w-full py-5 bg-gradient-to-r from-cyan-600 to-indigo-600 rounded-3xl text-sm font-black uppercase tracking-[0.4em] text-white shadow-2xl shadow-indigo-500/20 group active:scale-95 transition-all"
          >
            <div className="flex items-center justify-center gap-3">
                Continue to RHG Vault
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
      </div>

      {/* Environmental Dust/Particles */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <Sparkles size={120} className="text-white/5 animate-pulse" />
      </div>
    </div>
  );
};
