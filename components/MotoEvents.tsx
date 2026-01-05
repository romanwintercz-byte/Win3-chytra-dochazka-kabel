import React, { useEffect, useState } from 'react';
import { findUpcomingEvents } from '../services/geminiService';
import { MotoEvent } from '../types';
import { Calendar, MapPin, ExternalLink, Navigation, Loader2, Tag, AlertCircle, RefreshCw, Search, Info } from 'lucide-react';

const MotoEvents: React.FC = () => {
  const [events, setEvents] = useState<MotoEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [locationFilter, setLocationFilter] = useState('Česká republika');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage on mount
    const cached = localStorage.getItem('moto_events_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setEvents(parsed.events);
        setLastUpdated(parsed.timestamp);
        if (parsed.location) setLocationFilter(parsed.location);
      } catch (e) {
        console.error("Cache parse error");
      }
    } else {
      // If no cache, fetch initial
      loadEvents();
    }
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await findUpcomingEvents(locationFilter);
      if (data.length === 0) {
          // If empty but no error thrown, it's just no results
      } 
      setEvents(data);
      const timestamp = new Date().toLocaleString('cs-CZ');
      setLastUpdated(timestamp);
      localStorage.setItem('moto_events_cache', JSON.stringify({
        events: data,
        timestamp: timestamp,
        location: locationFilter
      }));
    } catch (e: any) {
      setErrorMsg(e.message || "Nepodařilo se načíst akce.");
    } finally {
      setLoading(false);
    }
  };

  const openNavigation = (location: string) => {
     const dest = encodeURIComponent(location);
     window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl h-48 md:h-64 flex items-center">
        <img 
            src="https://picsum.photos/seed/motomeet/1200/400?grayscale&blur=2" 
            alt="Moto meet" 
            className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>
        <div className="relative z-10 p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Calendar className="w-8 h-8 md:w-10 md:h-10 text-amber-500" />
                Kalendář akcí
            </h2>
            <p className="text-slate-300 max-w-lg text-lg">
                Srazy, vyjížďky a party. Najdi to nejlepší ve svém okolí.
            </p>
        </div>
      </div>

      {/* Filter & Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
        <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <input 
                type="text" 
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadEvents()}
                placeholder="Lokalita (např. Jižní Čechy, Brno...)"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto justify-between">
             {lastUpdated && (
                <span className="text-xs text-slate-500 hidden md:block">
                    Aktualizováno: {lastUpdated}
                </span>
             )}
             <button 
                onClick={loadEvents}
                disabled={loading}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-lg font-bold transition disabled:opacity-50 whitespace-nowrap w-full md:w-auto justify-center"
             >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {loading ? "Hledám..." : "Aktualizovat"}
             </button>
        </div>
      </div>

      {/* Content */}
      {loading && events.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 bg-slate-800/50 rounded-xl border border-slate-800 animate-pulse flex flex-col p-6 space-y-4">
                    <div className="flex justify-between">
                        <div className="w-24 h-6 bg-slate-700 rounded"></div>
                        <div className="w-8 h-8 bg-slate-700 rounded-full"></div>
                    </div>
                    <div className="w-3/4 h-8 bg-slate-700 rounded"></div>
                    <div className="w-full h-12 bg-slate-700 rounded"></div>
                </div>
            ))}
        </div>
      ) : errorMsg ? (
        <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800 px-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-300">Chyba</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">{errorMsg}</p>
            <button 
                onClick={loadEvents}
                className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg font-bold transition"
            >
                Zkusit znovu
            </button>
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {events.map((evt, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-amber-500/50 transition duration-300 shadow-lg group flex flex-col">
                    <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> {evt.date}
                            </span>
                            {evt.link && (
                                <a href={evt.link} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition">
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                            )}
                        </div>
                        
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition">{evt.name}</h3>
                        
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                            <MapPin className="w-4 h-4 text-slate-500" />
                            {evt.location}
                        </div>

                        <p className="text-slate-300 text-sm leading-relaxed mb-4 line-clamp-4">
                            {evt.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-auto">
                            {evt.tags?.map((tag, tIdx) => (
                                <span key={tIdx} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded flex items-center gap-1">
                                    <Tag className="w-3 h-3 opacity-50" /> {tag}
                                </span>
                            ))}
                        </div>
                        
                        {/* Sources Compliance */}
                        {evt.sourceUrls && evt.sourceUrls.length > 0 && (
                            <div className="mt-4 pt-2 border-t border-slate-800/50 flex items-center gap-1 text-[10px] text-slate-600">
                                <Info className="w-3 h-3 shrink-0" />
                                <span className="shrink-0">Zdroj:</span>
                                <a href={evt.sourceUrls[0]} target="_blank" rel="noreferrer" className="hover:text-amber-500 truncate underline">
                                    {new URL(evt.sourceUrls[0]).hostname}
                                </a>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => openNavigation(evt.location)}
                        className="bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 py-3 px-6 transition font-medium text-sm flex items-center justify-center gap-2 border-t border-slate-800"
                    >
                        <Navigation className="w-4 h-4" />
                        Naplánovat cestu
                    </button>
                </div>
            ))}
            {events.length === 0 && !loading && !errorMsg && (
                <div className="col-span-1 md:col-span-2 text-center py-10 text-slate-500">
                    Pro zadanou lokalitu "{locationFilter}" se nenašly žádné aktuální akce.
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default MotoEvents;