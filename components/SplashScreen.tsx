
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Pickaxe, Gem, ChevronRight, Zap, Hexagon, CircleDashed, Sparkles, ShieldCheck, MapPin, Shield, LogIn } from 'lucide-react';
import { playSound } from '../services/audioUtils';
import { api } from '../services/api';
import { User } from '../types';

interface SplashScreenProps {
  onFinish: () => void;
}

type SplashStage = 'FOCAL_LOGO' | 'BRANDING' | 'LOADING' | 'READY';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<SplashStage>('FOCAL_LOGO');
  const [progress, setProgress] = useState(0);
  const [isLaunching, setIsLaunching] = useState(false);
  const [user, setUser] = useState<User | null>(api.getCurrentUser());

  useEffect(() => {
    const focalTimer = setTimeout(() => {
      setStage('BRANDING');
    }, 3500);

    const brandingTimer = setTimeout(() => {
      setStage('LOADING');
      playSound('boot');
    }, 7000);

    return () => {
      clearTimeout(focalTimer);
      clearTimeout(brandingTimer);
    };
  }, []);

  useEffect(() => {
    if (stage !== 'LOADING') return;

    let start: number | null = null;
    const duration = 3000;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const nextProgress = Math.min((elapsed / duration) * 100, 100);

      setProgress(nextProgress);

      if (nextProgress < 100) {
        requestAnimationFrame(step);
      } else {
        setStage('READY');
      }
    };

    requestAnimationFrame(step);
  }, [stage]);

  const handleGo = () => {
    setIsLaunching(true);
    playSound('warp');
    setTimeout(onFinish, 800);
  };

  const handleLogin = async () => {
    try {
      const loggedInUser = await api.loginWithGoogle();
      setUser(loggedInUser);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030508] overflow-hidden transition-opacity duration-1000 ${isLaunching ? 'opacity-0' : 'opacity-100'}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        @keyframes focal-reveal { 
          0% { transform: scale(0.8); opacity: 0; filter: blur(20px) brightness(0); }
          10% { opacity: 0.8; filter: blur(10px) brightness(1.5); }
          20% { opacity: 0.4; }
          30% { opacity: 1; filter: blur(0px) brightness(1); transform: scale(1); }
          80% { opacity: 1; transform: scale(1.05); filter: blur(0px); }
          100% { opacity: 0; transform: scale(1.2); filter: blur(20px); }
        }
        @keyframes ring-expand {
          0% { transform: scale(0.5); opacity: 0; }
          50% { opacity: 0.3; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes float-gentle { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-15px) rotate(5deg); } }
        @keyframes warp-out { 0% { transform: scale(1); opacity: 1; filter: blur(0px); } 100% { transform: scale(10); opacity: 0; filter: blur(20px); } }
        .font-cinematic { font-family: 'Playfair Display', serif; }
        .warp-active { animation: warp-out 0.8s cubic-bezier(0.7, 0, 0.84, 0) forwards; }
        .logo-focal-stage { animation: focal-reveal 3.5s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
      `}</style>

      <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#1e1b4b_0%,#030508_80%)]" />
          <div className="absolute inset-0 opacity-40">
              <Sparkles className="w-full h-full text-cyan-400 opacity-20" />
          </div>
      </div>

      <div className={`relative z-10 w-full flex flex-col items-center justify-center transition-all duration-1000 ${isLaunching ? 'warp-active' : ''}`}>
        
        {stage === 'FOCAL_LOGO' && (
          <div className="relative w-full h-full flex items-center justify-center">
             <div className="absolute w-64 h-64 border border-cyan-500/20 rounded-full animate-[ring-expand_3s_ease-out_infinite]" />
             <div className="relative logo-focal-stage flex flex-col items-center">
                <div className="relative w-72 h-72">
                  <div className="w-full h-full p-4 flex items-center justify-center">
                    <div className="relative">
                       <Shield className="w-64 h-64 text-white opacity-90 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]" strokeWidth={0.5} />
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-black text-white italic tracking-tighter mb-1">RH</span>
                          <div className="w-12 h-px bg-white/40" />
                          <span className="text-[10px] font-mono text-cyan-400 font-black tracking-[0.5em] mt-2">RHG_CTRL</span>
                       </div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 text-center font-mono text-[10px] text-gray-500 tracking-[1em] uppercase animate-pulse">
                    Initiating_RHG_Core
                </div>
             </div>
          </div>
        )}

        {stage === 'BRANDING' && (
          <div className="flex flex-col items-center animate-[fade-in-up_2s_ease-out]">
             <div className="relative w-48 h-48 mb-12 animate-[float-gentle_6s_ease-in-out_infinite]">
                 <div className="absolute inset-0 bg-cyan-500 rounded-full blur-[60px] opacity-20" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Gem className="w-24 h-24 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]" strokeWidth={1} />
                    <Sparkles className="absolute inset-0 w-full h-full text-cyan-400 opacity-50" />
                 </div>
             </div>
             <div className="text-center space-y-4 px-6">
                <h1 className="text-6xl md:text-7xl font-cinematic font-bold text-white italic tracking-tight">RockHound-Go</h1>
                <p className="text-[11px] font-mono text-cyan-400/80 tracking-[0.3em] uppercase">Official AI Companion</p>
             </div>
          </div>
        )}

        {stage === 'LOADING' && (
           <div className="w-full max-w-sm px-8 flex flex-col items-center animate-[fade-in-up_1s_ease-out]">
              <div className="relative w-32 h-32 mb-12 flex items-center justify-center">
                  <div className="absolute inset-0 border-2 border-cyan-900/50 rounded-full" />
                  <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin" />
                  <Zap className="w-8 h-8 text-cyan-400 animate-pulse" />
              </div>
              <div className="w-full space-y-3">
                  <div className="flex justify-between items-end">
                      <span className="block text-[10px] font-black text-cyan-500 uppercase tracking-widest">Neural Calibration</span>
                      <span className="text-lg font-black text-white font-mono">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-3 bg-gray-900/50 rounded-full border border-white/5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-white transition-all duration-100" style={{ width: `${progress}%` }} />
                  </div>
              </div>
           </div>
        )}

        {stage === 'READY' && (
           <div className="flex flex-col items-center animate-[fade-in-up_0.8s_cubic-bezier(0.34,1.56,0.64,1)]">
              {user ? (
                <button onClick={handleGo} className="relative w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-1 shadow-[0_0_50px_rgba(34,211,238,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-[#050a10] flex items-center justify-center relative overflow-hidden">
                        <span className="text-4xl font-black text-white italic tracking-tighter transform -skew-x-6">GO</span>
                    </div>
                </button>
              ) : (
                <button onClick={handleLogin} className="group relative px-8 py-4 rounded-full bg-white text-black font-black flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                    <LogIn className="w-5 h-5" />
                    <span className="tracking-tighter italic">UPLINK WITH GOOGLE</span>
                    <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-20 pointer-events-none" />
                </button>
              )}
              <div className="mt-8 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 backdrop-blur-md flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">{user ? 'Neural Uplink Secure' : 'Awaiting Authorization'}</span>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
