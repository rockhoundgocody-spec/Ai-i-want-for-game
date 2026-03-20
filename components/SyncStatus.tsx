import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2, Wifi, UploadCloud, Radio, ShieldCheck, Activity } from 'lucide-react';
import { playSound } from '../services/audioUtils';

interface SyncStatusProps {
  isSyncing: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ isSyncing }) => {
  const [showSaved, setShowSaved] = useState(false);
  const [ping, setPing] = useState(24);
  const prevIsSyncing = usePrevious(isSyncing);

  useEffect(() => {
    // Sync Logic
    if (prevIsSyncing && !isSyncing) {
      playSound('success');
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 3000);
      return () => clearTimeout(timer);
    }
    
    if (!prevIsSyncing && isSyncing) {
        playSound('click', { volume: 0.5, playbackRate: 0.8 });
    }
  }, [isSyncing, prevIsSyncing]);

  // Simulate Ping fluctuations when idle
  useEffect(() => {
      if (!isSyncing) {
          const interval = setInterval(() => {
              setPing(Math.floor(20 + Math.random() * 15));
          }, 2000);
          return () => clearInterval(interval);
      }
  }, [isSyncing]);

  return (
    <div className="relative group perspective-1000">
        <style>{`
            @keyframes data-stream { 0% { background-position: 0 0; } 100% { background-position: 20px 0; } }
            @keyframes signal-pulse { 0% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.3; transform: scale(0.8); } }
        `}</style>

        {/* Outer Glow Container */}
        <div className={`
            relative flex items-center gap-3 px-3 py-1.5 rounded-full border transition-all duration-500 overflow-hidden backdrop-blur-md
            ${isSyncing 
                ? 'bg-indigo-900/40 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
                : showSaved 
                    ? 'bg-emerald-900/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                    : 'bg-black/40 border-white/10 hover:border-white/20'
            }
        `}>
            
            {/* Animated Background Texture for Syncing */}
            {isSyncing && (
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_25%,rgba(99,102,241,0.2)_50%,transparent_75%)] bg-[length:20px_100%] animate-[data-stream_1s_linear_infinite]" />
            )}

            {/* Icon State Machine */}
            <div className="relative z-10 flex items-center justify-center w-4 h-4">
                {isSyncing ? (
                    <div className="relative">
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        <div className="absolute inset-0 bg-indigo-400 rounded-full blur-md opacity-50 animate-pulse" />
                    </div>
                ) : showSaved ? (
                    <div className="relative animate-in zoom-in duration-300">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <div className="absolute inset-0 bg-emerald-400 rounded-full blur-lg opacity-20 animate-ping" />
                    </div>
                ) : (
                    <div className="relative group-hover:scale-110 transition-transform">
                        <Radio className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-cyan-500 rounded-full animate-[signal-pulse_2s_infinite]" />
                    </div>
                )}
            </div>

            {/* Text Readout */}
            <div className="relative z-10 flex flex-col justify-center min-w-[60px]">
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider leading-none transition-colors ${
                        isSyncing ? 'text-indigo-300' : showSaved ? 'text-emerald-300' : 'text-gray-400 group-hover:text-gray-200'
                    }`}>
                        {isSyncing ? 'UPLINKING' : showSaved ? 'SECURED' : 'ONLINE'}
                    </span>
                </div>
                
                {/* Micro-Stats (Ping / Speed) */}
                <div className="flex items-center gap-1 mt-0.5 h-2 overflow-hidden">
                    {isSyncing ? (
                        <div className="flex items-center gap-1">
                            <span className="text-[8px] font-mono text-indigo-400/80 animate-pulse">TX: {(Math.random() * 5).toFixed(1)} MB/s</span>
                            <UploadCloud className="w-2 h-2 text-indigo-500" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Activity className="w-2 h-2 text-gray-600 group-hover:text-cyan-500" />
                            <span className="text-[8px] font-mono text-gray-500 group-hover:text-cyan-500/80">{ping}ms</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Connection Strength Bars (Visual Flourish) */}
            {!isSyncing && !showSaved && (
                <div className="flex gap-0.5 items-end h-3 opacity-30 group-hover:opacity-100 transition-opacity">
                    <div className="w-0.5 h-1 bg-cyan-500 rounded-full" />
                    <div className="w-0.5 h-2 bg-cyan-500 rounded-full" />
                    <div className="w-0.5 h-3 bg-cyan-500 rounded-full" />
                </div>
            )}
        </div>
    </div>
  );
};

// Hook for previous value
function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T | undefined>(undefined);
  React.useEffect(() => { ref.current = value; });
  return ref.current;
}