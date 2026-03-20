
import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Rock } from '../types';
import { ArrowLeft, Trash2, Layers, Zap, Microscope, TrendingUp, Gem, Lock, Dna, Info, Activity, Loader2, ShieldCheck, FileText, Mountain, Compass, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { refineSpecimen } from '../services/geminiService';
import { playSound } from '../services/audioUtils';

const Rock3DViewer = lazy(() => import('./Rock3DModel').then(m => ({ default: m.Rock3DViewer })));

export const RockDetails: React.FC<{ rock: Rock; onBack: () => void; onDelete: (id: string) => void; onUpdateRock: (rock: Rock) => void }> = ({ rock, onBack, onDelete, onUpdateRock }) => {
  const [activeTab, setActiveTab] = useState<'DATA' | 'MSc' | 'REFINE'>('DATA');
  const [isRefining, setIsRefining] = useState(false);

  const handleRefine = async () => {
    if (rock.refinementLevel >= 3) return;
    setIsRefining(true);
    playSound('click', { playbackRate: 1.2 });
    try {
      const updates = await refineSpecimen(rock);
      const updatedRock = { ...rock, ...updates, refinementLevel: rock.refinementLevel + 1 };
      onUpdateRock(updatedRock);
      playSound('success');
      toast.success(`REFINE COMPLETE: LEVEL ${updatedRock.refinementLevel} UNLOCKED`, { icon: '💎' });
    } catch { 
        playSound('error');
        toast.error("Refinement Signal Lost"); 
    }
    finally { setIsRefining(false); }
  };

  return (
    <div className="h-full flex flex-col bg-[#030508] overflow-y-auto no-scrollbar pb-24 relative font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(79,70,229,0.1),transparent_60%)] pointer-events-none" />

      <div className="relative h-[42vh] flex-none overflow-hidden">
         <img src={rock.imageUrl} className="w-full h-full object-cover opacity-30 scale-125 blur-xl absolute" />
         <div className="absolute inset-0 bg-gradient-to-t from-[#030508] via-[#030508]/60 to-transparent" />
         
         <div className="absolute inset-0 p-8 flex flex-col justify-end">
            <button onClick={() => { playSound('click'); onBack(); }} className="absolute top-12 left-6 p-4 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl z-20 active:scale-90 transition-all hover:bg-black/80">
                <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="relative z-10 animate-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] rounded-full border border-indigo-500/30 backdrop-blur-md">
                        {rock.type} Asset
                    </span>
                    <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-[0.4em] rounded-full border border-cyan-500/30 backdrop-blur-md">
                        SIG_LEVEL {rock.refinementLevel}
                    </span>
                </div>
                <h1 className="text-7xl font-black text-white tracking-tighter uppercase italic leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                    {rock.name}
                </h1>
                <p className="text-gray-500 font-mono text-[10px] mt-2 uppercase tracking-widest flex items-center gap-2">
                    <Compass size={10} /> Lat: {rock.location?.lat.toFixed(4) || '??'} / Lng: {rock.location?.lng.toFixed(4) || '??'}
                </p>
            </div>
         </div>
      </div>

      <div className="flex px-6 gap-2 mt-8 overflow-x-auto no-scrollbar">
          <TabBtn active={activeTab === 'DATA'} onClick={() => { playSound('click'); setActiveTab('DATA'); }} label="SPECIMEN" icon={Mountain} />
          <TabBtn active={activeTab === 'MSc'} onClick={() => { playSound('click'); setActiveTab('MSc'); }} label="FIELD REPORT" icon={FileText} />
          <TabBtn active={activeTab === 'REFINE'} onClick={() => { playSound('click'); setActiveTab('REFINE'); }} label="REFINE" icon={Gem} color="indigo" />
      </div>

      <div className="p-6 space-y-6 relative z-10">
        {activeTab === 'DATA' && (
            <div className="animate-in fade-in duration-500 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <DataCard label="Rarity Score" value={`${rock.rarityScore}/100`} icon={Zap} color="purple" />
                    <DataCard label="Market Value" value={`${rock.estimatedValue} CR`} icon={TrendingUp} color="yellow" />
                    <DataCard label="Mohs Scale" value={`${rock.hardness}`} icon={Activity} color="cyan" />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 relative overflow-hidden group">
                    <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity"><Info size={40} /></div>
                    <p className="text-gray-200 text-xl leading-relaxed mb-8 font-medium font-serif italic">
                        "{rock.description}"
                    </p>
                    <div className="h-16 flex items-end gap-1.5 opacity-60">
                        {rock.spectralWaveform.map((v, i) => (
                            <div key={i} className="flex-1 bg-cyan-400/50 rounded-t-sm transition-all duration-300 hover:bg-cyan-300" style={{ height: `${v * 100}%`, animation: `pulse 2s ease-in-out infinite ${i * 0.1}s` }} />
                        ))}
                    </div>
                </div>

                <div className="h-[48vh] bg-black/40 border border-white/5 rounded-[2.5rem] overflow-hidden relative shadow-inner">
                    <Suspense fallback={<div className="h-full flex flex-col items-center justify-center text-cyan-500 font-mono text-[10px] animate-pulse">
                        <Activity className="mb-4 animate-spin-slow" />
                        SYNCHRONIZING_VOXEL_STREAMS...
                    </div>}>
                        <Rock3DViewer modelUrl="https://aistudiocdn.com/assets/rock.glb" rock={rock} />
                    </Suspense>
                </div>
            </div>
        )}

        {activeTab === 'MSc' && (
            <div className="animate-in slide-in-from-right duration-500 space-y-6">
                <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-3xl p-8 relative overflow-hidden curation-glow">
                    <div className="absolute -top-4 -right-4 p-8 opacity-5"><Microscope size={120} /></div>
                    <div className="flex items-center gap-3 mb-6">
                        <Sparkles size={18} className="text-indigo-400 animate-pulse" />
                        <h2 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em]">Clover's MSc Field Report</h2>
                    </div>
                    
                    <div className="space-y-8">
                        <div>
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Activity size={12} className="text-indigo-500" /> Executive Analysis
                            </h4>
                            <p className="text-gray-100 text-lg leading-relaxed font-medium">"{rock.expertExplanation}"</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Petrology</h4>
                                <p className="text-indigo-300 font-mono text-xs uppercase tracking-tighter">{rock.petrology || 'Plutonic / Crystalline'}</p>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Genesis</h4>
                                <p className="text-cyan-300 font-mono text-xs uppercase tracking-tighter">{rock.formationGenesis || 'Slow-cooled hydro'}</p>
                            </div>
                        </div>

                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                             <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Market Insight</h4>
                             <p className="text-gray-400 text-xs italic leading-relaxed">"{rock.marketInsight}"</p>
                        </div>
                    </div>
                </div>
                
                {rock.refinementLevel >= 2 ? (
                    <InsightSection title="Historical Lore" text={rock.geologicalLore!} icon={Dna} color="emerald" />
                ) : (
                    <LockedSection level={2} label="Historical Lore" />
                )}

                {rock.refinementLevel >= 3 ? (
                    <InsightSection title="Molecular Lattice" text={rock.molecularStructure!} icon={Layers} color="purple" />
                ) : (
                    <LockedSection level={3} label="Molecular Geometry" />
                )}
            </div>
        )}

        {activeTab === 'REFINE' && (
            <div className="animate-in zoom-in duration-500 space-y-8 pb-12">
                <div className="text-center space-y-3">
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Signal Refinement</h3>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">Deepen scientific analysis and unlock classified geological data using Field Credits.</p>
                </div>

                <div className="relative flex justify-center py-12">
                   <div className="absolute inset-0 bg-indigo-500/20 blur-[120px] rounded-full" />
                   <div className="relative w-64 h-64 rounded-full border-8 border-dashed border-indigo-500/20 flex items-center justify-center animate-[spin_40s_linear_infinite]">
                        <Gem className="w-24 h-24 text-indigo-400 opacity-80" />
                   </div>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-black text-white italic">{rock.refinementLevel}<span className="text-2xl text-gray-700">/3</span></span>
                        <span className="text-[9px] text-indigo-400 font-black tracking-widest mt-1">UPLINK_STABLE</span>
                   </div>
                </div>

                <div className="space-y-4 px-4">
                    <RefineStep level={1} active={rock.refinementLevel >= 1} label="Spectral Calibration" />
                    <RefineStep level={2} active={rock.refinementLevel >= 2} label="Ancient Lore Recovery" />
                    <RefineStep level={3} active={rock.refinementLevel >= 3} label="Atomic Geometry Sync" />
                </div>

                <div className="pt-6">
                    <button 
                        disabled={isRefining || rock.refinementLevel >= 3} 
                        onClick={handleRefine}
                        className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.5em] text-xs transition-all flex items-center justify-center gap-4 ${rock.refinementLevel >= 3 ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-gradient-to-r from-indigo-600 to-blue-700 text-white shadow-[0_0_50px_rgba(79,70,229,0.3)] hover:scale-[1.03] active:scale-95'}`}
                    >
                        {isRefining ? <Loader2 className="animate-spin" /> : rock.refinementLevel >= 3 ? <ShieldCheck /> : <Zap className="animate-pulse" />}
                        {isRefining ? 'REFRACTING...' : rock.refinementLevel >= 3 ? 'MAX_REFINEMENT_REACHED' : 'EXECUTE_REFINEMENT (500 CR)'}
                    </button>
                </div>
            </div>
        )}

        <div className="mt-12 flex justify-center">
            <button 
                onClick={() => { playSound('click'); onDelete(rock.id); }}
                className="flex items-center gap-3 px-8 py-3 bg-red-900/10 border border-red-500/20 rounded-full text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-black transition-all"
            >
                <Trash2 size={14} /> Purge from Archive
            </button>
        </div>
      </div>
    </div>
  );
};

