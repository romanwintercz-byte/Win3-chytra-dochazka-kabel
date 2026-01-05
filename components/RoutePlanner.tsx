

import React, { useState, useRef } from 'react';
import { planMotorcycleRoute, planComplexRoute, transcribeAudio } from '../services/geminiService';
import { RouteSuggestion } from '../types';
import { MapPin, Navigation, Clock, Gauge, Loader2, Mic, Square, Sparkles, Map as MapIcon, ExternalLink, AlertTriangle, Download, Share2, Play } from 'lucide-react';

interface RoutePlannerProps {
    onStartReplay?: (route: RouteSuggestion) => void;
}

const RoutePlanner: React.FC<RoutePlannerProps> = ({ onStartReplay }) => {
  const [start, setStart] = useState('');
  const [style, setStyle] = useState('kochací');
  const [duration, setDuration] = useState('2 hodiny');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [route, setRoute] = useState<RouteSuggestion | null>(null);
  
  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [voiceInstruction, setVoiceInstruction] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Manual Plan
  const handlePlan = async () => {
    if (!start) return;
    setLoading(true);
    setErrorMsg('');
    setVoiceInstruction(''); 
    try {
      const data = await planMotorcycleRoute(start, style, duration);
      setRoute(data);
    } catch (e: any) {
      setErrorMsg(e.message || "Nepodařilo se naplánovat trasu. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  };

  // Complex Plan (Voice/Text)
  const handleComplexPlan = async (instruction: string) => {
    if (!instruction) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await planComplexRoute(instruction);
      setRoute(data);
    } catch (e: any) {
      setErrorMsg(e.message || "Nepodařilo se porozumět zadání.");
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop()); // Clean up
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        setLoading(true); // Temporary loading for transcription
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            const text = await transcribeAudio(base64String, 'audio/webm');
            if (text) {
              setVoiceInstruction(text);
              handleComplexPlan(text); // Auto-submit the voice command
            } else {
              setLoading(false);
            }
          };
        } catch (e) {
          console.error(e);
          setLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      alert("Nelze spustit nahrávání. Povolte mikrofon.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const openInGoogleMaps = () => {
    if (!route || route.waypoints.length === 0) return;

    // Logic to construct the URL:
    // 1. Origin: First waypoint
    // 2. Destination: Last waypoint
    // 3. Waypoints: Everything in between
    
    // If only 1 point, treat as destination from current location
    if (route.waypoints.length === 1) {
       const dest = encodeURIComponent(route.waypoints[0].name);
       window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
       return;
    }

    const origin = encodeURIComponent(route.waypoints[0].name);
    const destination = encodeURIComponent(route.waypoints[route.waypoints.length - 1].name);
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    
    if (route.waypoints.length > 2) {
      const waypoints = route.waypoints.slice(1, -1).map(wp => encodeURIComponent(wp.name)).join('|');
      url += `&waypoints=${waypoints}`;
    }

    window.open(url, '_blank');
  };

  const generateGPXString = (): string => {
    if (!route) return "";
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MotoRideAI" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${route.name}</name>
    <desc>${route.description}</desc>
  </metadata>
  <rte>
    <name>${route.name}</name>
    ${route.waypoints.map(wp => `
    <rtept lat="${wp.lat}" lon="${wp.lng}">
      <name>${wp.name}</name>
    </rtept>`).join('')}
  </rte>
</gpx>`;
  };

  const downloadGPX = () => {
      const content = generateGPXString();
      if (!content || !route) return;

      const blob = new Blob([content], { type: 'application/gpx+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${route.name.replace(/\s+/g, '_')}_route.gpx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleShareGPX = async () => {
      const content = generateGPXString();
      if (!content || !route) return;

      const fileName = `${route.name.replace(/\s+/g, '_')}.gpx`;
      const file = new File([content], fileName, {
        type: 'application/gpx+xml'
      });

      // Try sharing if supported by browser/OS
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: route.name,
            text: 'Trasa z MotoRide AI',
          });
        } catch (error: any) {
           // Fallback to download if share is cancelled or fails
           if (error.name !== 'AbortError') {
               console.log('Share failed, downloading instead:', error);
               downloadGPX();
           }
        }
      } else {
        // Fallback for desktop or browsers without file sharing support
        downloadGPX();
      }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      
      {/* AI Voice Input Section */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>
        
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Inteligentní Plánovač
        </h2>

        <div className="flex gap-4 items-start">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-4 rounded-2xl transition-all shadow-lg shrink-0 ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse text-white' 
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6" />}
          </button>
          
          <div className="flex-1 space-y-2">
            <p className="text-sm text-slate-400">
              {isRecording ? "Poslouchám..." : "Řekni mi svou představu. Např: \"Okruh kolem Teplic na 3 hodiny, hlavně zatáčky, dobrý asfalt a oběd s výhledem.\""}
            </p>
            {voiceInstruction && (
              <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-700 text-slate-200 text-sm italic">
                "{voiceInstruction}"
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-px bg-slate-800 flex-1"></div>
        <span className="text-xs text-slate-600 font-bold uppercase">nebo klasicky</span>
        <div className="h-px bg-slate-800 flex-1"></div>
      </div>

      {/* Manual Input Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl opacity-80 hover:opacity-100 transition-opacity">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-300">
          <MapPin className="w-5 h-5" />
          Manuální Zadání
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Startovní pozice</label>
            <input 
              type="text" 
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="Např. Praha, Brno..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Styl jízdy</label>
              <select 
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="zatáčky">Hodně zatáček</option>
                <option value="kochací">Kochací</option>
                <option value="rychlý">Rychlý přesun</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Délka</label>
              <select 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="1 hodina">1 hodina</option>
                <option value="2 hodiny">2 hodiny</option>
                <option value="půl dne">Půl dne</option>
                <option value="celý den">Celý den</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handlePlan}
            disabled={loading || !start}
            className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading && !isRecording ? <Loader2 className="animate-spin" /> : <Navigation className="w-5 h-5" />}
            Naplánovat trasu
          </button>
        </div>
      </div>

      {/* Result Card */}
      {loading && (
        <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400 animate-pulse">
                {isRecording ? "Nahrávám..." : voiceInstruction ? "Analyzuji hlasový požadavek a hledám nejlepší zatáčky..." : "Generuji trasu a počítám GPX souřadnice..."}
            </p>
        </div>
      )}

      {errorMsg && !loading && (
          <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
              <div>
                  <h3 className="font-bold text-red-500">Chyba plánování</h3>
                  <p className="text-red-300 text-sm mt-1">{errorMsg}</p>
              </div>
          </div>
      )}

      {route && !loading && !errorMsg && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
          <div className="relative h-48 bg-slate-900 group cursor-pointer" onClick={() => onStartReplay && onStartReplay(route)}>
            <img 
              src="https://picsum.photos/800/400?grayscale&blur=2" 
              alt="Route map placeholder" 
              className="w-full h-full object-cover opacity-60 transition-opacity group-hover:opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
            
            {/* 3D Play Button Overlay - ALWAYS VISIBLE NOW */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-amber-600/90 hover:bg-amber-500 text-white p-4 rounded-full shadow-2xl backdrop-blur-sm border-4 border-slate-900/50 transition-transform hover:scale-110">
                    <Play className="w-8 h-8 fill-current ml-1" />
                </div>
            </div>
            
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-amber-500 border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                3D REPLAY
            </div>

            <div className="absolute bottom-0 left-0 w-full p-6">
              <h3 className="text-2xl font-bold text-white shadow-sm">{route.name}</h3>
              <div className="flex items-center gap-4 mt-2 text-amber-400">
                <span className="flex items-center gap-1 text-sm bg-slate-900/50 px-2 py-1 rounded-md backdrop-blur-md"><Gauge className="w-4 h-4" /> {route.distance}</span>
                <span className="flex items-center gap-1 text-sm bg-slate-900/50 px-2 py-1 rounded-md backdrop-blur-md"><Clock className="w-4 h-4" /> {route.duration}</span>
                <span className="bg-amber-500 text-slate-900 px-2 py-0.5 rounded text-xs font-bold">{route.difficulty}</span>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <p className="text-slate-300 leading-relaxed">{route.description}</p>
            
            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={openInGoogleMaps}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
                >
                    <MapIcon className="w-5 h-5" />
                    Google Maps
                    <ExternalLink className="w-3 h-3 opacity-70" />
                </button>
                <button 
                    onClick={handleShareGPX}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-xl transition flex flex-col md:flex-row items-center justify-center gap-2 shadow-lg shadow-amber-900/20 text-center"
                >
                    <div className="flex items-center gap-2">
                      <Share2 className="w-5 h-5" />
                      <span>Otevřít v App</span>
                    </div>
                    <span className="text-[10px] opacity-70 font-normal inline text-amber-100">(Mapy.cz / GPX)</span>
                </button>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-3">Itinerář</h4>
              <div className="relative pl-4 border-l-2 border-slate-700 space-y-4">
                {route.waypoints.map((wp, idx) => (
                  <div key={idx} className="relative group">
                    <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        idx === 0 || idx === route.waypoints.length - 1 ? 'bg-amber-500 ring-2 ring-amber-500/20' : 'bg-slate-600'
                    }`}></span>
                    <div className="flex justify-between items-start">
                        <p className={`text-sm ${
                            idx === 0 || idx === route.waypoints.length - 1 ? 'text-white font-medium' : 'text-slate-400'
                        }`}>{wp.name}</p>
                        {wp.lat && (
                            <span className="text-[10px] text-slate-600 font-mono hidden group-hover:block transition">
                                {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                            </span>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-700">
              <div className="flex items-center gap-2">
                 <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Scenérie</span>
                    <span className="text-xl font-bold text-white">{route.scenicScore}/10</span>
                 </div>
              </div>
              <button className="text-slate-400 hover:text-white text-sm transition flex items-center gap-2">
                Uložit do oblíbených
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutePlanner;