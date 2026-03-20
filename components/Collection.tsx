
import React, { useMemo, useState, useEffect, useRef, useCallback, memo } from 'react';
import { Rock, RockType } from '../types';
import { Search, ArrowUpDown, Loader2, Sparkles, Box, Star, Database, ScanLine, Plus, X, Target, Activity, Cpu, ShieldCheck, Microscope, Atom, FilePlus2, Filter, Scale } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVirtualizer } from '@tanstack/react-virtual';
import { playSound } from '../services/audioUtils';

function useInView(options: IntersectionObserverInit = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), options);
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, [options]);
  return [ref, inView] as const;
}

interface CollectionProps {
    rocks: Rock[];
    onRockClick: (rock: Rock) => void;
    onCompare: (rocks: Rock[]) => void;
}

export const Collection: React.FC<CollectionProps> = ({ rocks, onRockClick, onCompare }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTypes, setFilterTypes] = useState<Set<RockType>>(new Set<RockType>());
  const [rarityRange, setRarityRange] = useState<[number, number]>([0, 100]);
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'RARITY_DESC' | 'RARITY_ASC'>('DATE_DESC');
  
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [selectedRocks, setSelectedRocks] = useState<Rock[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const parentRef = useRef<HTMLDivElement>(null);

  // Restore scroll position
  useEffect(() => {
      const savedScroll = sessionStorage.getItem('vault_scroll_pos');
      if (savedScroll && parentRef.current) {
          parentRef.current.scrollTop = parseInt(savedScroll);
      }
  }, []);

  // Save scroll position on unmount/change
  const handleScroll = () => {
      if (parentRef.current) {
          sessionStorage.setItem('vault_scroll_pos', parentRef.current.scrollTop.toString());
      }
  };

  const sortedAndFilteredRocks = useMemo(() => {
    return rocks.filter((r: any) => {
      const match = r.name.toLowerCase().includes(searchTerm.toLowerCase());
      const typeMatch = filterTypes.size === 0 || filterTypes.has(r.type);
      const rarityMatch = r.rarityScore >= rarityRange[0] && r.rarityScore <= rarityRange[1];

      return match && typeMatch && rarityMatch;
    }).sort((a: any, b: any) => {
      if (sortBy === 'DATE_DESC') return b.dateFound - a.dateFound;
      if (sortBy === 'DATE_ASC') return a.dateFound - b.dateFound;
      if (sortBy === 'RARITY_DESC') return b.rarityScore - a.rarityScore;
      if (sortBy === 'RARITY_ASC') return a.rarityScore - b.rarityScore;
      return 0;
    });
  }, [rocks, searchTerm, filterTypes, rarityRange, sortBy]);

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(sortedAndFilteredRocks.length / 2),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280,
    overscan: 5,
  });

  const handleToggleSelection = useCallback((rock: Rock) => {
    playSound('click');
    setSelectedRocks(prev => {
        const exists = prev.find(r => r.id === rock.id);
        if (exists) {
            return prev.filter(r => r.id !== rock.id);
        } else {
            if (prev.length >= 3) {
                toast.error("Max 3 specimens for comparison.");
                return prev;
            }
            return [...prev, rock];
        }
    });
  }, []);

  const handleToggleCompareMode = () => {
      playSound('click');
      if (isComparisonMode) {
          setSelectedRocks([]); // Clear selection when exiting
          setIsComparisonMode(false);
      } else {
          setIsComparisonMode(true);
          toast.success("Select up to 3 specimens", { icon: '⚖️' });
      }
  };

  const handleExecuteComparison = () => {
      playSound('success');
      onCompare(selectedRocks);
  };

  const handleQuickAdd = () => {
      playSound('click');
      toast.success("Manual Entry Protocol Initiated (Stub)", { icon: '📝' });
  };

  return (
    <div className="h-full flex flex-col bg-[#030508] relative overflow-hidden">
      <div className="relative z-20 px-6 pt-20 pb-4 space-y-4 bg-gradient-to-b from-[#030508] to-transparent">
        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-white tracking-widest font-mono flex items-center gap-3">
            <Database className="w-6 h-6 text-cyan-500 animate-pulse" /> RHG VAULT
            </h2>
            <div className="flex gap-2">
                 <button 
                    onClick={handleToggleCompareMode}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-full text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all ${isComparisonMode ? 'bg-purple-600 border-purple-400 text-white' : 'bg-black/40 border-white/10 text-gray-400'}`}
                >
                    <Scale size={14} /> {isComparisonMode ? 'Cancel' : 'Compare'}
                </button>
                <button 
                    onClick={handleQuickAdd}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600/20 border border-indigo-500/50 rounded-full text-[10px] font-black uppercase tracking-wider text-indigo-300 active:scale-95 transition-all"
                >
                    <FilePlus2 size={14} /> Entry
                </button>
            </div>
        </div>
        
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                    type="text" placeholder="SEARCH_ARCHIVE..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-xs font-mono text-white w-full focus:border-cyan-500/50 outline-none transition-colors"
                />
            </div>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 rounded-xl border transition-all ${showFilters ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-black/40 border-white/5 text-gray-400'}`}
            >
                <Filter size={18} />
            </button>
        </div>

        {showFilters && (
            <div className="bg-black/60 border border-white/5 rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Target size={12} /> Rarity Score Range
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">{rarityRange[0]} - {rarityRange[1]}</span>
                    </div>
                    <div className="flex gap-4 items-center">
                        <input 
                            type="range" min="0" max="100" value={rarityRange[0]} 
                            onChange={e => setRarityRange([parseInt(e.target.value), rarityRange[1]])}
                            className="flex-1 accent-cyan-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                        />
                        <input 
                            type="range" min="0" max="100" value={rarityRange[1]} 
                            onChange={e => setRarityRange([rarityRange[0], parseInt(e.target.value)])}
                            className="flex-1 accent-cyan-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                        />
                    </div>
                    <div className="flex justify-between gap-1">
                        {[
                            { label: 'ALL', range: [0, 100] },
                            { label: 'COMMON', range: [0, 40] },
                            { label: 'UNCOMMON', range: [41, 70] },
                            { label: 'RARE', range: [71, 90] },
                            { label: 'LEGENDARY', range: [91, 100] }
                        ].map(tier => (
                            <button 
                                key={tier.label}
                                onClick={() => { playSound('click'); setRarityRange(tier.range as [number, number]); }}
                                className={`flex-1 py-1 rounded text-[8px] font-bold border transition-all ${rarityRange[0] === tier.range[0] && rarityRange[1] === tier.range[1] ? 'bg-white/10 border-white/20 text-white' : 'bg-black/40 border-white/5 text-gray-600'}`}
                            >
                                {tier.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <ArrowUpDown size={12} /> Sort By
                        </span>
                        <select 
                            value={sortBy} 
                            onChange={e => setSortBy(e.target.value as any)}
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-2 text-[10px] font-mono text-white outline-none focus:border-cyan-500/50"
                        >
                            <option value="DATE_DESC">NEWEST_FIRST</option>
                            <option value="DATE_ASC">OLDEST_FIRST</option>
                            <option value="RARITY_DESC">RARITY_HIGH_LOW</option>
                            <option value="RARITY_ASC">RARITY_LOW_HIGH</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Microscope size={12} /> Quick Actions
                        </span>
                        <button 
                            onClick={() => { setSearchTerm(''); setFilterTypes(new Set()); setRarityRange([0, 100]); setSortBy('DATE_DESC'); }}
                            className="w-full bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-2 text-[10px] font-mono text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                            RESET_FILTERS
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {Object.values(RockType).map(type => (
                <button key={type} onClick={() => { playSound('click'); setFilterTypes(prev => { const n = new Set(prev); n.has(type) ? n.delete(type) : n.add(type); return n; }); }} className={`px-4 py-2 rounded-xl text-[9px] font-black border whitespace-nowrap transition-all ${filterTypes.has(type) ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-black/60 border-white/5 text-gray-500 hover:border-white/20'}`}>{type}</button>
            ))}
        </div>
      </div>

      <div ref={parentRef} onScroll={handleScroll} className="flex-1 overflow-y-auto no-scrollbar px-6 pb-24">
        {sortedAndFilteredRocks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4 pb-20">
                <ScanLine size={48} className="opacity-20" />
                <p className="text-xs font-mono uppercase tracking-widest">No specimens found in this sector</p>
            </div>
        ) : (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map(row => {
                const items = sortedAndFilteredRocks.slice(row.index * 2, row.index * 2 + 2);
                return (
                <div key={row.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${row.size}px`, transform: `translateY(${row.start}px)` }} className="grid grid-cols-2 gap-4 py-2">
                    {items.map(rock => (
                        <SpecimenCard 
                            key={rock.id} rock={rock} 
                            onClick={() => isComparisonMode ? handleToggleSelection(rock) : onRockClick(rock)} 
                            isSelected={selectedRocks.some(r => r.id === rock.id)}
                            selectionIndex={selectedRocks.findIndex(r => r.id === rock.id)}
                            isCompareMode={isComparisonMode}
                        />
                    ))}
                </div>
                );
            })}
            </div>
        )}
      </div>

      {/* Floating Action Button for Comparison */}
      {isComparisonMode && selectedRocks.length > 0 && (
          <div className="absolute bottom-24 left-0 right-0 z-50 flex justify-center animate-in slide-in-from-bottom-10 fade-in">
              <button 
                onClick={handleExecuteComparison}
                className="bg-purple-600 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs shadow-[0_0_30px_rgba(147,51,234,0.5)] border border-purple-400 active:scale-95 transition-all flex items-center gap-3 hover:bg-purple-500"
              >
                  <Scale size={16} /> Compare Selected ({selectedRocks.length}/3)
              </button>
          </div>
      )}
    </div>
  );
};

const SpecimenCard = memo(({ rock, onClick, isSelected, selectionIndex, isCompareMode }: any) => {
    const [ref, inView] = useInView({ threshold: 0.1 });
    return (
        <div ref={ref} onClick={() => { onClick(); }} className={`relative aspect-[3/4] rounded-2xl border ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-900/20' : 'border-white/5 bg-gray-900/40'} overflow-hidden transition-all duration-300 active:scale-95 group`}>
            {inView && <img src={rock.imageUrl} className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-80' : 'opacity-60'}`} loading="lazy" />}
            
            {/* Compare Mode Checkbox UI */}
            {isCompareMode && (
                <div className={`absolute top-2 left-2 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-600 border-purple-500' : 'bg-black/60 border-white/20'}`}>
                    {isSelected && <span className="text-[10px] font-black text-white">{selectionIndex + 1}</span>}
                </div>
            )}
            
            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black ${rock.rarityScore >= 80 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'bg-black/40 border-white/10 text-cyan-400'}`}>
                    {rock.rarityScore}
                </div>
                {rock.type === RockType.SYNTHETIC && <Atom size={12} className="text-indigo-400 animate-spin-slow" />}
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
                <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">{rock.type}</span>
                <h3 className="text-xs font-bold text-white uppercase truncate">{rock.name}</h3>
            </div>
        </div>
    );
});