const TabBtn = ({ active, onClick, label, icon: Icon, color = 'cyan' }: any) => (
    <button onClick={onClick} className={`flex-none px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${active ? `bg-${color}-500 text-black shadow-[0_0_20px_rgba(var(--tw-color-${color}-500),0.4)]` : 'bg-white/5 text-gray-500 border border-white/10'}`}>
        <Icon size={14} /> {label}
    </button>
);

const DataCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] relative overflow-hidden">
        <div className="absolute -bottom-4 -right-4 opacity-5"><Icon size={64} /></div>
        <div className={`flex items-center gap-2 text-${color}-400 mb-2`}>
            <Icon size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</span>
        </div>
        <div className="text-3xl font-black text-white tracking-tighter italic">{value}</div>
    </div>
);

const InsightSection = ({ title, text, icon: Icon, color }: any) => (
    <div className={`bg-${color}-500/5 border border-${color}-500/20 rounded-[2rem] p-8 space-y-4 relative overflow-hidden group`}>
        <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity`}><Icon size={100} /></div>
        <div className={`flex items-center gap-3 text-${color}-400`}>
            <Icon size={20} />
            <h3 className="text-xs font-black uppercase tracking-[0.3em]">{title}</h3>
        </div>
        <p className="text-gray-200 text-base leading-relaxed font-medium">"{text}"</p>
    </div>
);

const LockedSection = ({ level, label }: any) => (
    <div className="bg-white/5 border border-dashed border-white/10 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center space-y-4 grayscale">
        <Lock className="w-10 h-10 text-gray-700" />
        <div>
            <h4 className="text-gray-500 text-xs font-black uppercase tracking-widest">Rank {level} Required</h4>
            <p className="text-[10px] text-gray-700 font-mono mt-2 uppercase tracking-tighter">REFINEMENT_NODE_LOCKED // SYNC_TO_UNLOCK_{label.replace(' ', '_').toUpperCase()}</p>
        </div>
    </div>
);

const RefineStep = ({ level, active, label }: any) => (
    <div className={`flex items-center justify-between p-6 rounded-2xl border transition-all duration-500 ${active ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 shadow-[inset_0_0_20px_rgba(79,70,229,0.1)]' : 'bg-black border-white/5 text-gray-700'}`}>
        <div className="flex items-center gap-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${active ? 'bg-indigo-500 text-black' : 'bg-gray-900 text-gray-800'}`}>{level}</div>
            <span className="text-xs font-bold uppercase tracking-[0.2em]">{label}</span>
        </div>
        {active ? <ShieldCheck size={20} className="text-emerald-500" /> : <div className="w-5 h-5 rounded-full border border-gray-800" />}
    </div>
);
