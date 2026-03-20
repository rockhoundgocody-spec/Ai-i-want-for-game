
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RotateCcw, X, ScanLine, Loader2, Crosshair, MapPin, Cpu, Microscope, Search, Activity, ShieldCheck, RefreshCw, Flashlight, FlashlightOff, Zap, BrainCircuit, AlertCircle, Info, Move, Layers, Scale, Sparkles } from 'lucide-react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { identifyRock, generateReferenceImage } from '../services/geminiService';
import { Rock, RockAnalysis } from '../types';
import { DiscoveryReveal } from './DiscoveryReveal';
import { User } from '../services/api';
import { playSound } from '../services/audioUtils';
import { ResponsiveContainer, YAxis, XAxis, AreaChart, Area } from 'recharts';
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// --- HOLOGRAPHIC SHADER SYSTEM ---
const HoloScanMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#22d3ee'),
    uIntensity: 0,
    uProgress: 0,
    uResolution: new THREE.Vector2(1, 1),
  },
  // Vertex Shader
  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  // Fragment Shader
  `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uProgress;
  varying vec2 vUv;

  float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, vec2(0.866025, 0.5)), p.y);
  }

  vec4 hexGrid(vec2 uv, float scale) {
    vec2 r = vec2(1.73205, 1.0);
    vec4 h;
    uv *= scale;
    vec2 a = mod(uv, r) - r*0.5;
    vec2 b = mod(uv - r*0.5, r) - r*0.5;
    if (length(a) < length(b)) {
        h = vec4(a, 0.0, 0.0);
    } else {
        h = vec4(b, 0.5, 0.5);
    }
    float dist = hexDist(h.xy);
    float glow = smoothstep(0.45, 0.5, dist) - smoothstep(0.5, 0.55, dist);
    return vec4(glow);
  }

  void main() {
    if (uIntensity < 0.01) discard;
    vec2 uv = vUv;
    
    // Animated Hex Grid
    vec4 grid = hexGrid(uv, 15.0 + sin(uTime * 2.0) * 0.5); 
    
    // Scanning Beam Logic
    float scanPos = 1.0 - uProgress; 
    float beamWidth = 0.02 + (uIntensity * 0.05);
    float beam = smoothstep(beamWidth, 0.0, abs(uv.y - scanPos));
    
    // Digital noise/glitch near beam
    float noise = step(0.98, fract(sin(dot(uv.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453));
    
    vec3 finalColor = uColor * (grid.x * 0.3 + beam * 3.0 + (noise * beam));
    float alpha = (grid.x * 0.1 + beam + (noise * beam)) * uIntensity;

    gl_FragColor = vec4(finalColor, alpha);
  }
  `
);

extend({ HoloScanMaterial });

const HoloOverlay = ({ active, progress }: { active: boolean, progress: number }) => {
    const matRef = useRef<any>(null);
    const { viewport } = useThree();

    useFrame((state, delta) => {
        if (matRef.current) {
            matRef.current.uTime += delta;
            matRef.current.uIntensity = THREE.MathUtils.lerp(matRef.current.uIntensity, active ? 1.0 : 0.0, delta * 8);
            matRef.current.uProgress = THREE.MathUtils.lerp(matRef.current.uProgress, progress / 100, delta * 15);
        }
    });

    return (
        <mesh scale={[viewport.width, viewport.height, 1]}>
            <planeGeometry />
            {/* @ts-ignore */}
            <holoScanMaterial ref={matRef} transparent depthTest={false} />
        </mesh>
    );
};

interface ScannerProps {
  user: User;
  onRockDetected: (rock: Rock) => void;
}

const DEEP_SCAN_PHASES = [
  "ALIGNING OPTICS...",
  "ACQUIRING SIGNAL...",
  "SPECTRAL INGEST...",
  "NEURAL MATCH...",
  "LOCKED"
];

