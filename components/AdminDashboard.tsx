

import React, { useEffect, useState, useRef } from 'react';
import { api, AdminStats } from '../services/api';
import { ArrowLeft, Users, Activity, Globe, Terminal, ShieldAlert, Cpu, Lock, Database, AlertCircle } from 'lucide-react';
import { playSound } from '../services/audioUtils';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    api.getAdminStats().then(data => { if (isMounted) setStats(data); setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!loading && stats && mapRef.current && !leafletMap.current && (window as any).L) {
        const L = (window as any).L;
        leafletMap.current = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([20, 0], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(leafletMap.current);
        stats.locations.forEach(loc => {
            if (loc && loc.lat !== undefined && loc.lng !== undefined) {
                L.circleMarker([loc.lat, loc.lng], { radius: 3, fillColor: "#22d3ee", color: "transparent", fillOpacity: 0.8 }).addTo(leafletMap.current);
            }
        });
    }
  }, [loading, stats]);

  if (loading) return <div className="h-full flex items-center justify-center bg-black text-cyan-500 font-mono animate-pulse uppercase tracking-[0.4em]">Establishing secure link...</div>;

  return (
    <div className="h-full bg-[#050a10] flex flex-col overflow-hidden relative font-sans">
      <header className="flex items-center justify-between p-4 border-b border-cyan-900/30 bg-[#050a10]/95 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => { playSound('click'); onBack(); }} className="p-2 rounded-lg border border-white/10 hover:bg-cyan-900/20 text-gray-400 transition-all"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-bold text-white tracking-widest uppercase italic flex items-center gap-3">
            <Globe className="w-5 h-5 text-cyan-500 animate-[spin_20s_linear_infinite]" /> Command Center
          </h1>
        </div>
        <div className="px-3 py-1 bg-red-900/20 border border-red-500/30 rounded-full text-[10px] font-black text-red-400 uppercase tracking-widest animate-pulse">
            AUDIT: LIVE
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Operatives" value={stats?.totalUsers.toLocaleString() || '0'} icon={<Users />} color="blue" />
          <MetricCard label="Active Sessions" value={stats?.activeUsers.toLocaleString() || '0'} icon={<Activity />} color="green" />
          <MetricCard label="Total Artifacts" value={stats?.totalRocks.toLocaleString() || '0'} icon={<Database />} color="purple" />
        </section>

        <div className="flex flex-col lg:flex-row gap-6">
          <section className="flex-1 rounded-2xl border border-cyan-900/30 overflow-hidden bg-black/40 h-[400px]">
            <div ref={mapRef} className="w-full h-full grayscale-[50%] contrast-125" />
          </section>

          <aside className="w-full lg:w-96 space-y-4">
            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 h-[400px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-2 flex-none">
                <span className="flex items-center gap-2 font-mono text-xs text-cyan-400"><Terminal size={14} /> SECURITY_AUDIT_LOG</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 font-mono text-[9px]">
                {stats?.logs?.map((log, i) => (
                    <div key={i} className={`p-2 rounded border-l-2 ${
                        log.severity === 'CRITICAL' ? 'bg-red-900/10 border-red-500 text-red-300' :
                        log.severity === 'WARN' ? 'bg-yellow-900/10 border-yellow-500 text-yellow-300' :
                        'bg-white/5 border-cyan-500 text-gray-300'
                    }`}>
                        <div className="flex justify-between opacity-50 mb-1">
                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span>{log.user || 'SYSTEM'}</span>
                        </div>
                        <div className="font-bold uppercase tracking-wider">{log.action}</div>
                        {log.details && <div className="truncate opacity-70 mt-1">{JSON.stringify(log.details)}</div>}
                    </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase font-black">Threat Level</span>
                  <span className="text-xl font-mono text-indigo-300 font-bold">LOW</span>
              </div>
              <ShieldAlert className="w-10 h-10 text-indigo-400 opacity-50" />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; icon: React.ReactElement; color: string; }> = ({ label, value, icon, color }) => {
  const styles: any = {
    blue: 'border-blue-500/30 text-blue-400',
    green: 'border-green-500/30 text-green-400',
    purple: 'border-purple-500/30 text-purple-400',
  };
  return (
    <div className={`relative p-5 rounded-2xl border bg-gray-900/40 backdrop-blur-md overflow-hidden ${styles[color]}`}>
      <div className="absolute -right-2 -top-2 opacity-10">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 64 })}
      </div>
      <div className="text-2xl font-bold text-white mb-1 font-mono">{value}</div>
      <div className="text-[10px] uppercase font-bold tracking-widest opacity-60">{label}</div>
    </div>
  );
};
