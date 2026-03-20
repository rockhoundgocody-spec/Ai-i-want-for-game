
import React, { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { User } from '../services/api';
// Fix: Removed non-existent generateRockSpeech import
import { getCloverLiveConfig, createGeminiChat } from '../services/geminiService';
import { X, Mic, PhoneCall, PhoneOff, MessageSquare, Send, Sparkles, Loader2, Globe, MapPin } from 'lucide-react';
import { decode, decodeAudioData, getGlobalAudioContext, setSpeechSource, playSound, encode } from '../services/audioUtils';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { Canvas } from '@react-three/fiber';
import { CloverAvatar } from './CloverAvatar';
import toast from 'react-hot-toast';

interface CloverOverlayProps {
  user: User;
  onDismiss: () => void;
  currentView: string;
}

export const CloverOverlay: React.FC<CloverOverlayProps> = ({ user, onDismiss, currentView }) => {
  const [mode, setMode] = useState<'MENU' | 'LIVE' | 'CHAT'>('MENU');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [displayedText, setDisplayedText] = useState(`System Ready. How can I assist with your field work today, Operator ${user.username}?`);
  
  const [audioAmplitude, setAudioAmplitude] = useState(0);
  const chatRef = useRef<any>(null);
  const liveSessionRef = useRef<any>(null);

  useEffect(() => {
    chatRef.current = createGeminiChat();
    playSound('boot');
  }, []);

  const handleSendMessage = async () => {
    if (!inputText) return;
    const userMsg = inputText;
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsThinking(true);
    playSound('click');

    try {
        const response = await chatRef.current.sendMessage({ message: userMsg });
        setMessages(prev => [...prev, { role: 'model', text: response.text }]);
    } catch (e) {
        toast.error("Transmission lost.");
    } finally { setIsThinking(false); }
  };

  const startLive = async () => {
    setMode('LIVE');
    setDisplayedText("ESTABLISHING VOICE UPLINK...");
    setIsThinking(true);
    playSound('warp');

    try {
      // Fix: Initializing GoogleGenAI with the mandatory apiKey parameter from process.env.API_KEY
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const config = getCloverLiveConfig();
      const ctx = getGlobalAudioContext();
      if (!ctx) throw new Error("Audio failed");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            setIsThinking(false);
            setDisplayedText("UPLINK SECURE. SPEAK NOW.");
            const source = ctx.createMediaStreamSource(stream);
            const scriptProcessor = ctx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate RMS for amplitude visualization
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setAudioAmplitude(rms * 10); // Scale it for better visual response

              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              
              // Fix: Use 'audio' field instead of deprecated 'media'
              sessionPromise.then(s => s.sendRealtimeInput({ 
                audio: { 
                  data: encode(new Uint8Array(int16.buffer)), 
                  mimeType: 'audio/pcm;rate=16000' 
                } 
              }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(ctx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Fix: Accessing generated audio bytes from LiveServerMessage using the recommended property path
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio) {
              const buffer = await decodeAudioData(decode(audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              setSpeechSource(source);
              source.start();
            }
            if (message.serverContent?.outputTranscription) setDisplayedText(message.serverContent.outputTranscription.text);
          }
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (e) {
      setMode('MENU');
      toast.error("Bio-Link failed.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onDismiss} />

        <div className="absolute inset-0 pointer-events-none flex items-center justify-center pb-64">
             <Canvas style={{ height: 400, width: 400 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[5, 5, 5]} intensity={2} />
                <CloverAvatar 
                    mood={isThinking ? 'THINKING' : mode === 'LIVE' ? 'LISTENING' : 'IDLE'} 
                    amplitude={audioAmplitude}
                />
             </Canvas>
        </div>

        <div className="relative w-full max-w-2xl px-6 pb-12 pointer-events-auto">
            <div className="bg-[#050a10]/95 backdrop-blur-2xl border-t-4 border-indigo-500 rounded-t-[3rem] p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-indigo-400" size={16} />
                        <span className="text-[10px] font-mono text-indigo-400 tracking-widest uppercase">RockHound-Go // Field Guide v4.5</span>
                    </div>
                    <button onClick={onDismiss} className="p-2 text-gray-500"><X size={20} /></button>
                </div>

                {mode === 'MENU' && (
                    <div className="space-y-6">
                        <p className="text-xl font-medium text-white italic">"{displayedText}"</p>
                        <div className="grid grid-cols-2 gap-3">
                            <MenuBtn label="Voice Uplink" sub="Live MSc. Talk" icon={PhoneCall} onClick={startLive} color="cyan" />
                            <MenuBtn label="Neural Chat" sub="Deep Research" icon={MessageSquare} onClick={() => setMode('CHAT')} color="purple" />
                        </div>
                    </div>
                )}

                {mode === 'CHAT' && (
                    <div className="flex flex-col h-[400px]">
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar mb-4">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-3xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white/5 border border-white/10 text-gray-300 italic'}`}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                            {isThinking && <Loader2 className="animate-spin text-indigo-400" />}
                        </div>
                        <div className="flex gap-3">
                            <input 
                                value={inputText} onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Consulting the experts..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none"
                            />
                            <button onClick={handleSendMessage} className="p-4 bg-indigo-600 rounded-2xl text-white"><Send size={20} /></button>
                        </div>
                    </div>
                )}

                {mode === 'LIVE' && (
                    <div className="text-center space-y-8 py-8">
                        <div className="text-red-500 animate-pulse font-black tracking-widest text-xs uppercase">/// VOICE_UPLINK_ACTIVE ///</div>
                        <p className="text-2xl font-bold text-white leading-relaxed">"{displayedText}"</p>
                        <button onClick={() => { liveSessionRef.current?.close(); setMode('MENU'); }} className="mx-auto flex items-center gap-3 px-8 py-4 bg-red-600/20 border border-red-500/50 rounded-full text-red-400 font-black uppercase tracking-widest">
                            <PhoneOff size={20} /> Terminate
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

const MenuBtn = ({ label, sub, icon: Icon, onClick, color }: any) => (
    <button onClick={onClick} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-white/10 transition-all group">
        <div className={`p-3 rounded-xl bg-indigo-500/20 group-hover:scale-110 transition-transform`}><Icon size={24} className="text-indigo-400" /></div>
        <div>
            <div className="text-sm font-bold text-white uppercase">{label}</div>
            <div className="text-[10px] text-gray-500 font-mono">{sub}</div>
        </div>
    </button>
);
