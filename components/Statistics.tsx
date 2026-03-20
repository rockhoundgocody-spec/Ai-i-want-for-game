import React, { useMemo, useCallback, useState, useRef } from 'react';
import { Rock, RockType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Sector } from 'recharts';
import { Trophy, Award, Star, Activity, PieChart as PieIcon, BarChart3, Zap } from 'lucide-react';
import { playSound } from '../services/audioUtils';

interface StatisticsProps {
  rocks: Rock[];
}

const COLORS = {
  [RockType.IGNEOUS]: '#ef4444', 
  [RockType.SEDIMENTARY]: '#eab308', 
  [RockType.METAMORPHIC]: '#a855f7', 
  [RockType.MINERAL]: '#3b82f6', 
  [RockType.FOSSIL]: '#10b981', 
  [RockType.UNKNOWN]: '#6b7280', 
};

// Custom Active Shape for Pie Chart (Holographic Expansion)
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="#fff" className="text-xl font-bold font-mono tracking-widest">
        {(percent * 100).toFixed(0)}%
      </text>
      <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#9ca3af" className="text-[10px] uppercase font-mono tracking-wider">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
    </g>
  );
};

export const Statistics: React.FC<StatisticsProps> = ({ rocks }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
    playSound('hover');
  };

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    rocks.forEach(r => counts[r.type] = (counts[r.type] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [rocks]);

  const rarityData = useMemo(() => {
    const bins = [
        { name: 'CMN', fullName: 'Common', range: [0, 40], count: 0 },
        { name: 'UNC', fullName: 'Uncommon', range: [41, 70], count: 0 },
        { name: 'RAR', fullName: 'Rare', range: [71, 90], count: 0 },
        { name: 'LEG', fullName: 'Legendary', range: [91, 100], count: 0 },
    ];
    rocks.forEach(r => {
        const bin = bins.find(b => r.rarityScore >= b.range[0] && r.rarityScore <= b.range[1]);
        if (bin) bin.count++;
    });
    return bins;
  }, [rocks]);

  const stats = useMemo(() => {
      const total = rocks.length;
      const avgRarity = total > 0 ? Math.round(rocks.reduce((acc, r) => acc + r.rarityScore, 0) / total) : 0;
      const rarest = rocks.length > 0 ? rocks.reduce((prev, current) => (prev.rarityScore > current.rarityScore) ? prev : current) : null;
      return { total, avgRarity, rarest };
  }, [rocks]);

  if (rocks.length === 0) {
      return (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-4">
              <div className="w-24 h-24 rounded-full border border-gray-700 flex items-center justify-center animate-pulse">
                  <Activity className="w-10 h-10 text-gray-600" />
              </div>
              <p className="font-mono text-xs uppercase tracking-widest">AWAITING INPUT DATA...</p>
          </div>
      );
  }

  return (
    <div className="h-full p-6 space-y-6 overflow-y-auto no-scrollbar pb-24 bg-[#030508] relative">
       {/* Background Grid */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none z-0" />

       {/* Header */}
       <div className="relative z-10 flex items-center gap-3 mb-6">
           <div className="p-2 bg-indigo-500/10 rounded border border-indigo-500/30">
               <BarChart3 className="w-5 h-5 text-indigo-400" />
           </div>
           <div>
               <h2 className="text-xl font-bold text-white tracking-widest font-mono uppercase">Performance Analytics</h2>
               <div className="h-0.5 w-24 bg-gradient-to-r from-indigo-500 to-transparent mt-1" />
           </div>
       </div>

       {/* --- COMMAND METRICS --- */}
       <div className="grid grid-cols-3 gap-3 relative z-10">
            <MetricCard 
                label="COLLECTED" 
                value={stats.total.toString()} 
                sub="UNITS"
                icon={<Trophy className="w-4 h-4 text-cyan-400" />} 
                color="cyan"
            />
            <MetricCard 
                label="AVG. RARITY" 
                value={stats.avgRarity.toString()} 
                sub="SCORE"
                icon={<Activity className="w-4 h-4 text-purple-400" />} 
                color="purple"
            />
            <MetricCard 
                label="RANK" 
                value={`${Math.floor(stats.total / 5) + 1}`} 
                sub="LEVEL"
                icon={<Award className="w-4 h-4 text-emerald-400" />} 
                color="emerald"
            />
       </div>

       {/* --- SECTOR SCAN (Pie Chart) --- */}
       <div className="bg-[#0a0f18]/80 backdrop-blur-md rounded-2xl p-1 border border-white/5 relative z-10 overflow-hidden group">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <PieIcon size={12} className="text-cyan-500" /> Composition Analysis
                </h3>
                <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className={`w-1 h-1 rounded-full bg-cyan-500/50 animate-pulse`} style={{ animationDelay: `${i * 0.2}s`}} />)}
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center p-4 gap-6">
                <div className="h-56 w-full md:w-1/2 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                {...{ activeIndex } as any}
                                activeShape={renderActiveShape}
                                data={typeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={4}
                                dataKey="value"
                                onMouseEnter={onPieEnter}
                                stroke="none"
                            >
                                {typeData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={COLORS[entry.name as RockType] || '#8884d8'} 
                                        className="transition-all duration-300 hover:opacity-80"
                                        stroke="rgba(0,0,0,0.5)"
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Rotating Rings Background */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="w-32 h-32 border border-dashed border-cyan-500 rounded-full animate-[spin_20s_linear_infinite]" />
                        <div className="absolute w-40 h-40 border border-white/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                    {typeData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/5">
                            <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: COLORS[entry.name as RockType] || '#8884d8', color: COLORS[entry.name as RockType] || '#8884d8' }} />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wide">{entry.name}</span>
                                <span className="text-[8px] text-gray-500 font-mono">{((entry.value / stats.total) * 100).toFixed(0)}% SHARE</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
       </div>

       {/* --- SPECTRUM ANALYZER (Bar Chart) --- */}
       <div className="bg-[#0a0f18]/80 backdrop-blur-md rounded-2xl p-1 border border-white/5 relative z-10">
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={12} className="text-purple-500" /> Rarity Spectrum
                </h3>
            </div>
            
            <div className="h-48 w-full p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rarityData}>
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.3}/>
                            </linearGradient>
                        </defs>
                        <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'monospace' }} 
                            axisLine={false} 
                            tickLine={false} 
                        />
                        <YAxis hide />
                        <Tooltip 
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                return (
                                    <div className="bg-[#111827] border border-white/10 p-2 rounded shadow-xl">
                                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide">{payload[0].payload.fullName}</p>
                                        <p className="text-lg font-mono text-white">{payload[0].value} UNITS</p>
                                    </div>
                                );
                                }
                                return null;
                            }}
                        />
                        <Bar 
                            dataKey="count" 
                            fill="url(#barGradient)" 
                            radius={[4, 4, 0, 0]} 
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
       </div>

       {/* --- LEGENDARY ARTIFACT --- */}
       {stats.rarest && (
            <div className="relative group perspective-1000">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/20 via-orange-600/10 to-transparent blur-md rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-gradient-to-r from-[#1a1305] to-[#0a0f18] border border-yellow-500/30 rounded-2xl p-5 flex items-center gap-5 overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]">
                    
                    {/* Glowing Scanner Effect */}
                    <div className="absolute top-0 left-0 w-[200%] h-full bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent -skew-x-12 translate-x-[-100%] animate-[shimmer_3s_infinite]" />

                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-none border-2 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3)] relative">
                        <img src={stats.rarest.imageUrl} alt={stats.rarest.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <Star className="absolute bottom-1 right-1 w-4 h-4 text-yellow-400 fill-yellow-400 animate-pulse" />
                    </div>
                    
                    <div className="flex-1 z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            <div className="text-[9px] text-yellow-500 font-bold uppercase tracking-[0.2em]">Top Discovery</div>
                        </div>
                        <div className="font-bold text-white text-xl tracking-tight mb-1 font-sans">{stats.rarest.name}</div>
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 shadow-[0_0_10px_#eab308]" style={{ width: `${stats.rarest.rarityScore}%` }} />
                            </div>
                            <span className="text-xs font-mono text-yellow-200">{stats.rarest.rarityScore} PTS</span>
                        </div>
                    </div>
                </div>
            </div>
       )}
    </div>
  );
};

// -- MICRO COMPONENT: METRIC CARD --
const MetricCard: React.FC<{ label: string; value: string; sub: string; icon: React.ReactNode; color: string }> = ({ label, value, sub, icon, color }) => {
    const colors: any = {
        cyan: 'text-cyan-400 border-cyan-500/30 from-cyan-500/10',
        purple: 'text-purple-400 border-purple-500/30 from-purple-500/10',
        emerald: 'text-emerald-400 border-emerald-500/30 from-emerald-500/10',
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} to-transparent bg-[#0a0f18] p-4 rounded-xl border relative overflow-hidden group`}>
            <div className="flex justify-between items-start mb-2">
                <div className={`p-1.5 rounded-lg bg-black/40 border border-white/5`}>{icon}</div>
                <div className={`text-[9px] font-mono text-gray-500 uppercase tracking-widest`}>{sub}</div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tighter group-hover:scale-110 transition-transform origin-left">{value}</div>
            <div className={`text-[9px] uppercase font-bold tracking-wider opacity-70 mt-1`}>{label}</div>
        </div>
    );
};