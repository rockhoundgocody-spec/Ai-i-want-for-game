
import React, { useState, useRef } from 'react';
import { Sparkles, Image as ImageIcon, Film, Edit3, Loader2, Download, Zap, Maximize, AlertCircle, Share2, Upload, X } from 'lucide-react';
import { generateHighResImage, generateVeoVideo, editSpecimenImage } from '../services/geminiService';
import { playSound } from '../services/audioUtils';
import toast from 'react-hot-toast';

export const AILab: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'GEN' | 'VIDEO' | 'EDIT'>('GEN');
    const [prompt, setPrompt] = useState('');
    const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
    const [aspect, setAspect] = useState<'16:9' | '9:16'>('16:9');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    
    const [sourceImage, setSourceImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const checkAndProceedWithKey = async () => {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            toast.loading("Opening Key Selection Dialog...", { duration: 3000 });
            await (window as any).aistudio.openSelectKey();
        }
        // Always return true to allow race-condition-safe progression as per guidelines
        return true;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSourceImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        if (activeTab === 'EDIT' && !sourceImage) {
            toast.error("Please provide a source specimen for editing.");
            return;
        }

        setIsLoading(true); 
        playSound('warp');
        
        try {
            await checkAndProceedWithKey();

            let url = "";
            if (activeTab === 'GEN') {
                url = await generateHighResImage(prompt, size);
            } else if (activeTab === 'VIDEO') {
                url = await generateVeoVideo(prompt, undefined, aspect);
            } else if (activeTab === 'EDIT' && sourceImage) {
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(sourceImage);
                });
                url = await editSpecimenImage(base64, prompt);
            }
            
            setResult(url);
            toast.success("Artifact synthesized!");
        } catch (e: any) {
            console.error(e);
            if (e.message?.includes("Requested entity was not found")) {
                toast.error("API Key expired or invalid. Resetting...");
                await (window as any).aistudio.openSelectKey();
            } else {
                toast.error("Synthesis destabilized.");
            }
        } finally { 
            setIsLoading(false); 
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#050a10] overflow-y-auto no-scrollbar pb-24 p-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl">
                    <Sparkles className="text-indigo-400" />
                </div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic">Synthesis Lab</h1>
            </div>

            <div className="flex gap-2 mb-6 bg-black/40 p-1 rounded-2xl border border-white/5">
                <TabBtn active={activeTab === 'GEN'} onClick={() => setActiveTab('GEN')} label="Specimen Gen" icon={ImageIcon} />
                <TabBtn active={activeTab === 'VIDEO'} onClick={() => setActiveTab('VIDEO')} label="Cine Video" icon={Film} />
                <TabBtn active={activeTab === 'EDIT'} onClick={() => setActiveTab('EDIT')} label="Lattice Edit" icon={Edit3} />
            </div>

            <div className="space-y-6">
                {activeTab === 'EDIT' && (
                    <div className="relative group aspect-video bg-black/60 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center transition-all hover:border-indigo-500/40 overflow-hidden">
                        {previewUrl ? (
                            <>
                                <img src={previewUrl} className="w-full h-full object-cover" alt="Source" />
                                <button 
                                    onClick={() => {setSourceImage(null); setPreviewUrl(null);}}
                                    className="absolute top-4 right-4 p-2 bg-red-500/80 rounded-full text-white backdrop-blur-sm"
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center gap-3 text-gray-500 group-hover:text-indigo-400 transition-colors"
                            >
                                <Upload size={32} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Upload Source Specimen</span>
                            </button>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    </div>
                )}

                <div className="bg-black/60 border border-white/10 rounded-[2rem] p-6 space-y-4">
                    <textarea 
                        value={prompt} 
                        onChange={e => setPrompt(e.target.value)}
                        placeholder={activeTab === 'EDIT' ? "Describe the modifications to the lattice..." : "Describe the specimen or cinematic sequence..."}
                        className="w-full bg-transparent border-none text-gray-200 outline-none h-24 resize-none font-sans"
                    />
                    
                    {activeTab === 'GEN' && (
                        <div className="flex gap-2">
                            {(['1K', '2K', '4K'] as const).map(s => (
                                <button key={s} onClick={() => setSize(s)} className={`px-4 py-1.5 rounded-full text-[10px] font-black border transition-all ${size === s ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}>{s}</button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'VIDEO' && (
                        <div className="flex gap-2">
                            {(['16:9', '9:16'] as const).map(a => (
                                <button key={a} onClick={() => setAspect(a)} className={`px-4 py-1.5 rounded-full text-[10px] font-black border transition-all ${aspect === a ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}>{a}</button>
                            ))}
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleGenerate}
                    disabled={isLoading || !prompt || (activeTab === 'EDIT' && !sourceImage)}
                    className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl text-sm font-black uppercase tracking-[0.4em] text-white shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Execute Synthesis'}
                </button>

                {result && (
                    <div className="animate-in zoom-in-95 duration-500 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group">
                        {activeTab === 'VIDEO' ? (
                            <video src={result} controls autoPlay loop className="w-full aspect-video object-cover" />
                        ) : (
                            <img src={result} className="w-full aspect-square object-cover" alt="Result" />
                        )}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 bg-black/60 backdrop-blur rounded-xl text-white"><Download size={18} /></button>
                            <button className="p-2 bg-black/60 backdrop-blur rounded-xl text-white"><Share2 size={18} /></button>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="mt-8 p-6 bg-indigo-900/10 border border-indigo-500/20 rounded-3xl flex items-start gap-4">
                <AlertCircle className="text-indigo-400 flex-none mt-1" size={20} />
                <div className="text-xs text-gray-400 leading-relaxed italic">
                    Note: Advanced synthesis utilizes Pro-Tier models. Ensure you have enabled billing at <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-indigo-400 underline" rel="noreferrer">ai.google.dev/gemini-api/docs/billing</a>.
                </div>
            </div>
        </div>
    );
};

const TabBtn = ({ active, onClick, label, icon: Icon }: any) => (
    <button onClick={onClick} className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${active ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
        <Icon size={18} />
        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </button>
);
