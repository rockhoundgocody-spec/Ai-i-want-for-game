
import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { Box, Map as MapIcon, ScanLine, Cpu, Activity, Home as HomeIcon, Settings, Sparkles, X } from 'lucide-react';
import { Rock, View, User } from './types';
import { api } from './services/api';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { SplashScreen } from './components/SplashScreen';
import { CloverOverlay } from './components/CloverOverlay';
import { SyncStatus } from './components/SyncStatus';
import { initAudio, playSound, setLoopingSoundVolume, stopSound } from './services/audioUtils';
import { SettingsPanel } from './components/SettingsPanel';

const Home = lazy(() => import('./components/Home').then(m => ({ default: m.Home })));
const Scanner = lazy(() => import('./components/Scanner').then(m => ({ default: m.Scanner })));
const Collection = lazy(() => import('./components/Collection').then(m => ({ default: m.Collection })));
const RockDetails = lazy(() => import('./components/RockDetails').then(m => ({ default: m.RockDetails })));
const UserMap = lazy(() => import('./components/UserMap').then(m => ({ default: m.UserMap })));
const Achievements = lazy(() => import('./components/Achievements').then(m => ({ default: m.Achievements })));
const FusionLab = lazy(() => import('./components/FusionLab').then(m => ({ default: m.FusionLab })));
const Profile = lazy(() => import('./components/Profile').then(m => ({ default: m.Profile })));
const RockComparison = lazy(() => import('./components/RockComparison').then(m => ({ default: m.RockComparison })));

const NAV_BASE_HEIGHT = 112; 