export const Scanner: React.FC<ScannerProps> = ({ user, onRockDetected }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false); // API call in progress
  const [isHoldingScan, setIsHoldingScan] = useState(false); // Button held down
  const [scanProgress, setScanProgress] = useState(0);
  
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  
  const [showReveal, setShowReveal] = useState(false);
  const [pendingRock, setPendingRock] = useState<Rock | null>(null);
  const [rejectionData, setRejectionData] = useState<RockAnalysis | null>(null);
  
  // Telemetry State
  const [telemetry, setTelemetry] = useState({ azimuth: 142.4, alt: 42, throughput: 1.2, accuracy: 99.8 });
  const [waveformDisplayData, setWaveformDisplayData] = useState<{ value: number, index: number }[]>([]); 
  
  const webcamRef = useRef<Webcam>(null);
  const deepScanInterval = useRef<number | null>(null); 
  const waveformInterval = useRef<number | null>(null); 
  const telemetryInterval = useRef<number | null>(null);
  const waveformTick = useRef(0);

  // --- SENSOR SIMULATION ENGINE ---
  useEffect(() => {
    telemetryInterval.current = window.setInterval(() => {
        setTelemetry(prev => ({
            azimuth: (prev.azimuth + (Math.random() - 0.5) * (isHoldingScan ? 0.1 : 2)) % 360,
            alt: prev.alt + (Math.random() - 0.5) * 0.5,
            throughput: isHoldingScan ? 12.4 + Math.random() * 2 : 1.2 + Math.random() * 0.1,
            accuracy: isHoldingScan ? Math.min(100, prev.accuracy + 0.1) : 98.0 + Math.random() * 1.5
        }));
    }, 100);

    return () => {
        if (telemetryInterval.current) clearInterval(telemetryInterval.current);
    };
  }, [isHoldingScan]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        // Just setting initial values, the jitter loop handles the live feel
      });
    }
    return () => {
      if (deepScanInterval.current) clearInterval(deepScanInterval.current);
      if (waveformInterval.current) clearInterval(waveformInterval.current);
    };
  }, []);

  const handleCapture = useCallback(() => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
        setImgSrc(imageSrc);
        handleScan(imageSrc); // Auto-trigger scan on capture
    }
  }, []);

  // --- INTERACTION HANDLERS ---

  const startDeepScan = () => {
    setIsHoldingScan(true);
    setScanProgress(0); 
    setWaveformDisplayData(Array(40).fill(0).map((_, i) => ({ value: 0.2 + Math.random() * 0.1, index: i })));
    playSound('hover', { playbackRate: 0.5, volume: 0.2, loop: true }); // Start hum
    waveformTick.current = 0;

    // Start Waveform Simulation
    if (waveformInterval.current) clearInterval(waveformInterval.current);
    waveformInterval.current = window.setInterval(() => {
        waveformTick.current += 0.2;
        setWaveformDisplayData(prev => {
            const t = waveformTick.current;
            const intensity = isHoldingScan ? 2.0 : 0.5;
            const signal = Math.sin(t * 0.8) * 0.2 * intensity + Math.cos(t * 2.5) * 0.1 * intensity;
            const noise = (Math.random() - 0.5) * 0.15;
            const value = Math.max(0.1, Math.min(1.0, 0.4 + signal + noise));
            const safePrev = prev || [];
            const lastIndex = safePrev.length > 0 ? safePrev[safePrev.length - 1].index : 0;
            return [...safePrev.slice(1), { value, index: lastIndex + 1 }];
        });
    }, 40);

    // Start Progress
    if (deepScanInterval.current) clearInterval(deepScanInterval.current);
    deepScanInterval.current = window.setInterval(() => {
      setScanProgress(prev => {
        const next = prev + 2.5; 
        if (next >= 100) {
          clearInterval(deepScanInterval.current!);
          deepScanInterval.current = null;
          handleCapture(); 
          return 100;
        }
        return next;
      });
    }, 20); 
  };

  const cancelDeepScan = () => {
    if (scanProgress < 100 && !imgSrc) {
        setIsHoldingScan(false); 
        setScanProgress(0);
        setWaveformDisplayData([]); 
        playSound('error', { volume: 0.2 }); // Fail sound
        if (deepScanInterval.current) clearInterval(deepScanInterval.current);
        if (waveformInterval.current) clearInterval(waveformInterval.current);
    }
  };

  const handleScan = async (imageSrc: string) => {
    setIsScanning(true);
    setIsHoldingScan(false); // Stop the hold effect, move to processing
    playSound('warp', { volume: 0.6 });
    
    // Simulate processing steps visually
    // In a real app, this would be tied to API stream
    
    try {
      const analysis = await identifyRock(imageSrc);

      if (!analysis.isGeologicalSpecimen) {
          setRejectionData(analysis);
          setIsScanning(false);
          playSound('error');
          return;
      }
      
      const rockData: Rock = {
        ...analysis,
        id: crypto.randomUUID(),
        userId: user.id, 
        dateFound: Date.now(),
        imageUrl: imageSrc,
        status: 'approved',
        refinementLevel: 1,
        spectralWaveform: Array.from({ length: 20 }, () => Math.random()),
        comparisonImageUrl: await generateReferenceImage(analysis.name),
        location: { lat: telemetry.alt, lng: telemetry.azimuth } // Using mock telemetry if real loc missing
      };
      setPendingRock(rockData);
      setShowReveal(true);
    } catch (error) {
      toast.error('Uplink Failed.');
      setIsScanning(false);
      reset();
      playSound('error');
    }
  };

  const reset = () => {
    setImgSrc(null);
    setIsScanning(false);
    setIsHoldingScan(false);
    setScanProgress(0); 
    setRejectionData(null);
    setPendingRock(null);
    setShowReveal(false);
    setWaveformDisplayData([]); 
    playSound('click');
  };

  if (showReveal && pendingRock) {
      return <DiscoveryReveal rock={pendingRock} onDismiss={() => onRockDetected(pendingRock)} />;
  }

  return (
    <div className="h-full bg-[#030508] relative overflow-hidden font-mono selection:bg-cyan-500/30">
      <style>{`
        @keyframes scan-grid-move { 0% { transform: translateY(0); } 100% { transform: translateY(40px); } }
        @keyframes reticle-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .scan-line-active { box-shadow: 0 0 15px #22d3ee; }
      `}</style>
      
      {/* CAMERA LAYER */}
      <div className="absolute inset-0 z-0">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
                facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }}
            className="w-full h-full object-cover"
          />
          {/* Torch Simulation (Brightness overlay if torch "on" - browser support varies) */}
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isTorchOn ? 'bg-white/10' : 'bg-transparent'}`} />
      </div>

      {/* HOLOGRAPHIC OVERLAY LAYER (Three.js) */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-60">
        <Canvas>
            <HoloOverlay active={isHoldingScan || isScanning} progress={scanProgress} />
        </Canvas>
      </div>

      {/* UI LAYER */}
      <div className="absolute inset-0 z-20 flex flex-col p-6 pointer-events-none">
          
          {/* TOP HUD */}
          <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-cyan-500">
                      <Crosshair className="w-4 h-4 animate-spin-slow" />
                      <span className="text-[10px] font-bold tracking-[0.2em]">OPTICAL_ARRAY_ACTIVE</span>
                  </div>
                  <div className="flex items-center gap-4 text-[9px] text-cyan-400/70 font-mono">
                      <span>ALT: {telemetry.alt.toFixed(2)}m</span>
                      <span>AZM: {telemetry.azimuth.toFixed(1)}°</span>
                  </div>
              </div>

              <div className="flex gap-2 pointer-events-auto">
                 <button onClick={() => setFacingMode(m => m === 'user' ? 'environment' : 'user')} className="p-3 bg-black/40 border border-cyan-500/30 rounded-full text-cyan-400 backdrop-blur-md active:scale-90 transition-all">
                     <RotateCcw size={18} />
                 </button>
                 <button onClick={() => setIsTorchOn(!isTorchOn)} className={`p-3 border rounded-full backdrop-blur-md active:scale-90 transition-all ${isTorchOn ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400' : 'bg-black/40 border-cyan-500/30 text-gray-400'}`}>
                     {isTorchOn ? <Flashlight size={18} /> : <FlashlightOff size={18} />}
                 </button>
                 <button onClick={reset} className="p-3 bg-red-900/40 border border-red-500/30 rounded-full text-red-400 backdrop-blur-md active:scale-90 transition-all">
                     <X size={18} />
                 </button>
              </div>
          </div>

          {/* CENTER RETICLE */}
          <div className="flex-1 flex items-center justify-center relative">
              <div className={`relative w-64 h-64 border border-cyan-500/30 rounded-lg transition-all duration-300 ${isHoldingScan ? 'scale-95 border-cyan-400/80 shadow-[0_0_30px_rgba(34,211,238,0.2)]' : ''}`}>
                   {/* Corner Markers */}
                   <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500" />
                   <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500" />
                   <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500" />
                   <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500" />
                   
                   {/* Center Point */}
                   <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-cyan-500 -translate-x-1/2 -translate-y-1/2" />

                   {/* Scanning Bar */}
                   {(isHoldingScan || isScanning) && (
                       <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-[scan-grid-move_1.5s_linear_infinite]" />
                   )}

                   {/* Analysis Text */}
                   {isScanning && (
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                             <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/60 rounded-full border border-cyan-500/50 backdrop-blur-md">
                                 <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                                 <span className="text-[9px] font-black text-cyan-400 tracking-widest uppercase">
                                     RockHound-Go Neural Processing...
                                 </span>
                             </div>
                        </div>
                   )}
              </div>
          </div>

          {/* BOTTOM CONTROLS */}
          <div className="space-y-4">
              {/* Waveform Visualization */}
              <div className="h-16 w-full opacity-80">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={waveformDisplayData}>
                          <defs>
                              <linearGradient id="colorWave" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="value" stroke="#22d3ee" fillOpacity={1} fill="url(#colorWave)" isAnimationActive={false} />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>

              {/* Status / Instruction Text */}
              <div className="text-center">
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.2em] animate-pulse">
                      {isScanning ? "UPLINK ESTABLISHED. DO NOT MOVE." : isHoldingScan ? DEEP_SCAN_PHASES[Math.min(DEEP_SCAN_PHASES.length-1, Math.floor(scanProgress / 20))] : "HOLD TRIGGER TO INITIATE DEEP SCAN"}
                  </p>
              </div>

              {/* Trigger Button */}
              <div className="flex justify-center pb-8 pointer-events-auto">
                  <button
                      className={`relative w-20 h-20 rounded-full border-2 transition-all duration-200 ${isHoldingScan ? 'scale-110 border-cyan-400 bg-cyan-500/20 shadow-[0_0_40px_rgba(34,211,238,0.4)]' : 'border-white/20 bg-black/40'}`}
                      onMouseDown={startDeepScan}
                      onMouseUp={cancelDeepScan}
                      onMouseLeave={cancelDeepScan}
                      onTouchStart={startDeepScan}
                      onTouchEnd={cancelDeepScan}
                  >
                      <div className={`absolute inset-2 rounded-full border border-white/10 ${isHoldingScan ? 'animate-ping opacity-50' : ''}`} />
                      <div className="absolute inset-0 flex items-center justify-center">
                          <ScanLine className={`w-8 h-8 transition-colors ${isHoldingScan ? 'text-white' : 'text-cyan-500'}`} />
                      </div>
                      
                      {/* Circular Progress Indicator */}
                      <svg className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90 pointer-events-none">
                          <circle
                              cx="50%" cy="50%" r="48%"
                              fill="transparent"
                              stroke="#22d3ee"
                              strokeWidth="4"
                              strokeDasharray="280"
                              strokeDashoffset={280 - (280 * scanProgress) / 100}
                              strokeLinecap="round"
                              className="transition-all duration-75"
                          />
                      </svg>
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};
