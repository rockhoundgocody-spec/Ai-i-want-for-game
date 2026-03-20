import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Cpu, Zap } from 'lucide-react';
import { playSound } from '../services/audioUtils';

interface CloverButtonProps {
  onClick: () => void;
}

export const CloverButton: React.FC<CloverButtonProps> = ({ onClick }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Floating Animation State
  const timeRef = useRef(0);
  const requestRef = useRef<number | undefined>(undefined);

  const animate = (time: number) => {
    if (!isDragging && !isHovered) {
      // Gentle sine wave float
      const floatY = Math.sin(time * 0.002) * 0.5;
      setPosition(prev => ({ ...prev, y: prev.y + floatY * 0.2 })); // Apply minimal drift
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isDragging, isHovered]);

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    playSound('click', { volume: 0.7, playbackRate: 0.9 });
    dragStartRef.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (isDragging) {
      // Clamp to screen bounds
      const newX = Math.min(Math.max(0, clientX - dragStartRef.current.x), window.innerWidth - 60);
      const newY = Math.min(Math.max(0, clientY - dragStartRef.current.y), window.innerHeight - 60);
      setPosition({ x: newX, y: newY });
    }
  };

  const handleEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      playSound('click', { volume: 0.7, playbackRate: 1.1 });
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd = () => handleEnd();

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging]);

  return (
    <div
      style={{ 
        position: 'fixed', 
        left: `${position.x}px`, 
        top: `${position.y}px`, 
        touchAction: 'none', 
        zIndex: 60,
        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
      }}
      className="cursor-pointer group perspective-1000"
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onMouseEnter={() => { setIsHovered(true); playSound('hover'); }}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !isDragging && onClick()}
    >
      <style>{`
        @keyframes reactor-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes reactor-pulse { 0%, 100% { opacity: 0.5; scale: 1; } 50% { opacity: 1; scale: 1.1; } }
        .perspective-1000 { perspective: 1000px; }
      `}</style>

      <div className={`relative w-16 h-16 transition-transform duration-300 ${isHovered ? 'scale-110' : 'scale-100'} ${isDragging ? 'scale-90' : ''}`}>
        
        {/* Plasma Field (Outer Glow) */}
        <div className={`absolute inset-0 bg-cyan-500 rounded-full blur-xl transition-opacity duration-300 ${isHovered ? 'opacity-60' : 'opacity-20'} animate-pulse`} />
        <div className={`absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-30 animate-pulse`} style={{ animationDelay: '0.5s' }} />

        {/* Mechanical Housing */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 to-black border border-cyan-500/30 shadow-2xl overflow-hidden backdrop-blur-md">
            
            {/* Rotating Data Ring */}
            <div className={`absolute inset-1 border-2 border-dashed border-cyan-500/30 rounded-full animate-[reactor-spin_10s_linear_infinite] ${isHovered ? 'duration-[2s]' : 'duration-[10s]'}`} />
            
            {/* Counter-Rotating Core Ring */}
            <div className={`absolute inset-3 border border-indigo-500/50 rounded-full animate-[reactor-spin_7s_linear_infinite_reverse] ${isHovered ? 'duration-[3s]' : 'duration-[7s]'}`} />

            {/* The Core */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className={`relative w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full shadow-[0_0_15px_#22d3ee] flex items-center justify-center transition-all duration-300 ${isHovered ? 'scale-110 shadow-[0_0_25px_#22d3ee]' : ''}`}>
                    {isHovered ? (
                        <Cpu className="w-4 h-4 text-white animate-pulse" />
                    ) : (
                        <Zap className="w-4 h-4 text-white" />
                    )}
                    {/* Inner Glint */}
                    <div className="absolute top-1 left-2 w-2 h-2 bg-white rounded-full blur-[1px] opacity-80" />
                </div>
            </div>

            {/* Scanline Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-50" />
        </div>

        {/* Status Indicator Dot */}
        <div className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 transition-colors duration-300 ${isDragging ? 'bg-yellow-400 shadow-[0_0_10px_#facc15]' : 'bg-green-400 shadow-[0_0_10px_#4ade80]'}`} />
      </div>
    </div>
  );
};