const App: React.FC = () => {
  // Navigation Persistence: Load from storage or default to HOME
  const [currentView, setCurrentView] = useState<View>(() => {
      const saved = localStorage.getItem('rockhound_last_view');
      return (saved as View) || View.HOME;
  });

  const [user, setUser] = useState<User | null>(api.getCurrentUser());
  const [collection, setCollection] = useState<Rock[]>([]);
  const [selectedRock, setSelectedRock] = useState<Rock | null>(null);
  const [comparisonRocks, setComparisonRocks] = useState<Rock[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bootState, setBootState] = useState<'AUTH' | 'SPLASH' | 'READY'>('SPLASH');
  const [showClover, setShowClover] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ambienceVolume, setAmbienceVolume] = useState(0.15);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [perfMode, setPerfMode] = useState<'BATTERY' | 'BALANCED' | 'MAX'>('BALANCED');

  // Load Performance Mode
  useEffect(() => {
      const savedPerf = localStorage.getItem('sys_perf_mode');
      if (savedPerf) setPerfMode(savedPerf as any);
  }, []);

  // Save Navigation State
  useEffect(() => {
      localStorage.setItem('rockhound_last_view', currentView);
  }, [currentView]);

  useEffect(() => { initAudio(); }, []);
  
  useEffect(() => {
    playSound('ambience', { loop: true, volume: ambienceVolume });
    return () => stopSound('ambience');
  }, []);

  useEffect(() => {
    setLoopingSoundVolume('ambience', ambienceVolume);
  }, [ambienceVolume]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser(userData);
          localStorage.setItem('current_user_data', JSON.stringify(userData));
        }
      } else {
        setUser(null);
        setCollection([]);
        localStorage.removeItem('current_user_data');
        setBootState('SPLASH');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    api.onSyncStatusChange = setIsSyncing;
    if (user) {
        api.getRocks()
           .then(setCollection)
           .catch(() => toast.error("Offline Mode: Vault Sync Failed"));
    }
  }, [user]);

  // Geolocation tracking
  useEffect(() => {
    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      localStorage.setItem('geolocation_attempted', 'true'); 
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn(`Geolocation error: ${err.message}`);
          toast.error("Geolocation denied or unavailable. Bounty and Map may be inaccurate.");
          setUserLocation(null);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      localStorage.setItem('geolocation_attempted', 'true');
      toast.error("Geolocation not supported by this device. Bounty and Map may be inaccurate.");
      setUserLocation(null);
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || perfMode === 'BATTERY') return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleRockDetected = async (rock: Rock) => {
    try {
      const response = await api.addRock(rock);
      setCollection(prev => [response.rock, ...prev]);
      setSelectedRock(response.rock);
      if (user && response.userStats) {
        setUser({ ...user, xp: response.userStats.xp, level: response.userStats.level });
        if (response.userStats.leveledUp) {
            toast.success(`RANK UP! You are now level ${response.userStats.level}!`, { icon: '🏆' });
        }
      }
      setCurrentView(View.DETAILS);
    } catch (err) {
      toast.error("Failed to sync specimen with vault.");
    }
  };

  const handleUpdateRock = (updated: Rock) => {
      setCollection(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSelectedRock(updated);
  };

  const handleDeleteRock = async (id: string) => {
      try {
          await api.deleteRock(id);
          setCollection(prev => prev.filter(r => r.id !== id));
          setSelectedRock(null);
          setCurrentView(View.COLLECTION);
          toast.success("Specimen purged.");
      } catch (err) {
          toast.error("Delete sequence failed.");
      }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    toast.success("Profile updated!");
  };

  const handleStartComparison = (selectedRocks: Rock[]) => {
      setComparisonRocks(selectedRocks);
      setCurrentView(View.COMPARISON);
  };

  const renderView = () => {
    switch (currentView) {
      case View.HOME: return <Home user={user!} onNavigate={(v: any) => setCurrentView(v)} userLocation={userLocation} />;
      case View.SCANNER: return <Scanner user={user!} onRockDetected={handleRockDetected} />;
      case View.COLLECTION: 
        return (
            <Collection 
                rocks={collection} 
                onRockClick={(r: any) => { setSelectedRock(r); setCurrentView(View.DETAILS); }} 
                onCompare={handleStartComparison}
            />
        );
      case View.DETAILS: return selectedRock ? <RockDetails rock={selectedRock} onBack={() => setCurrentView(View.COLLECTION)} onDelete={handleDeleteRock} onUpdateRock={handleUpdateRock} /> : null;
      case View.MAP: return <UserMap rocks={collection} onRockClick={(r: any) => { setSelectedRock(r); setCurrentView(View.DETAILS); }} />;
      case View.ACHIEVEMENTS: return <Achievements user={user!} rocks={collection} />;
      case View.FUSION: return <FusionLab rocks={collection} onBack={() => setCurrentView(View.HOME)} onFused={handleRockDetected} />;
      case View.PROFILE: return <Profile user={user!} onUpdateUser={handleUpdateUser} onBack={() => setCurrentView(View.HOME)} />;
      case View.COMPARISON: return <RockComparison rocksToCompare={comparisonRocks} onBack={() => setCurrentView(View.COLLECTION)} />;
      default: return null;
    }
  };

  if (bootState === 'SPLASH') return <SplashScreen onFinish={() => setBootState('READY')} />;

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} className="flex flex-col h-[100dvh] w-screen bg-black text-gray-100 font-sans overflow-hidden relative">
      <style>{` .volumetric-light { background: radial-gradient(800px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(34, 211, 238, 0.06), transparent 50%); } `}</style>
      {perfMode !== 'BATTERY' && <div className="absolute inset-0 volumetric-light pointer-events-none z-0" />}
      <Toaster 
          position="top-center" 
          containerStyle={{ top: 100 }}
          toastOptions={{
              style: { background: '#0a0f18', color: '#fff', border: '1px solid #ffffff1a' },
              success: { iconTheme: { primary: '#22d3ee', secondary: '#0a0f18' } }
          }} 
      />
      
      <header className="absolute top-0 left-0 right-0 h-28 px-6 flex items-center justify-between z-40 bg-gradient-to-b from-black/80 via-black/50 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm shadow-lg">
            <span className="font-black text-xs font-mono">{user?.username[0]}</span>
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-widest">{user?.username}</h1>
            <div className="text-[9px] text-cyan-400 font-mono">LVL_{user?.level} // {user?.credits} CR</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <SyncStatus isSyncing={isSyncing} />
            <button onClick={() => setShowSettings(true)} className="p-3 rounded-full bg-black/40 border border-white/10 text-gray-400 hover:text-white transition-all backdrop-blur-md active:scale-95"><Settings size={20} /></button>
        </div>
      </header>

      <main 
        className="flex-1 relative overflow-hidden bg-transparent z-10 pt-24"
        style={{ paddingBottom: `calc(${NAV_BASE_HEIGHT}px + env(safe-area-inset-bottom))` }}
      >
         <Suspense fallback={<div className="h-full flex items-center justify-center"><Cpu className="w-10 h-10 text-cyan-500 animate-spin" /></div>}>
             {renderView()}
         </Suspense>
         {showClover && <CloverOverlay user={user!} onDismiss={() => setShowClover(false)} currentView={currentView} />}
      </main>

      <nav 
        className="fixed bottom-0 left-0 right-0 min-h-[7rem] h-auto bg-gradient-to-t from-black/90 via-black/60 to-transparent z-40 flex items-end justify-center pt-8 pointer-events-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative w-full max-w-lg pointer-events-auto mb-2">
            {/* Background Layer with Clip Path */}
            <div 
                className="absolute inset-0 bg-black/60 border border-white/10 backdrop-blur-xl"
                style={{ 
                    clipPath: 'polygon(0 25%, 100% 0, 100% 100%, 0 100%)',
                    height: '5rem' // Match h-20
                }}
            />

            {/* Interactive Layer (No Clip) */}
            <div className="relative h-20 flex justify-around items-center px-2">
                <NavButton active={currentView === View.HOME} onClick={() => setCurrentView(View.HOME)} icon={HomeIcon} label="CMD" />
                <NavButton active={currentView === View.MAP} onClick={() => setCurrentView(View.MAP)} icon={MapIcon} label="GEO" />
                
                {/* Center Scanner Button - Unclipped & Larger */}
                <button 
                    onClick={() => setCurrentView(View.SCANNER)} 
                    className="relative w-20 h-20 -mt-12 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.4)] active:scale-90 transition-transform border-4 border-black/50 group"
                >
                    <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse group-hover:bg-white/30 transition-colors" />
                    <ScanLine size={32} className="text-white drop-shadow-md" />
                </button>

                <NavButton active={currentView === View.COLLECTION} onClick={() => setCurrentView(View.COLLECTION)} icon={Box} label="VAULT" />
                <NavButton active={currentView === View.ACHIEVEMENTS} onClick={() => setCurrentView(View.ACHIEVEMENTS)} icon={Activity} label="REG" />
            </div>
        </div>
      </nav>
      {showSettings && <SettingsPanel volume={ambienceVolume} onVolumeChange={setAmbienceVolume} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 transition-all p-2 ${active ? 'text-indigo-400' : 'text-gray-500 hover:text-white'} active:scale-95`}>
    <Icon size={24} />
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
