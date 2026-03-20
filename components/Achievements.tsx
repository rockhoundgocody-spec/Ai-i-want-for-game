
import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Rock, RockType, Achievement } from '../types';
import { User } from '../services/api';
import { Gem, Compass, Sprout, BarChart2, Microscope, Shield, Star, Award, Mountain, Crown, Lock, Unlock, Trophy, Zap, Scan, Hexagon, Handshake, ShieldCheck } from 'lucide-react';

// -- AUDIO ENGINE (Local) --
const useHoverSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const playHover = useCallback(() => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Sci-fi chirp
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }, []);

  return playHover;
};

// -- TYPES & DATA --
const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_find',
    title: 'First Find',
    description: 'Identify your very first rock.',
    icon: Sprout,
    xpReward: 50,
    goal: 1,
    progress: (user, rocks) => rocks.length,
  },
  {
    id: 'prepared_geologist',
    title: 'Prepared Geologist',
    description: 'Verify all safety gear before a field trip.',
    icon: ShieldCheck,
    xpReward: 100,
    goal: 1,
    progress: (user) => (localStorage.getItem('gear_verified_count') ? parseInt(localStorage.getItem('gear_verified_count')!) : 0),
  },
  {
    id: 'diplomat',
    title: 'Rockhound Diplomat',
    description: 'Secure legal permission to scout private land.',
    icon: Handshake,
    xpReward: 200,
    goal: 1,
    progress: (user) => (localStorage.getItem('diplomat_unlocked') ? 1 : 0),
  },
  {
    id: 'collector_1',
    title: 'Novice Collector',
    description: 'Collect 10 different specimens.',
    icon: Award,
    xpReward: 100,
    goal: 10,
    progress: (user, rocks) => rocks.length,
  },
  {
    id: 'collector_2',
    title: 'Adept Collector',
    description: 'Collect 50 different specimens.',
    icon: Star,
    xpReward: 500,
    goal: 50,
    progress: (user, rocks) => rocks.length,
  },
  {
    id: 'geologist_1',
    title: 'Geologist in Training',
    description: 'Reach Level 5.',
    icon: BarChart2,
    xpReward: 250,
    goal: 5,
    progress: (user) => user.level,
  },
  {
    id: 'geologist_2',
    title: 'Senior Geologist',
    description: 'Reach Level 10.',
    icon: Crown,
    xpReward: 1000,
    goal: 10,
    progress: (user) => user.level,
  },
  {
    id: 'igneous_expert',
    title: 'Igneous Investigator',
    description: 'Identify 5 Igneous rocks.',
    icon: Mountain,
    xpReward: 150,
    goal: 5,
    progress: (user, rocks) => rocks.filter(r => r.type === RockType.IGNEOUS).length,
  },
  {
    id: 'sedimentary_expert',
    title: 'Sedimentary Sleuth',
    description: 'Identify 5 Sedimentary rocks.',
    icon: Compass,
    xpReward: 150,
    goal: 5,
    progress: (user, rocks) => rocks.filter(r => r.type === RockType.SEDIMENTARY).length,
  },
  {
    id: 'metamorphic_expert',
    title: 'Metamorphic Master',
    description: 'Identify 5 Metamorphic rocks.',
    icon: Shield,
    xpReward: 150,
    goal: 5,
    progress: (user, rocks) => rocks.filter(r => r.type === RockType.METAMORPHIC).length,
  },
  {
    id: 'mineral_expert',
    title: 'Mineral Maven',
    description: 'Identify 10 Minerals.',
    icon: Microscope,
    xpReward: 150,
    goal: 10,
    progress: (user, rocks) => rocks.filter(r => r.type === RockType.MINERAL).length,
  },
  {
    id: 'high_roller',
    title: 'High Roller',
    description: 'Find a specimen with rarity over 75.',
    icon: Gem,
    xpReward: 200,
    goal: 1,
    progress: (user, rocks) => rocks.filter(r => r.rarityScore > 75).length,
  },
];

interface AchievementsProps {
  user: User;
  rocks: Rock[];
}

