
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, DailyBounty } from '../types';
import { api } from '../services/api';
import { getDailyBounty } from '../services/geminiService';
import { Zap, Flame, ShieldCheck, Hammer, Eye, Compass, MapPin, Activity, CheckCircle2, ScanLine, ChevronRight, User as UserIcon, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { playSound } from '../services/audioUtils';

interface HomeProps {
  user: User;
  onNavigate: (view: string) => void;
  userLocation: { lat: number; lng: number } | null;
}

export const Home: React.FC<HomeProps> = ({ user, onNavigate, userLocation }) => {
  const [bounty, setBounty] = useState<DailyBounty | null>(null);
  const [loadingBounty, setLoadingBounty] = useState(true);
  const [bountySource, setBountySource] = useState<'LOCAL' | 'GLOBAL' | 'SCANNING'>('SCANNING'); 
  const containerRef = useRef<HTMLDivElement>(null);
  const [gearChecked, setGearChecked] = useState<Record<string, boolean>>({
    hammer: false,
    goggles: false,
    streakPlate: false,
    water: false
  });
  
  // XP Bar Animation State
  const [xpWidth, setXpWidth] = useState(0);

  const xpToNext = useMemo(() => {
    return (user.level * 100) - user.xp;
  }, [user]);
  
  const xpPercent = useMemo(() => {
      const currentLevelBase = (user.level - 1) * 100;
      const progress = user.xp - currentLevelBase;
      return Math.min(100, Math.max(0, progress));
  }, [user]);

  // Animate XP bar on mount
  useEffect(() => {
      const timer = setTimeout(() => setXpWidth(xpPercent), 300);
      return () => clearTimeout(timer);
  }, [xpPercent]);

  useEffect(() => {
    let isCancelled = false;
    const fetchBounty = async (location: { lat: number; lng: number } | null) => {
        setLoadingBounty(true);
        try {
            const b = await getDailyBounty(location?.lat, location?.lng); 
            if (!isCancelled) {
                setBounty(b);
                setBountySource(location ? 'LOCAL' : 'GLOBAL'); 
            }
        } catch (e) {
            if (!isCancelled) {
                setBountySource('GLOBAL'); 
                setBounty(await getDailyBounty()); 
            }
        } finally {
            if (!isCancelled) {
                setLoadingBounty(false);
            }
        }
    };

    if (userLocation !== null) { 
        fetchBounty(userLocation);
    } else { 
        const geolocationAttempted = localStorage.getItem('geolocation_attempted'); 
        if (geolocationAttempted === 'true' && userLocation === null) {
            setBountySource('GLOBAL');
            fetchBounty(null); 
        } else {
            setBountySource('SCANNING'); 
            setLoadingBounty(true); 
        }
    }

    return () => {
        isCancelled = true;
    };
  }, [userLocation]); 

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleGearToggle = (item: string) => {
    playSound('click');
    setGearChecked(prev => {
      const next = { ...prev, [item]: !prev[item] };
      const allDone = Object.values(next).every(v => v === true);
      const newlyCompleted = allDone && !Object.values(prev).every(v => v === true);
      
      if (newlyCompleted) {
         const current = localStorage.getItem('gear_verified_count') ? parseInt(localStorage.getItem('gear_verified_count')!) : 0;
         localStorage.setItem('gear_verified_count', (current + 1).toString());
         playSound('success');
         toast.success("GEAR VERIFIED: +10 XP 'Prepared Geologist' bonus unlocked!", { icon: '🛡️' });
      }
      return next;
    });
  };

  return (
    <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="h-full bg-[#030508] p-6 overflow-y-auto no-scrollbar pb-24 font-sans selection:bg-cyan-500/30 relative"
    >
      <style>{`
        .bg-grid-glow { background-image: radial-gradient(circle at center, rgba(34, 211, 238, 0.05) 1px, transparent 1px); background-size: 24px 24px; }
        .liquid-bg { 
            background: radial-gradient(600px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(34, 211, 238, 0.08), transparent 40%);
            pointer-events: none;
            position: absolute;
            inset: 0;
            z-index: 0;
            transition: background 0.2s ease-out;
        }
        @keyframes pulse-cyan { 0% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(34, 211, 238, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0); } }
      `}</style>
      
      <div className="absolute inset-0 bg-grid-glow pointer-events-none z-0" />
      <div className="liquid-bg" />

      <div className="relative z-10 mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight italic">Welcome back, {user.username}!</h1>
          <p className="text-xs text-cyan-400/80 font-mono tracking-widest uppercase mt-1">
              RockHound-Go Status: Signal Locked 🔥
          </p>
          
          {/* XP Bar */}
          <div className="mt-4">
              <div className="flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1">
                  <span>Progress to Rank {user.level + 1}</span>
                  <span>{Math.round(xpPercent)}%</span>
              </div>
              <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-600 to-indigo-500 relative transition-all duration-1000 ease-out" 
                    style={{ width: `${xpWidth}%` }}
                  >
                      <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_8px_white]" />
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
          <StatCard label="Active Streak" value={`${user.operatorStats?.scanStreak || 0} DAYS`} icon={Flame} color="orange" />
          <StatCard label="XP to Next Rank" value={xpToNext.toString()} icon={Activity} color="cyan" />
      </div>

      <button 
        onClick={() => { playSound('click'); onNavigate('SCANNER'); }}
        onMouseEnter={() => playSound('hover')}
        className="w-full py-6 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/40 rounded-3xl mb-8 flex items-center justify-between px-6 group active:scale-[0.98] transition-all relative overflow-hidden animate-[pulse-cyan_4s_infinite] z-10"
      >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(34,211,238,0.05)_50%,transparent_75%)] bg-[length:200%_100%] animate-[data-stream_3s_linear_infinite]" />
          
          <div className="flex items-center gap-5 relative z-10">
              <div className="p-3.5 bg-cyan-500/20 rounded-2xl border border-cyan-400/30 group-hover:border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.15)] transition-all">
                  <ScanLine className="w-7 h-7 text-cyan-400 animate-pulse" />
              </div>
              <div className="text-left">
                  <div className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.3em]">Neural Optics Active</div>
                  <div className="text-2xl font-black text-white tracking-tighter">QUICK SCAN</div>
              </div>
          </div>
          
          <div className="p-2 rounded-full bg-white/5 border border-white/10 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/50 transition-all relative z-10">
              <ChevronRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
      </button>

      <div className="relative group mb-8 z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-cyan-600/20 blur-2xl rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-[#050a10]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-cyan-400" />
                        <h2 className="text-xs font-black text-cyan-400 uppercase tracking-[0.3em]">
                            The Mission
                        </h2>
                      </div>
                      <h3 className="text-xl font-black text-white tracking-tight">
                          Your AI Mineral Identification Companion
                      </h3>
                  </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-6 font-medium">
                  RockHound-Go is an AI-powered suite designed for the modern geologist. 
                  Identify minerals from photos, explore interactive maps of collecting sites, 
                  and track your personal collection—all in one field-ready interface.
              </p>
              <div className="grid grid-cols-1 gap-3 mb-6">
                  <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#22d3ee]" />
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">AI Photo Identification</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Interactive Sector Maps</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Offline Field Readiness</span>
                  </div>
              </div>
          </div>
      </div>

      <div className="relative group mb-8 z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 blur-2xl rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-[#050a10]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Activity size={14} className="text-emerald-400" />
                        <h2 className="text-xs font-black text-emerald-400 uppercase tracking-[0.3em]">
                            Community Uplink
                        </h2>
                      </div>
                      <h3 className="text-xl font-black text-white tracking-tight">
                          Connect with Fellow Geologists
                      </h3>
                  </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-6 font-medium">
                  Join the RockHound-Go community. Share your finds, get expert identification, 
                  and connect with fellow geologists around the globe.
              </p>
              <button 
                onClick={() => window.open('https://rockhoundgo.com', '_blank')}
                className="w-full py-4 bg-emerald-600/10 border border-emerald-500/30 hover:bg-emerald-600/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 transition-all flex items-center justify-center gap-3"
              >
                  Join the Community <ChevronRight size={14} />
              </button>
          </div>
      </div>

      <div className="relative group mb-8 z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-cyan-600/20 blur-2xl rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-[#050a10]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                        <h2 className="text-xs font-black text-yellow-400 uppercase tracking-[0.3em]">
                            {bountySource === 'SCANNING' ? "SCANNING SECTOR..." : bountySource === 'LOCAL' ? "LOCAL SECTOR BOUNTY" : "GLOBAL SECTOR BOUNTY"}
                        </h2>
                      </div>
                      <h3 className="text-3xl font-black text-white tracking-tighter">
                          {loadingBounty ? "ACQUIRING TARGET..." : bounty?.targetMineral.toUpperCase() || 'OFFLINE MODE'}
                      </h3>
                  </div>
                  <div className="bg-indigo-600 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-indigo-600/30">
                      {bounty?.xpMultiplier || 1.5}x Multiplier
                  </div>
              </div>

              {loadingBounty ? ( <div className="h-24 flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div> ) : (
                  <>
                      <div className="space-y-4 mb-6">
                          <BountyDetail icon={MapPin} label="Primary Zone" value={bounty?.locationName || 'Unknown'} />
                          <BountyDetail icon={Compass} label="RockHound-Go Intel" value={bounty?.geologicalReason || 'No real-time geo-data available.'} isItalic={true} />
                      </div>
                      <button onClick={() => { playSound('click'); onNavigate('MAP'); }} onMouseEnter={() => playSound('hover')} className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 transition-all flex items-center justify-center gap-3">
                          Deploy to Sector <Zap size={14} />
                      </button>
                  </>
              )}
          </div>
      </div>

      <div className="relative group mb-8 z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 blur-2xl rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-[#050a10]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Compass size={14} className="text-blue-400" />
                        <h2 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em]">
                            Field Resources
                        </h2>
                      </div>
                      <h3 className="text-xl font-black text-white tracking-tight">
                          Official RockHound-Go Archive
                      </h3>
                  </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-6 font-medium">
                  Access the official RockHound-Go archives for detailed mineral guides, 
                  collecting site regulations, and community-sourced field reports.
              </p>
              <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => window.open('https://rockhoundgo.com/resources', '_blank')}
                    className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
                  >
                      Mineral Guides
                  </button>
                  <button 
                    onClick={() => window.open('https://rockhoundgo.com/maps', '_blank')}
                    className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
                  >
                      Site Maps
                  </button>
              </div>
          </div>
      </div>

      <div className="bg-[#0a0f18]/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 relative z-10">
          <div className="flex items-center gap-2 mb-6">
              <ShieldCheck size={18} className="text-emerald-500" />
              <h2 className="text-xs font-black text-white uppercase tracking-widest">Pre-Field Safety Protocol</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <GearItem label="Rock Hammer" icon={Hammer} checked={gearChecked.hammer} onToggle={() => handleGearToggle('hammer')} />
              <GearItem label="Eye Protection" icon={Eye} checked={gearChecked.goggles} onToggle={() => handleGearToggle('goggles')} />
              <GearItem label="Streak Plate" icon={Activity} checked={gearChecked.streakPlate} onToggle={() => handleGearToggle('streakPlate')} />
              <GearItem label="Hydration" icon={Compass} checked={gearChecked.water} onToggle={() => handleGearToggle('water')} />
          </div>
      </div>

      <div className="mt-8 p-6 border-t border-white/5 text-center relative z-10">
          <p className="text-[9px] text-gray-600 font-mono uppercase tracking-[0.4em]">RockHound-Go Neural Core v4.5 // Online</p>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: any) => {
    const colorClass = color === 'orange' ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' : 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
    return (
        <div className="flex-1 bg-[#0a0f18]/80 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex items-center gap-4">
            <div className={`p-3 rounded-xl border ${colorClass}`}><Icon className="w-6 h-6 animate-pulse" /></div>
            <div>
                <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{label}</div>
                <div className="text-2xl font-black text-white">{value}</div>
            </div>
        </div>
    );
};

const BountyDetail = ({ icon: Icon, label, value, isItalic = false }: any) => (
    <div className="flex items-start gap-3">
        <Icon size={16} className="text-cyan-400 mt-1 flex-none" />
        <div>
            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">{label}</div>
            <div className={`text-sm text-gray-200 font-medium ${isItalic ? 'italic' : ''}`}>{`"${value}"`}</div>
        </div>
    </div>
);

const GearItem: React.FC<{ label: string, icon: any, checked: boolean, onToggle: () => void }> = ({ label, icon: Icon, checked, onToggle }) => (
    <button onClick={onToggle} onMouseEnter={() => playSound('hover')} className={`p-4 rounded-2xl border transition-all duration-300 border-box flex flex-col items-center gap-3 group relative overflow-hidden ${checked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
        <div className={`p-2 rounded-xl transition-all duration-300 ${checked ? 'bg-emerald-500 text-black scale-110' : 'bg-gray-800 text-gray-500'}`}><Icon size={20} /></div>
        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${checked ? 'text-emerald-400' : 'text-gray-600'}`}>{label}</span>
        {checked && <CheckCircle2 size={12} className="absolute top-2 right-2 text-emerald-500" />}
    </button>
);
