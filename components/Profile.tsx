import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { User, api } from '../services/api';
import { Rock } from '../types';
import { Camera, Edit2, Save, X, User as UserIcon, Mail, Calendar, Upload, PlayCircle, Shield, Award, Zap, Activity, Microscope, PackageSearch, Sparkles, Scale, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { playSound } from '../services/audioUtils';

interface ProfileProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
  onReplayIntro?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, onBack, onReplayIntro }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ username: user.username, email: user.email });
  const [rocks, setRocks] = useState<Rock[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  useEffect(() => {
    api.getRocks().then(setRocks);
  }, []);

  // Clover's Curated Insights
  const curatorNote = useMemo(() => {
    if (!rocks.length) return "Your archive is currently empty. Start scanning specimens to unlock geological curation advice.";
    
    const hardnessSet = new Set(rocks.map(r => Math.round(r.hardness)));
    const targetHardness = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find(h => !hardnessSet.has(h));
    
    const hasPyrite = rocks.some(r => r.name.toLowerCase().includes('pyrite'));
    const uniqueTypes = new Set(rocks.map(r => r.type));

    let advice = `Collection analysis complete, ${user.username}. `;
    
    if (targetHardness) {
       advice += `You're tracking the 'Mohs Hardness Scale'. You've logged Hardness ${Array.from(hardnessSet).join(', ')}. Try to find a ${targetHardness === 1 ? 'Talc' : targetHardness === 10 ? 'Diamond' : targetHardness === 8 ? 'Topaz' : 'specimen with hardness ' + targetHardness} next. `;
    }

    if (uniqueTypes.size >= 3) {
       advice += "Excellent variety in Rock Origins—you have igneous, sedimentary, and metamorphic assets. ";
    }

    if (hasPyrite) {
       advice += "Preservation alert: Your Pyrite is geochemically sensitive. Keep it in a dry, sealed container to prevent 'pyrite decay' which can form sulfuric acid.";
    }
    return advice;
  }, [rocks, user.username]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 20;
    const y = -(e.clientY - rect.top - rect.height / 2) / 20;
    setRotate({ x: y, y: x });
  };

  const handleMouseLeave = () => setRotate({ x: 0, y: 0 });

  const handleSave = async () => {
    if (!formData.username.trim() || !formData.email.trim()) { toast.error("Fields required"); return; }
    setIsSaving(true); playSound('click');
    try {
      const updated = await api.updateProfile(formData);
      onUpdateUser(updated); setIsEditing(false); playSound('success');
      toast.success("Identity updated!");
    } catch (e: any) { toast.error(e.message); } finally { setIsSaving(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const updated = await api.updateProfile({ avatarUrl: base64 });
          onUpdateUser(updated); playSound('success');
          toast.success("Avatar updated!");
        } catch { toast.error("Update failed"); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    playSound('click');
    await api.logout();
    onBack();
  };

  return (
    <div className="h-full flex flex-col bg-[#050a10] overflow-y-auto no-scrollbar relative font-sans perspective-1000 pb-20">
      <style>{`
        .bg-hex-grid { background-image: radial-gradient(rgba(99,102,241,0.1) 2px, transparent 2px); background-size: 30px 30px; }
        .curation-glow { box-shadow: 0 0 20px rgba(16, 185, 129, 0.1); }
      `}</style>
      
      <div className="absolute inset-0 bg-hex-grid pointer-events-none opacity-30" />

      <div className="relative z-20 flex items-center justify-between p-6">
        <h2 className="text-2xl font-bold text-white tracking-widest font-mono flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-500" /> OPERATOR_ID
        </h2>
        <button onClick={() => { playSound('click'); onBack(); }} className="p-2 rounded-full text-gray-400 hover:text-white transition-colors border border-transparent hover:border-white/10"><X className="w-6 h-6" /></button>
      </div>

      <div className="flex-none flex items-center justify-center p-6 relative z-10">
        <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="w-full max-w-sm bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-1 shadow-2xl transition-transform duration-100" style={{ transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)` }}>
            <div className="bg-[#0a0f18] rounded-[1.3rem] overflow-hidden relative border border-white/5">
                <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-800 relative">
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0f18] to-transparent" />
                </div>
                <div className="relative -mt-16 flex justify-center z-10">
                    <div onClick={() => { playSound('click'); fileInputRef.current?.click(); }} className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-br from-cyan-400 to-indigo-600 cursor-pointer shadow-lg shadow-indigo-500/30">
                        <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 relative border-4 border-[#0a0f18]">
                            {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white font-bold text-3xl">{user.username[0]}</div>}
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                <div className="text-center mt-4 px-6 pb-8">
                    <h1 className="text-2xl font-bold text-white tracking-wide">{user.username}</h1>
                    <p className="text-xs text-indigo-400 font-mono tracking-widest uppercase mt-1">Class {Math.ceil(user.level / 5)} Operative</p>
                    <div className="grid grid-cols-3 gap-4 mt-8">
                        <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <Award className="w-5 h-5 text-yellow-400 mb-1" />
                            <span className="text-lg font-bold text-white">{user.level}</span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider">Rank</span>
                        </div>
                        <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <Zap className="w-5 h-5 text-cyan-400 mb-1" />
                            <span className="text-lg font-bold text-white">{user.xp}</span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider">XP</span>
                        </div>
                        <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <Activity className="w-5 h-5 text-emerald-400 mb-1" />
                            <span className="text-lg font-bold text-white">ACTIVE</span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider">Status</span>
                        </div>
                    </div>
                    <div className="mt-8 space-y-4 text-left">
                        <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} disabled={!isEditing} className={`w-full bg-black/40 border ${isEditing ? 'border-indigo-500/50' : 'border-white/5'} rounded-xl py-3 px-4 text-sm text-white outline-none`} />
                        <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={!isEditing} className={`w-full bg-black/40 border ${isEditing ? 'border-indigo-500/50' : 'border-white/5'} rounded-xl py-3 px-4 text-sm text-white outline-none`} />
                    </div>
                    <div className="mt-8 flex gap-3">
                        {!isEditing ? <button onClick={() => setIsEditing(true)} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-all">Modify Data</button> : <><button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-red-900/20 text-red-400 rounded-xl text-xs font-bold uppercase">Cancel</button><button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase">Save</button></>}
                    </div>
                    <button onClick={handleLogout} className="w-full py-3 bg-red-900/20 text-red-400 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 mt-4">
                        <LogOut size={14} /> Terminate Session
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Clover's Collection Curation */}
      <div className="px-6 mt-6">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden curation-glow">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Microscope size={80} /></div>
              <div className="flex items-center gap-3 mb-4">
                  <Sparkles size={16} className="text-emerald-400 animate-pulse" />
                  <h2 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">Clover's Curated Insights</h2>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed font-sans italic">"{curatorNote}"</p>
              <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg"><Scale size={14} className="text-emerald-400" /></div>
                    <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Hardness Scaling: Active</span>
                  </div>
                  <div className="text-[9px] text-emerald-400/60 font-mono">MSc_LEVEL_GUIDANCE</div>
              </div>
          </div>
      </div>
    </div>
  );
};