export const Achievements: React.FC<AchievementsProps> = ({ user, rocks }) => {
  const playHover = useHoverSound();

  const processedAchievements = useMemo(() => {
    return ALL_ACHIEVEMENTS.map(ach => {
      const currentProgress = ach.progress(user, rocks);
      const isCompleted = currentProgress >= ach.goal;
      const progressPercent = Math.min(100, (currentProgress / ach.goal) * 100);
      return { ...ach, currentProgress, isCompleted, progressPercent };
    }).sort((a, b) => {
      // Sort: Completed first, then by highest progress
      if (a.isCompleted && !b.isCompleted) return -1;
      if (!a.isCompleted && b.isCompleted) return 1;
      return b.progressPercent - a.progressPercent;
    });
  }, [user, rocks]);

  const totalXP = processedAchievements.reduce((acc, curr) => curr.isCompleted ? acc + curr.xpReward : acc, 0);
  const completionCount = processedAchievements.filter(a => a.isCompleted).length;
  const totalCount = processedAchievements.length;
  const completionPercent = (completionCount / totalCount) * 100;

  return (
    <div className="h-full bg-[#030508] p-6 overflow-y-auto no-scrollbar pb-24 relative">
      <style>{`
        @keyframes scan-glitch { 0% { clip-path: inset(0 0 0 0); } 5% { clip-path: inset(10% 0 80% 0); } 10% { clip-path: inset(0 0 0 0); } }
        @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.3); opacity: 0; } }
        .ach-card { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); transform-style: preserve-3d; perspective: 1000px; }
        .ach-card:hover { transform: translateY(-5px) scale(1.02); z-index: 10; }
        .neon-glow { box-shadow: 0 0 15px rgba(6, 182, 212, 0.15); }
      `}</style>
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header / Operator Dashboard */}
      <div className="relative mb-8 p-6 rounded-2xl border border-white/10 bg-gray-900/40 backdrop-blur-xl overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-500/10 opacity-50" />
        <div className="relative z-10 flex items-center justify-between">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-widest font-mono flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-400" />
                    OPERATOR_LOG
                </h2>
                <div className="flex gap-4 mt-2 text-xs font-mono text-cyan-400/80">
                    <span className="flex items-center gap-1"><Scan size={12} /> SYNC: ACTIVE</span>
                    <span className="flex items-center gap-1"><Zap size={12} /> XP YIELD: {totalXP}</span>
                </div>
            </div>
            
            <div className="text-right">
                <div className="text-4xl font-bold text-white tracking-tighter">{completionCount}<span className="text-lg text-gray-500">/{totalCount}</span></div>
                <div className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">Modules Online</div>
            </div>
        </div>
        
        {/* Global Progress Bar */}
        <div className="mt-6 h-2 bg-gray-800 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gray-800 w-full h-full" />
            <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 relative"
                style={{ width: `${completionPercent}%`, transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            >
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] animate-pulse" />
            </div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {processedAchievements.map((ach) => (
          <AchievementCard key={ach.id} achievement={ach} onHover={playHover} />
        ))}
      </div>
    </div>
  );
};

// -- MICRO COMPONENT: 3D CARD --
const AchievementCard: React.FC<{ achievement: any; onHover: () => void }> = ({ achievement, onHover }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState('');

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -5; // Max 5 deg tilt
        const rotateY = ((x - centerX) / centerX) * 5;

        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    };

    const handleMouseLeave = () => {
        setTransform('');
    };

    const isCompleted = achievement.isCompleted;

    return (
        <div 
            ref={cardRef}
            onMouseEnter={onHover}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`ach-card relative p-5 rounded-2xl border transition-all duration-300 overflow-hidden group cursor-default`}
            style={{ 
                transform: transform,
                borderColor: isCompleted ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                background: isCompleted ? 'linear-gradient(145deg, rgba(6, 78, 59, 0.4) 0%, rgba(17, 24, 39, 0.8) 100%)' : 'rgba(17, 24, 39, 0.6)',
                boxShadow: isCompleted ? '0 10px 30px -10px rgba(16, 185, 129, 0.2)' : 'none'
            }}
        >
            {/* Holographic Sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            {/* Status Indicator Line */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-gray-800'}`} />

            <div className="flex items-start gap-4 pl-2">
                {/* Icon Hexagon */}
                <div className="relative flex-none">
                    <Hexagon 
                        className={`w-14 h-14 ${isCompleted ? 'text-emerald-500/20 fill-emerald-500/10' : 'text-gray-700 fill-gray-900'} transition-colors`} 
                        strokeWidth={1}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <achievement.icon className={`w-6 h-6 ${isCompleted ? 'text-emerald-400 drop-shadow-[0_0_5px_#10b981]' : 'text-gray-500'}`} />
                    </div>
                    {isCompleted && (
                        <div className="absolute inset-0 animate-[pulse-ring_2s_infinite]">
                            <Hexagon className="w-14 h-14 text-emerald-400 opacity-50" strokeWidth={1} />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className={`font-bold text-sm tracking-wide ${isCompleted ? 'text-white' : 'text-gray-400'}`}>
                            {achievement.title}
                        </h3>
                        {isCompleted ? (
                             <Unlock className="w-3 h-3 text-emerald-500 flex-none" />
                        ) : (
                             <Lock className="w-3 h-3 text-gray-600 flex-none" />
                        )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                        {achievement.description}
                    </p>

                    {/* Progress Bar & Reward */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end text-[10px] font-mono uppercase">
                            <span className={isCompleted ? 'text-emerald-400' : 'text-gray-500'}>
                                {isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
                            </span>
                            <span className="text-indigo-400">+{achievement.xpReward} XP</span>
                        </div>
                        
                        <div className="h-1.5 w-full bg-gray-800 rounded-sm overflow-hidden relative">
                            {/* Animated Striped Background for bar */}
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg,transparent 25%,rgba(255,255,255,0.5) 25%,rgba(255,255,255,0.5) 50%,transparent 50%,transparent 75%,rgba(255,255,255,0.5) 75%,rgba(255,255,255,0.5))', backgroundSize: '4px 4px' }} />
                            
                            <div 
                                className={`h-full relative transition-all duration-1000 ${isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-indigo-600'}`}
                                style={{ width: `${achievement.progressPercent}%` }}
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50" />
                            </div>
                        </div>
                        
                        <div className="text-[9px] text-gray-600 text-right">
                            {achievement.currentProgress} / {achievement.goal}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
