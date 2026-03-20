
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getWeatherData } from '../services/weatherService';
import { WeatherData } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ComposedChart, Area } from 'recharts';
import { CloudRain, Sun, Clock, MapPin, Loader2, ArrowLeft, Cloud, Wind, Droplets, Zap, CloudLightning, SunDim, Activity, Calendar } from 'lucide-react';

// -- WEATHER VISUALIZER COMPONENTS --

const WeatherAtmosphere: React.FC<{ cloudCover: number; isRaining: boolean; windSpeed: number }> = ({ cloudCover, isRaining, windSpeed }) => {
    // Condition Logic
    const isStorm = isRaining && cloudCover > 80;
    const isCloudy = cloudCover > 40;
    const isClear = cloudCover <= 40;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
            <style>{`
                @keyframes float-cloud { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
                @keyframes fall-rain { 0% { transform: translateY(-20px) rotate(15deg); opacity: 0; } 50% { opacity: 0.6; } 100% { transform: translateY(150px) rotate(15deg); opacity: 0; } }
                @keyframes spin-aura { 0% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.1); } 100% { transform: rotate(360deg) scale(1); } }
                .rain-drop { position: absolute; width: 1px; height: 12px; background: linear-gradient(to bottom, transparent, #60a5fa); animation: fall-rain linear infinite; }
                .holo-cloud { position: absolute; filter: blur(10px); opacity: 0.3; background: white; border-radius: 50%; }
            `}</style>

            {/* Clear Sky / Sun Effects */}
            {isClear && (
                <div className="absolute top-0 right-0 w-48 h-48 -translate-y-1/2 translate-x-1/2 bg-yellow-500/10 rounded-full blur-3xl animate-[spin-aura_10s_linear_infinite]" />
            )}

            {/* Cloud Simulation */}
            {isCloudy && Array.from({ length: 5 }).map((_, i) => (
                <div 
                    key={i} 
                    className="holo-cloud"
                    style={{
                        width: `${100 + Math.random() * 100}px`,
                        height: `${40 + Math.random() * 40}px`,
                        top: `${20 + i * 15}%`,
                        left: `${-50}%`,
                        animation: `float-cloud ${20 + windSpeed / 2}s linear infinite`,
                        animationDelay: `${i * 3}s`,
                        opacity: cloudCover / 200
                    }}
                />
            ))}

            {/* Rain Simulation */}
            {isRaining && Array.from({ length: 15 }).map((_, i) => (
                <div 
                    key={i} 
                    className="rain-drop"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `-10%`,
                        animationDuration: `${0.5 + Math.random() * 0.5}s`,
                        animationDelay: `${Math.random() * 1}s`,
                    }}
                />
            ))}

            {/* Lightning / Storm Flash */}
            {isStorm && (
                <div className="absolute inset-0 bg-white/5 animate-pulse" />
            )}
        </div>
    );
};

// -- AUDIO ENGINE --
const useWeatherSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const startAmbience = useCallback(() => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; 
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = ctx.createGain();
    gain.gain.value = 0.05;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 200;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    lfo.start();

    return () => {
        noise.stop();
        lfo.stop();
        gain.disconnect();
    };
  }, []);

  return startAmbience;
};

interface WeatherDashboardProps {
  onBack: () => void;
}

