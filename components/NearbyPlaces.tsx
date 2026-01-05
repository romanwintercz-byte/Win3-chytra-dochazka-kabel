import React, { useState, useEffect, useRef } from 'react';
import { findBikerPlaces, transcribeAudio } from '../services/geminiService';
import { PlaceResult } from '../types';
import { Map, Search, Fuel, Coffee, Wrench, ExternalLink, Loader2, MapPin, Mic, Square } from 'lucide-react';

const NearbyPlaces: React.FC = () => {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [aiText, setAiText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Geolocation error", err)
      );
    }
  }, []);

  const handleSearch = async (term: string) => {
    if (!coords) {
      alert("Pro vyhledávání v okolí musíte povolit polohu.");
      return;
    }
    if (!term.trim()) return;

    setLoading(true);
    setQuery(term); 
    try {
      const result = await findBikerPlaces(term, coords.lat, coords.lng);
      setAiText(result.text);
      setPlaces(result.places);
    } catch (e) {
      console.error(e);
      setAiText("Omlouváme se, došlo k chybě při vyhledávání.");
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Process audio
        setLoading(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            const text = await transcribeAudio(base64String, 'audio/webm');
            if (text) {
              setQuery(text);
              handleSearch(text);
            } else {
              setAiText("Nebylo rozumět, zkuste to prosím znovu.");
              setLoading(false);
            }
          };
        } catch (e) {
          console.error("Transcription failed", e);
          setLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Microphone access denied", e);
      alert("Pro diktování musíte povolit mikrofon.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 text-amber-500">
          <Map className="w-6 h-6" />
          Biker Radar
        </h2>
        <p className="text-slate-400 mb-6 text-sm">Najdi nejlepší zastávky, benzínky a servisy v tvém okolí.</p>
        
        {/* Preset Buttons */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => handleSearch("Benzínové pumpy s kvalitním palivem")}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-full text-sm whitespace-nowrap transition"
          >
            <Fuel className="w-4 h-4 text-red-400" /> Benzín
          </button>
          <button 
             onClick={() => handleSearch("Biker friendly kavárny a restaurace s parkováním")}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-full text-sm whitespace-nowrap transition"
          >
            <Coffee className="w-4 h-4 text-amber-400" /> Kavárny
          </button>
           <button 
             onClick={() => handleSearch("Motocyklový servis a pneuservis")}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-full text-sm whitespace-nowrap transition"
          >
            <Wrench className="w-4 h-4 text-blue-400" /> Servis
          </button>
        </div>

        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
              placeholder={isRecording ? "Poslouchám..." : "Napiš co hledáš (nebo použij mikrofon)..."}
              className={`w-full bg-slate-950 border rounded-xl px-4 py-3 pl-11 text-slate-100 focus:outline-none transition-all ${
                isRecording 
                  ? "border-red-500 ring-2 ring-red-500/20" 
                  : "border-slate-700 focus:ring-2 focus:ring-amber-500"
              }`}
            />
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
            
            {/* Mic Button */}
            {isRecording ? (
               <button 
                onClick={stopRecording}
                className="absolute right-2 top-2 bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-lg transition animate-pulse"
              >
                <Square className="w-5 h-5 fill-current" />
              </button>
            ) : (
              <button 
                onClick={startRecording}
                disabled={loading}
                className="absolute right-2 top-2 text-slate-400 hover:text-amber-500 hover:bg-slate-800 p-1.5 rounded-lg transition"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>

          <button 
            onClick={() => handleSearch(query)}
            disabled={loading || !coords}
            className="bg-amber-600 hover:bg-amber-500 text-white px-4 rounded-xl transition disabled:opacity-50 flex items-center justify-center min-w-[50px]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </div>
        
        {!coords && (
            <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Povolte polohu pro vyhledávání.
            </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* AI Summary */}
        {aiText && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 md:col-span-2">
             <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-500" /> Doporučení AI
             </h3>
             <p className="text-slate-300 text-sm leading-relaxed">{aiText}</p>
          </div>
        )}

        {/* Place Cards */}
        {places.map((place, idx) => (
          <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-amber-500/50 transition group">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-white group-hover:text-amber-400 transition">{place.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">{place.address || "Adresa nedostupná"}</p>
                </div>
                <a 
                    href={place.uri} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-slate-700 p-2 rounded-lg hover:bg-amber-600 text-slate-300 hover:text-white transition"
                >
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import { Bot } from 'lucide-react';

export default NearbyPlaces;