
import React, { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Music, Battery, Zap, Gauge, Trash2, Smartphone, MonitorSmartphone, Sparkles, Activity, LogOut } from 'lucide-react';
import { playSound } from '../services/audioUtils';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface SettingsPanelProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ volume, onVolumeChange, onClose }) => {
    const [preMuteVolume, setPreMuteVolume] = useState(volume > 0 ? volume : 0.15);
    const [perfMode, setPerfMode] = useState<'BATTERY' | 'BALANCED' | 'MAX'>('BALANCED');
    const [haptics, setHaptics] = useState(true);
    
    // Effect to disable body scroll when the panel is open
    useEffect(() => {
        const originalStyle = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        
        // Load settings
        const savedPerf = localStorage.getItem('sys_perf_mode');
        if (savedPerf) setPerfMode(savedPerf as any);
        const savedHaptics = localStorage.getItem('sys_haptics');
        if (savedHaptics) setHaptics(savedHaptics === 'true');

        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    const handleMuteToggle = () => {
        playSound('click');
        if (volume > 0) {
            setPreMuteVolume(volume);
            onVolumeChange(0);
        } else {
            onVolumeChange(preMuteVolume);
        }
    };
    
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        onVolumeChange(newVolume);
        if (newVolume > 0) {
            setPreMuteVolume(newVolume);
        }
    };

    const toggleHaptics = () => {
        const newVal = !haptics;
        setHaptics(newVal);
        localStorage.setItem('sys_haptics', String(newVal));
        playSound('click');
        if (newVal && navigator.vibrate) navigator.vibrate(50);
    };

    const changePerfMode = (mode: 'BATTERY' | 'BALANCED' | 'MAX') => {
        setPerfMode(mode);
        localStorage.setItem('sys_perf_mode', mode);
        playSound('click');
        toast.success(`Mode Switched: ${mode}`, { icon: mode === 'MAX' ? '🚀' : mode === 'BATTERY' ? '🔋' : '⚖️' });
    };

    const clearCache = async () => {
        playSound('click');
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
            toast.success("System Cache Purged");
        } else {
            toast.error("Cache Access Denied");
        }
    };

    const handleLogout = async () => {
        playSound('click');
        await api.logout();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <style>{`
                .volume-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 100%;
                    height: 6px;
                    background: #1f2937;
                    outline: none;
                    border-radius: 3px;
                }
                .volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    background: #6366f1;
                    cursor: pointer;
                    border-radius: 50%;
                    border: 2px solid #fff;
                    box-shadow: 0 0 10px #6366f1;
                }
            `}</style>
            {/* Modal Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-[#0a0f18] border border-white/10 rounded-3xl shadow-2xl p-6 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Background Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
                
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <h2 className="text-lg font-black text-white uppercase tracking-[0.2em] font-mono flex items-center gap-2">
                        <MonitorSmartphone size={18} className="text-cyan-400" /> RHG_CTRL
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-8 relative z-10">
                    {/* Audio Section */}
                    <div>
                        <label className="flex items-center gap-3 text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">
                            <Music size={14} className="text-indigo-400" /> Audio Output
                        </label>
                        <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-xl p-4">
                            <button onClick={handleMuteToggle} className="p-2 text-gray-400 hover:text-indigo-400 transition-colors">
                                {volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="0.3" 
                                step="0.01"
                                value={volume}
                                onChange={handleSliderChange}
                                className="w-full volume-slider"
                            />
                        </div>
                    </div>

                    {/* Performance Section */}
                    <div>
                        <label className="flex items-center gap-3 text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">
                            <Gauge size={14} className="text-cyan-400" /> Performance Profile
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <button 
                                onClick={() => changePerfMode('BATTERY')} 
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${perfMode === 'BATTERY' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                            >
                                <Battery size={18} className="mb-1" />
                                <span className="text-[8px] font-black uppercase">Saver</span>
                            </button>
                            <button 
                                onClick={() => changePerfMode('BALANCED')} 
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${perfMode === 'BALANCED' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                            >
                                <Zap size={18} className="mb-1" />
                                <span className="text-[8px] font-black uppercase">Balanced</span>
                            </button>
                            <button 
                                onClick={() => changePerfMode('MAX')} 
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${perfMode === 'MAX' ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/5 border-white/5 text-gray-500'}`}
                            >
                                <Gauge size={18} className="mb-1" />
                                <span className="text-[8px] font-black uppercase">Max FX</span>
                            </button>
                        </div>
                    </div>

                    {/* Haptics & Cache */}
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={toggleHaptics} 
                            className={`p-4 rounded-xl border flex items-center justify-between transition-all ${haptics ? 'bg-white/10 border-cyan-500/50 text-white' : 'bg-white/5 border-white/5 text-gray-500'}`}
                        >
                            <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Smartphone size={14} /> Haptics</span>
                            <div className={`w-2 h-2 rounded-full ${haptics ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-gray-700'}`} />
                        </button>
                        <button 
                            onClick={clearCache} 
                            className="p-4 rounded-xl border bg-red-900/10 border-red-500/20 text-red-400 hover:bg-red-900/30 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Purge Cache</span>
                        </button>
                    </div>

                    {/* Resources Section */}
                    <div className="pt-4 border-t border-white/5">
                        <label className="flex items-center gap-3 text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">
                            <Sparkles size={14} className="text-cyan-400" /> External Intel
                        </label>
                        <a 
                            href="https://rockhoundgo.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all group"
                        >
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Official Archive</span>
                            <Zap size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                        </a>
                        <a 
                            href="https://rockhoundgo.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all group mt-3"
                        >
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Join the Community</span>
                            <Activity size={14} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                        </a>
                    </div>

                    <button 
                        onClick={handleLogout} 
                        className="w-full py-4 rounded-xl border bg-red-900/10 border-red-500/20 text-red-400 hover:bg-red-900/30 transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Terminate Neural Link</span>
                    </button>
                </div>

                 <p className="text-center text-[9px] text-gray-700 font-mono mt-8 uppercase tracking-widest">
                    ROCKHOUND-GO OS v4.5 // BUILD 2026.03.20
                </p>
            </div>
        </div>
    );
};
