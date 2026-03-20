import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Camera, Zap, Box, ShieldCheck, Check, Target, Activity, Scan, Loader2, Music, Music2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { playSound } from '../services/audioUtils';

interface GuideProps {
  onClose: () => void;
}

export const Guide: React.FC<GuideProps> = ({ onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  
  // Drill States
  const [drillProgress, setDrillProgress] = useState(0);
  const [lockPosition, setLockPosition] = useState({ x: 50, y: 50 });
  const [drillCompleted, setDrillCompleted] = useState<Set<number>>(new Set());

  // Optical Lock Logic
  useEffect(() => {
    if (activeStep === 0 && !drillCompleted.has(0)) {
        const interval = setInterval(() => {
            setLockPosition({ 
                x: 20 + Math.random() * 60, 
                y: 20 + Math.random() * 60 
            });
        }, 1200);
        return () => clearInterval(interval);
    }
  }, [activeStep, drillCompleted]);

  const handleDrillSuccess = (step: number) => {
    playSound('success');
    setDrillCompleted(prev => new Set(prev).add(step));
    if (step < 2) {
        setTimeout(() => setActiveStep(step + 1), 800);
    }
  };

  const steps = [
    {
      title: 'CALIBRATE_OPTICS',
      desc: 'Lock onto the spectral ghost to verify sensor alignment.',
      icon: Target,
      color: 'cyan',
    },
    {
      title: 'NEURAL_FILTER',
      desc: 'Scrub through the data stream to isolate mineral DNA.',
      icon: Activity,
      color: 'purple',
    },
    {
      title: 'VAULT_UPLINK',
      desc: 'Synchronize rhythmic handshake to secure archive access.',
      icon: Box,
      color: 'emerald',
    }
  ];

  const allDone = drillCompleted.size === 3;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl font-mono overflow-hidden">
      <style>{`
        @keyframes vhs-flicker { 0% { opacity: 0.8; } 5% { opacity: 0.5; } 10% { opacity: 0.8; } 15% { opacity: 0.2; } 20% { opacity: 0.8; } }
        @keyframes scanline-move { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        .glitch-bg { background: repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px); }
      `}</style>

      {/* Rhythmic Background */}
      <div className="absolute inset-0 glitch-bg opacity-20 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-cyan-500/5 animate-[vhs-flicker_4s_infinite]" />
          <div className="absolute top-0 left-0 w-full h-2 bg-white/10 animate-[scanline-move_3s_linear_infinite]" />
      </div>

      <div className="w-full max-w-lg bg-[#050a10] border-2 border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative">
        {/* Header HUD */}
        <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full bg-red-500 animate-pulse`} />
                <h2 className="text-sm font-black text-white tracking-widest">RHG_DRILL_PROTOCOL_v4.5</h2>
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-cyan-400">
                <X size={16} />
            </button>
        </div>

        {/* Tactical Drill Area */}
        <div className="p-8 space-y-8">
            {/* Step Indicators */}
            <div className="flex gap-2">
                {steps.map((_, i) => (
                    <div 
                        key={i} 
                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                            i === activeStep ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 
                            drillCompleted.has(i) ? 'bg-emerald-500' : 'bg-white/10'
                        }`} 
                    />
                ))}
            </div>

            {/* Main Stage */}
            <div className="relative aspect-video bg-black/40 rounded-2xl border border-white/5 overflow-hidden flex flex-col items-center justify-center">
                {activeStep === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-[10px] text-gray-600 absolute top-4 font-mono">EYE_TRACKING_MODE</div>
                        <button 
                            onClick={() => { playSound('click'); handleDrillSuccess(0); }}
                            className="absolute w-12 h-12 border-2 border-cyan-500/50 rounded-lg flex items-center justify-center transition-all hover:scale-125 group"
                            style={{ left: `${lockPosition.x}%`, top: `${lockPosition.y}%`, transform: 'translate(-50%, -50%)' }}
                        >
                            <Target className="text-cyan-400 animate-pulse" size={24} />
                            <div className="absolute inset-0 border border-cyan-400 animate-ping rounded-lg opacity-20" />
                        </button>
                    </div>
                )}

                {activeStep === 1 && (
                    <div className="w-full h-full p-8 flex flex-col items-center justify-center space-y-6">
                        <div className="w-full h-8 bg-gray-900 rounded border border-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-purple-500/20 animate-pulse" />
                            <input 
                                type="range" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                                onChange={(e) => {
                                    setDrillProgress(parseInt(e.target.value));
                                    if (parseInt(e.target.value) > 95) handleDrillSuccess(1);
                                }}
                            />
                            <div className="h-full bg-purple-500 transition-all duration-100" style={{ width: `${drillProgress}%` }} />
                        </div>
                        <div className="text-[10px] text-purple-400 font-bold animate-pulse">SCRUB_STREAM_TO_ISOLATE</div>
                    </div>
                )}

                {activeStep === 2 && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative">
                            <Box className="w-16 h-16 text-emerald-400" />
                            <div className="absolute inset-0 bg-emerald-400/20 blur-xl rounded-full" />
                        </div>
                        <button 
                            onClick={() => { playSound('click'); handleDrillSuccess(2); }}
                            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                        >
                            COMMIT_TO_VAULT
                        </button>
                    </div>
                )}

                {/* Step Text Overlay */}
                <div className="absolute bottom-4 left-6 right-6">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">{steps[activeStep].title}</h3>
                    <p className="text-[10px] text-gray-400 mt-1">{steps[activeStep].desc}</p>
                </div>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white/5 border-t border-white/5">
            <button 
                onClick={allDone ? onClose : () => {}}
                className={`w-full py-4 rounded-2xl font-black text-sm tracking-[0.2em] transition-all flex items-center justify-center gap-3
                    ${allDone 
                        ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/20 hover:scale-[1.02]' 
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                    }`}
            >
                {allDone ? (
                    <>
                        <ShieldCheck size={18} />
                        ENTER_FIELD_GUIDE
                    </>
                ) : (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        COMPLETING_DRILLS... ({drillCompleted.size}/3)
                    </>
                )}
            </button>
            <p className="text-[9px] text-center text-gray-600 mt-4 uppercase tracking-[0.3em]">
                Secure Uplink Established // RockHound-Go v4.5
            </p>
        </div>
      </div>
    </div>
  );
};