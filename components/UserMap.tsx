import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Rock, GeologicalZone } from '../types';
import { Loader2, LocateFixed, Navigation, ShieldAlert, Trees, Waves, Mountain, Crosshair, Radar, AlertCircle, ShieldOff, Handshake } from 'lucide-react';
import { playSound } from '../services/audioUtils';

interface UserMapProps {
  rocks: Rock[];
  onRockClick: (rock: Rock) => void;
}

export const UserMap: React.FC<UserMapProps> = ({ rocks, onRockClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const rockLayerRef = useRef<any>(null);
  const zoneLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedZone, setSelectedZone] = useState<GeologicalZone | null>(null);

  const predictedZones: GeologicalZone[] = useMemo(() => {
    if (!userLoc) return [];
    return [
      {
        id: 'zone-1',
        type: 'METAMORPHIC',
        name: 'Contact Metamorphic Zone',
        coordinates: [userLoc.lat + 0.005, userLoc.lng + 0.005],
        radius: 300,
        access: 'PUBLIC',
        description: 'Prime area where Garnets and Epidote can form due to heat from a nearby intrusion.',
        likelyMinerals: ['Garnet', 'Epidote']
      },
      {
        id: 'zone-2',
        type: 'ALLUVIAL',
        name: 'Alluvial Placer Deposit',
        coordinates: [userLoc.lat - 0.008, userLoc.lng - 0.002],
        radius: 500,
        access: 'PRIVATE',
        description: 'Rivers have washed heavy minerals downhill for centuries. High probability for Placer Garnets or Agates.',
        likelyMinerals: ['Agate', 'Jasper', 'Placer Garnet']
      }
    ];
  }, [userLoc]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        null, { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && (window as any).L) {
      const L = (window as any).L;
      const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false })
                  .setView([userLoc?.lat || 37.7749, userLoc?.lng || -122.4194], 15);
      mapInstanceRef.current = map;
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(map);
      rockLayerRef.current = L.layerGroup().addTo(map);
      zoneLayerRef.current = L.layerGroup().addTo(map);
    }
    return () => { if (mapInstanceRef.current) mapInstanceRef.current.remove(); };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && userLoc && (window as any).L) {
      const L = (window as any).L;
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLoc.lat, userLoc.lng]);
      } else {
        const userIcon = L.divIcon({
          className: 'user-radar-icon',
          html: `<div class="relative w-10 h-10 -ml-5 -mt-5">
                  <div class="absolute inset-0 bg-cyan-500/20 rounded-full animate-[ping_3s_infinite]"></div>
                  <div class="absolute inset-2 bg-cyan-500/40 rounded-full animate-[ping_2s_infinite]"></div>
                  <div class="absolute inset-4 bg-cyan-400 rounded-full border-2 border-white shadow-[0_0_15px_#22d3ee]"></div>
                </div>`,
          iconSize: [0, 0]
        });
        userMarkerRef.current = L.marker([userLoc.lat, userLoc.lng], { icon: userIcon }).addTo(mapInstanceRef.current);
        mapInstanceRef.current.flyTo([userLoc.lat, userLoc.lng], 15);
      }
    }
  }, [userLoc]);

  useEffect(() => {
    if (mapInstanceRef.current && zoneLayerRef.current && (window as any).L) {
      const L = (window as any).L;
      zoneLayerRef.current.clearLayers();
      predictedZones.forEach(zone => {
        const color = zone.type === 'METAMORPHIC' ? '#a855f7' : '#3b82f6';
        L.circle([zone.coordinates[0], zone.coordinates[1]], {
          color, fillColor: color, fillOpacity: 0.1, weight: 1, dashArray: '4, 8'
        }).addTo(zoneLayerRef.current).on('click', () => { playSound('click'); setSelectedZone(zone); });
      });
    }
  }, [predictedZones]);

  useEffect(() => {
    if (mapInstanceRef.current && rockLayerRef.current && (window as any).L) {
      const L = (window as any).L;
      rockLayerRef.current.clearLayers();
      rocks.forEach((rock) => {
        if (rock.location) {
          const color = rock.type === 'Igneous' ? 'red' : rock.type === 'Sedimentary' ? 'yellow' : 'cyan';
          const icon = L.divIcon({
            className: 'holo-pin',
            html: `<div class="group relative flex items-center justify-center w-8 h-8">
                    <div class="absolute inset-0 bg-${color}-500/30 blur-md rounded-full scale-150 animate-pulse"></div>
                    <div class="w-2.5 h-2.5 bg-${color}-400 border border-white rotate-45 shadow-[0_0_10px_white]"></div>
                  </div>`,
            iconSize: [32, 32], iconAnchor: [16, 16]
          });
          L.marker([rock.location.lat, rock.location.lng], { icon }).addTo(rockLayerRef.current)
           .on('click', () => { playSound('click'); onRockClick(rock); });
        }
      });
    }
  }, [rocks, onRockClick]);

  return (
    <div className="absolute inset-0 bg-[#030508] overflow-hidden">
      <style>{`
        .holographic-filter { filter: url(#chromatic-aberration) contrast(1.2) brightness(0.9); }
        .grid-overlay { background-image: linear-gradient(rgba(6,182,212,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.05) 1px, transparent 1px); background-size: 40px 40px; }
        @keyframes sector-sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <svg className="hidden">
        <defs>
          <filter id="chromatic-aberration">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
            <feOffset in="red" dx="1" dy="0" result="red-offset" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 1 0" result="green" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />
            <feOffset in="blue" dx="-1" dy="0" result="blue-offset" />
            <feBlend in="red-offset" in2="green" mode="screen" result="temp" />
            <feBlend in="temp" in2="blue-offset" mode="screen" />
          </filter>
        </defs>
      </svg>

      <div ref={mapContainerRef} className="absolute inset-0 holographic-filter opacity-70" />
      <div className="absolute inset-0 pointer-events-none z-10 grid-overlay" />
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_0%,#030508_100%)]" />

      {/* Radar Overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vh] h-[90vh] border border-cyan-500/10 rounded-full pointer-events-none z-0">
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(6,182,212,0.1)_360deg)] animate-[sector-sweep_6s_linear_infinite]" />
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-4 px-6 py-2 bg-black/60 backdrop-blur-xl border border-white/5 rounded-full text-[10px] font-mono text-cyan-400/60 uppercase tracking-[0.4em]">
          <span>AZM: 142°</span> <span>///</span> <span>DST: 0.8KM</span>
      </div>

      {selectedZone && (
        <div className="absolute bottom-32 left-6 right-6 z-30 animate-in slide-in-from-bottom-10">
          <div className="bg-[#0a0f18]/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-current bg-opacity-20 ${selectedZone.type === 'METAMORPHIC' ? 'text-purple-400' : 'text-blue-400'}`}>
                        {selectedZone.type === 'METAMORPHIC' ? <Mountain size={24} /> : <Waves size={24} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-wider">{selectedZone.name}</h3>
                        <div className={`text-[10px] font-bold flex items-center gap-1 ${selectedZone.access === 'PUBLIC' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {selectedZone.access === 'PUBLIC' ? <ShieldAlert size={10} /> : <ShieldOff size={10} />}
                            {selectedZone.access} ACCESS
                        </div>
                    </div>
                  </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-xs text-gray-400 italic leading-relaxed">"{selectedZone.description}"</p>
                
                {selectedZone.access === 'PRIVATE' ? (
                  <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl space-y-2">
                    <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                        <AlertCircle size={12} /> Ethical Warning
                    </h4>
                    <p className="text-[9px] text-gray-300 leading-normal font-sans">
                        Clover's mandate: **DO NOT TRESPASS**. To collect here, secure legal permission. Identifying the owner and logging legal access earns the **'Diplomat'** achievement (+200 XP).
                    </p>
                    <button className="w-full py-2 bg-red-500 text-black text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2">
                        <Handshake size={12} /> Start Diplomat Challenge
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-xl space-y-2">
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Ethics Protocol</h4>
                    <p className="text-[9px] text-gray-300 leading-normal font-sans italic">
                        "Leave No Trace. Log your trip and check the 'Ethical' box for +25 Good Rockhound XP."
                    </p>
                  </div>
                )}
                
                <button onClick={() => setSelectedZone(null)} className="w-full py-2 bg-white/5 rounded-lg text-[10px] font-black uppercase text-gray-500">Close Intel Feed</button>
              </div>
          </div>
        </div>
      )}

      <button onClick={() => userLoc && mapInstanceRef.current?.flyTo([userLoc.lat, userLoc.lng], 16)} className="absolute bottom-32 right-6 p-4 bg-black/60 backdrop-blur-xl border border-cyan-500/30 text-cyan-400 rounded-full z-20 shadow-2xl">
          <LocateFixed size={24} />
      </button>
    </div>
  );
};