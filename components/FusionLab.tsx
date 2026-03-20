
import React, { useState, useCallback, useRef } from 'react';
import { Rock, RockType } from '../types';
import { Zap, Beaker, ArrowRight, Loader2, Sparkles, X, Activity, Cpu, ShieldCheck, Database, Atom } from 'lucide-react';
import { fuseSpecimens } from '../services/geminiService';
import toast from 'react-hot-toast';

interface FusionLabProps {
    rocks: Rock[];
    onBack: () => void;
    onFused: (newRock: Rock) => void;
}

export const FusionLab: React.FC<FusionLabProps> = ({ rocks, onBack, onFused }) => {
    const [selectedA, setSelectedA] = useState<Rock | null>(null);
    const [selectedB, setSelectedB] = useState<Rock | null>(null);
    const [isFusing, setIsFusing] = useState(false);
    const [fusionProgress, setFusionProgress] = useState(0);

    const handleFuse = async () => {
        if (!selectedA || !selectedB) return;
        setIsFusing(true);
        setFusionProgress(0);

        const interval = setInterval(() => {
            setFusionProgress(p => p >= 98 ? 98 : p + 2);
        }, 100);

        try {
            const analysis = await fuseSpecimens(selectedA, selectedB);
            const newRock: Rock = {
                ...analysis,
                id: crypto.randomUUID(),
                userId: selectedA.userId,
                dateFound: Date.now(),
                imageUrl: selectedA.imageUrl, // Hybrid image synthesis could be future work
                status: 'approved',
                fusionData: {
                    parentAId: selectedA.id,
                    parentBId: selectedB.id,
                    fusionStability: 0.9 + Math.random() * 0.1,
                    fusionDate: Date.now()
                }
            };
            clearInterval(interval);
            setFusionProgress(100);
            setTimeout(() => {
                onFused(newRock);
                toast.success("MOLECULAR SYNTHESIS COMPLETE", { icon: '🧬' });
            }, 500);
        } catch (e) {
            toast.error("Synthesis Destabilized");
            setIsFusing(false);
            clearInterval(interval);
        }
    };

    return (
        <div className="h-full bg-[#050a10] flex flex-col font-sans overflow-hidden">
            <style>{`
                @keyframes orbit-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse-ring { 0% { transform: scale(0.9); opacity: 0.1; } 50% { transform: scale(1.1); opacity: 0.3; } 100% { transform: scale(0.9); opacity: 0.1; } }
                .fusion-gradient { background: radial-gradient(circle at center, rgba(129, 140, 248, 0.2), transparent 70%); }
            `}</style>

            <header className="p-6 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400">
                        <X size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Atom className="text-indigo-400 animate-spin-slow" /> Fusion Lab
                        </h2>
                        <p className="text-[9px] text-gray-500 font-mono tracking-tighter">MOLECULAR_SYNTHESIS_v1.2</p>
                    </div>
                </div>
                <div className="bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/30">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Stability: 99.4%</span>
                </div>
            </header>

            <div className="flex-1 relative overflow-y-auto no-scrollbar p-6">
                <div className="absolute inset-0 fusion-gradient pointer-events-none" />
                
                {/* Visual Synthesis Chamber */}
                <div className="relative h-64 mb-12 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <div className="w-48 h-48 border border-dashed border-indigo-400 rounded-full animate-[orbit-slow_15s_linear_infinite]" />
                        <div className="absolute w-64 h-64 border border-indigo-400/20 rounded-full animate-pulse-ring" />
                    </div>

                    <div className="flex items-center gap-12 relative z-10">
                        <FusionSlot rock={selectedA} onClear={() => setSelectedA(null)} />
                        <div className="flex flex-col items-center">
                            <Zap size={32} className={`transition-all duration-1000 ${selectedA && selectedB ? 'text-yellow-400 animate-pulse' : 'text-gray-800'}`} />
                            {isFusing && <span className="text-[10px] font-black text-indigo-400 mt-2 animate-pulse">{fusionProgress}%</span>}
                        </div>
                        <FusionSlot rock={selectedB} onClear={() => setSelectedB(null)} />
                    </div>
                </div>

                {isFusing ? (
                    <div className="max-w-md mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
                         <div className="text-center">
                            <h3 className="text-2xl font-black text-white tracking-tighter mb-2">RESTRUCTURING LATTICE...</h3>
                            <p className="text-gray-500 text-xs uppercase tracking-widest">Colliding particles at 0.4c</p>
                         </div>
                         <div className="h-2 w-full bg-gray-950 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-indigo-500 shadow-[0_0_15px_#6366f1]" style={{ width: `${fusionProgress}%` }} />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center gap-2">
                                <Activity className="text-indigo-400 animate-pulse" size={20} />
                                <span className="text-[8px] text-gray-500 uppercase">Entropy</span>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center gap-2">
                                <Cpu className="text-indigo-400 animate-spin-slow" size={20} />
                                <span className="text-[8px] text-gray-500 uppercase">Compute</span>
                            </div>
                         </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {rocks.filter(r => r.id !== selectedA?.id && r.id !== selectedB?.id).map(rock => (
                            <button 
                                key={rock.id}
                                onClick={() => !selectedA ? setSelectedA(rock) : !selectedB ? setSelectedB(rock) : null}
                                className="relative aspect-square rounded-3xl bg-[#0a0f18]/60 border border-white/5 overflow-hidden group active:scale-95 transition-all"
                            >
                                <img src={rock.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="absolute bottom-4 left-4">
                                    <p className="text-[9px] font-black text-white uppercase tracking-widest">{rock.name}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-8 bg-black/60 border-t border-white/5 backdrop-blur-3xl">
                <button 
                    disabled={!selectedA || !selectedB || isFusing}
                    onClick={handleFuse}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.4em] text-sm transition-all flex items-center justify-center gap-3
                        ${selectedA && selectedB 
                            ? 'bg-indigo-600 text-white shadow-[0_0_40px_rgba(99,102,241,0.4)]' 
                            : 'bg-gray-900 text-gray-600 border border-white/5 cursor-not-allowed'
                        }`}
                >
                    {isFusing ? <Loader2 className="animate-spin" /> : <Beaker size={20} />}
                    {isFusing ? 'SYNTHESIZING...' : 'INITIATE_FUSION'}
                </button>
            </div>
        </div>
    );
};

const FusionSlot = ({ rock, onClear }: any) => (
    <div className="w-32 h-32 rounded-3xl border-2 border-dashed border-indigo-500/20 bg-black/40 relative flex items-center justify-center group overflow-hidden">
        {rock ? (
            <>
                <img src={rock.imageUrl} className="w-full h-full object-cover animate-in zoom-in duration-300" />
                <button onClick={onClear} className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} />
                </button>
            </>
        ) : (
            <div className="flex flex-col items-center gap-2 opacity-20">
                <Database size={24} className="text-indigo-400" />
                <span className="text-[8px] font-black uppercase tracking-widest">Select Asset</span>
            </div>
        )}
    </div>
);