export const WeatherDashboard: React.FC<WeatherDashboardProps> = ({ onBack }) => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const startAmbience = useWeatherSound();
  const stopAmbienceRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadData();
    stopAmbienceRef.current = startAmbience();
    return () => {
        if (stopAmbienceRef.current) stopAmbienceRef.current();
    };
  }, [startAmbience]);

  const loadData = async () => {
    try {
      const weather = await getWeatherData();
      setData(weather);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (cloud: number, rain: boolean) => {
    if (rain && cloud > 80) return CloudLightning;
    if (rain) return CloudRain;
    if (cloud > 70) return Cloud;
    if (cloud > 30) return SunDim;
    return Sun;
  };

  const currentStats = useMemo(() => {
    if (!data) return null;
    const cloud = data.hourly.cloudcover[0];
    const rain = data.hourly.precipitation[0] > 0;
    const wind = data.hourly.windspeed_10m[0];
    const temp = data.hourly.temperature_2m[0];

    const icon = getWeatherIcon(cloud, rain);
    let label = "Optimal";
    let color = "from-yellow-500/20 to-orange-500/20";
    
    if (rain && cloud > 80) {
        label = "Storm Front";
        color = "from-indigo-900/40 to-blue-900/40";
    } else if (rain) {
        label = "Rain Cycles";
        color = "from-blue-600/20 to-indigo-900/20";
    } else if (cloud > 70) {
        label = "Overcast";
        color = "from-gray-700/30 to-indigo-900/30";
    } else if (cloud > 30) {
        label = "Partial Cover";
        color = "from-cyan-900/20 to-indigo-900/20";
    }

    return { cloud, rain, wind, temp, icon, label, color };
  }, [data]);

  const dailyForecast = useMemo(() => {
    if (!data) return [];
    
    const forecast = [];
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const now = new Date();

    for (let day = 0; day < 7; day++) {
        const startIndex = day * 24;
        const endIndex = startIndex + 24;
        const dayTemps = data.hourly.temperature_2m.slice(startIndex, endIndex);
        const dayCloud = data.hourly.cloudcover.slice(startIndex, endIndex);
        const dayPrecip = data.hourly.precipitation.slice(startIndex, endIndex);
        
        const high = Math.max(...dayTemps);
        const low = Math.min(...dayTemps);
        
        // Use mid-day values for representative weather
        const midDayIndex = startIndex + 12;
        const midCloud = data.hourly.cloudcover[midDayIndex];
        const midRain = data.hourly.precipitation[midDayIndex] > 0;
        
        const date = new Date(now);
        date.setDate(now.getDate() + day);
        
        forecast.push({
            dayName: days[date.getDay()],
            date: date.toLocaleDateString([], { month: 'numeric', day: 'numeric' }),
            high,
            low,
            icon: getWeatherIcon(midCloud, midRain),
            precipChance: Math.round((dayPrecip.filter(p => p > 0).length / 24) * 100),
            avgCloud: Math.round(dayCloud.reduce((a, b) => a + b, 0) / 24)
        });
    }
    return forecast;
  }, [data]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#050a10] space-y-6">
        <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-900 rounded-full" />
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <Cloud className="absolute inset-0 m-auto text-indigo-400 w-8 h-8 animate-pulse" />
        </div>
        <p className="text-indigo-400/50 font-mono text-xs tracking-[0.3em] animate-pulse">ACQUIRING SATELLITE FEED...</p>
      </div>
    );
  }

  if (!data || !currentStats) return <div className="p-8 text-center text-red-400 font-mono">SIGNAL LOST. RETRYING...</div>;

  const hourlyChartData = data.hourly.time.slice(0, 24).map((timeStr, i) => {
    const time = new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      time,
      temp: data.hourly.temperature_2m[i],
      prev1: data.hourly.temperature_2m_previous_day1[i],
      prev2: data.hourly.temperature_2m_previous_day2[i],
      cloud: data.hourly.cloudcover[i], 
    };
  });

  return (
    <div className="h-full bg-[#050a10] flex flex-col overflow-y-auto no-scrollbar pb-24 relative font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,58,138,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20" />

      {/* Header */}
      <div className="p-6 relative z-10">
        <div className="flex items-center gap-4 mb-8">
            <button onClick={onBack} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all hover:scale-105 group">
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
                <h1 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
                    <Wind className="w-5 h-5 text-indigo-400" />
                    RHG Telemetry
                </h1>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    LIVE TELEMETRY :: {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
        
        {/* Main Status Card with Visualizer */}
        <div className={`bg-gradient-to-br ${currentStats.color} border border-white/10 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl transition-all duration-1000`}>
            {/* PROCEDURAL VISUALIZER LAYER */}
            <WeatherAtmosphere cloudCover={currentStats.cloud} isRaining={currentStats.rain} windSpeed={currentStats.wind} />
            
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2 bg-indigo-500/10 w-fit px-2 py-1 rounded border border-indigo-500/20">
                        <MapPin className="w-3 h-3" /> Grid Sector B-9
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-7xl font-black text-white tracking-tighter drop-shadow-lg">
                            {currentStats.temp}°
                        </span>
                        <span className="text-2xl font-medium text-gray-400">F</span>
                    </div>
                    <div className="mt-4 flex gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Humidity</span>
                            <div className="flex items-center gap-2 text-sm text-cyan-400 font-mono">
                                <Droplets className="w-3 h-3" /> 42%
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Wind</span>
                            <div className="flex items-center gap-2 text-sm text-gray-300 font-mono">
                                <Wind className="w-3 h-3" /> {currentStats.wind} mph
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="text-right flex flex-col items-end">
                    <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                        <div className="absolute inset-0 bg-white/5 rounded-full blur-xl animate-pulse" />
                        <currentStats.icon className={`w-16 h-16 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] ${currentStats.cloud < 30 ? 'animate-[spin_60s_linear_infinite]' : ''}`} />
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-[0.3em] bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                        {currentStats.label}
                    </span>
                </div>
            </div>

            {/* Tactical Decals */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500/40 w-1/3 animate-[scan-v_2s_infinite_linear]" />
            </div>
        </div>
      </div>

      <div className="px-6 space-y-6 relative z-10">
        {/* 7-Day Forecast Section */}
        <div className="bg-[#0a0f18]/80 backdrop-blur-md rounded-3xl p-1 border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-white/5 border-b border-white/5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-emerald-400" /> Strategic Outlook (7 Days)
                </h3>
                <span className="text-[8px] font-mono text-gray-600 tracking-tighter">DELTA_SYNC: 100%</span>
            </div>
            
            <div className="p-4 space-y-3">
                {dailyForecast.map((day, i) => (
                    <div key={day.date} className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 hover:bg-white/5 ${i === 0 ? 'bg-indigo-500/10 border-indigo-500/30' : 'border-transparent'}`}>
                        <div className="flex items-center gap-4 w-24">
                            <span className={`text-xs font-black tracking-widest ${i === 0 ? 'text-indigo-400' : 'text-gray-400'}`}>{day.dayName}</span>
                            <span className="text-[9px] font-mono text-gray-600">{day.date}</span>
                        </div>
                        
                        <div className="flex-1 flex items-center justify-center gap-3">
                            <day.icon className={`w-5 h-5 ${day.precipChance > 50 ? 'text-blue-400' : 'text-yellow-400'}`} />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-gray-500 uppercase">Precip</span>
                                <span className="text-[10px] font-mono text-gray-300">{day.precipChance}%</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-24 justify-end">
                            <span className="text-sm font-bold text-white font-mono">{day.high}°</span>
                            <span className="text-sm font-bold text-gray-600 font-mono">{day.low}°</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Projection Chart */}
        <div className="bg-[#0a0f18]/80 backdrop-blur-md rounded-2xl p-1 border border-white/5">
          <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3 h-3 text-indigo-400" /> 24-Hour Projection Delta
            </h3>
          </div>
          
          <div className="h-56 w-full p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyChartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickMargin={10}
                  interval={3}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  unit="°"
                  domain={['auto', 'auto']}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="temp" 
                  stroke="url(#lineGrad)" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 6, fill: '#fff', stroke: '#818cf8', strokeWidth: 2 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Multi-layered Condition Analyzer */}
        <div className="bg-[#0a0f18]/80 backdrop-blur-md rounded-2xl p-1 border border-white/5">
          <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={12} className="text-cyan-400" /> Signal Fidelity Analyzer
            </h3>
          </div>
          
          <div className="h-56 w-full p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourlyChartData} margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
                <defs>
                    <linearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                    dataKey="time" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickMargin={10}
                    interval={3}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis 
                    yAxisId="right"
                    stroke="#3b82f6" 
                    fontSize={10} 
                    unit="%"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                
                <Area 
                    yAxisId="right"
                    name="Cloud Density"
                    type="monotone" 
                    dataKey="cloud" 
                    fill="url(#cloudGrad)" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                />
                
                <Line 
                    name="Atmospheric Temp"
                    type="monotone" 
                    dataKey="temp" 
                    stroke="#fff" 
                    strokeWidth={1} 
                    strokeOpacity={0.5}
                    dot={false} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
