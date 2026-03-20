import React from 'react';
import { Rock, RockType } from '../types';
import { ArrowLeft, Rss, Layers, Zap, Hexagon, Component, Info, MapPin, X } from 'lucide-react';

interface RockComparisonProps {
  rocksToCompare: Rock[];
  onBack: () => void;
}

interface ComparisonItemProps {
  rock: Rock;
  isReference?: boolean; // Highlight one as potential reference
}

// -- MICRO COMPONENT: COMPARISON ITEM --
const ComparisonItem: React.FC<ComparisonItemProps> = ({ rock, isReference }) => {
  const isLegendary = rock.rarityScore > 80;
  const isRare = rock.rarityScore > 50 && rock.rarityScore <= 80;

  const borderColor = isLegendary ? 'border-amber-500/50' : isRare ? 'border-indigo-500/50' : 'border-white/10';
  const headerBg = isLegendary ? 'bg-amber-900/20' : isRare ? 'bg-indigo-900/20' : 'bg-black/20';
  const headerText = isLegendary ? 'text-amber-400' : isRare ? 'text-indigo-400' : 'text-cyan-400';
  const headerAccent = isLegendary ? 'shadow-amber-500/30' : isRare ? 'shadow-indigo-500/30' : 'shadow-cyan-500/30';

  return (
    <div className={`relative flex-1 bg-[#0a0f18]/80 border ${borderColor} rounded-2xl overflow-hidden shadow-xl ${isReference ? 'ring-2 ring-purple-500 shadow-purple-500/40' : ''}`}>
      {isReference && (
        <div className="absolute top-2 right-2 px-3 py-1 bg-purple-600/30 border border-purple-500/50 rounded-full text-[8px] font-bold text-purple-300 uppercase tracking-widest z-10">
          REFERENCE
        </div>
      )}

      {/* Header with Image */}
      <div className={`relative h-40 ${headerBg} border-b ${borderColor}`}>
        <img 
          src={rock.imageUrl} 
          alt={rock.name} 
          className="w-full h-full object-cover opacity-60" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h3 className={`text-xl font-bold text-white tracking-tight ${headerText}`}>{rock.name}</h3>
          <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{rock.scientificName || 'UNKNOWN'}</p>
        </div>
        <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-current to-transparent ${headerText} ${headerAccent}`} />
      </div>

      {/* Attributes Grid */}
      <div className="p-4 space-y-3 text-xs font-mono text-gray-300">
        <ComparisonAttribute icon={Layers} label="Class" value={rock.type} color="cyan" />
        <ComparisonAttribute icon={Zap} label="Rarity" value={`${rock.rarityScore} PTS`} color="orange" />
        <ComparisonAttribute icon={Hexagon} label="Hardness" value={`${rock.hardness} / 10 Mohs`} color="indigo" />
        <ComparisonAttribute icon={Component} label="Composition" value={rock.composition.slice(0, 2).join(', ') + (rock.composition.length > 2 ? '...' : '')} color="emerald" />
        <ComparisonAttribute icon={Info} label="Color" value={rock.color.join(', ').slice(0, 20) + (rock.color.join(', ').length > 20 ? '...' : '')} color="red" />
        {rock.location && <ComparisonAttribute icon={MapPin} label="Location" value={`${rock.location.lat.toFixed(2)}, ${rock.location.lng.toFixed(2)}`} color="purple" />}
      </div>
    </div>
  );
};

// -- MICRO COMPONENT: COMPARISON ATTRIBUTE --
const ComparisonAttribute: React.FC<{ icon: any, label: string, value: string, color: string }> = ({ icon: Icon, label, value, color }) => {
  const colorClasses: any = {
    cyan: 'text-cyan-400',
    orange: 'text-orange-400',
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  };
  return (
    <div className="flex items-center gap-3 p-2 rounded bg-black/30 border border-white/5">
      <Icon size={14} className={`${colorClasses[color]} flex-none`} />
      <span className="text-[9px] uppercase tracking-wider text-gray-500 flex-none">{label}:</span>
      <span className="flex-1 truncate text-white">{value}</span>
    </div>
  );
};

export const RockComparison: React.FC<RockComparisonProps> = ({ rocksToCompare, onBack }) => {
  if (!rocksToCompare || rocksToCompare.length < 2) {
    // Should not happen with proper App.tsx logic, but graceful fallback
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#030508]">
        <X className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">COMPARISON ERROR</h2>
        <p className="text-gray-400">Please select at least two rocks to compare.</p>
        <button onClick={onBack} className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-bold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#030508] relative overflow-y-auto no-scrollbar font-sans selection:bg-purple-500/30">
      <style>{`
        .bg-comparison-grid {
            background-image: 
                linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px);
            background-size: 30px 30px;
        }
      `}</style>
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-comparison-grid pointer-events-none opacity-20" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-20 px-6 pt-20 pb-4 flex-none bg-gradient-to-b from-[#030508] via-[#030508]/90 to-transparent">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white tracking-widest font-mono flex items-center gap-3">
            <Rss className="w-6 h-6 text-purple-500 animate-pulse" />
            COMPARE_LOG
          </h2>
          <button 
            onClick={onBack}
            className="p-3 rounded-full bg-purple-900/40 border border-purple-500/50 backdrop-blur-md hover:bg-purple-800/50 hover:border-purple-300/50 transition-all group/back"
          >
            <ArrowLeft className="w-5 h-5 text-purple-400 group-hover/back:-translate-x-1 transition-transform" />
          </button>
        </div>
        <p className="text-[10px] text-purple-500/60 font-mono tracking-[0.2em] mt-1">
          SPECIMEN DELTA ANALYSIS // {rocksToCompare.length} ASSETS
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 pb-24 relative z-10">
        {rocksToCompare.map((rock, index) => (
          <ComparisonItem key={rock.id} rock={rock} isReference={index === 0 && rocksToCompare.length > 1} />
        ))}
      </div>
    </div>
  );
};