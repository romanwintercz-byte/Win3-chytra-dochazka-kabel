import React, { useState, useEffect, useRef } from 'react';
import { X, Navigation, Mic, Play, Pause, SkipForward, SkipBack } from 'lucide-react';

interface GloveModeProps {
  onExit: () => void;
}

const GloveMode: React.FC<GloveModeProps> = ({ onExit }) => {
  const [speed, setSpeed] = useState<number>(0);
  const [time, setTime] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // GPS Speedometer
  useEffect(() => {
    if ('geolocation' in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          // Speed is in m/s, convert to km/h (multiply by 3.6)
          const speedKmh = position.coords.speed ? Math.round(position.coords.speed * 3.6) : 0;
          setSpeed(speedKmh);
          if (position.coords.heading) {
            setHeading(position.coords.heading);
          }
        },
        (error) => {
          console.error("GPS Error", error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 5000
        }
      );
    }
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  const openMaps = () => {
    window.open('https://www.google.com/maps', '_blank');
  };

  const toggleMusic = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 text-white flex flex-col p-4 animate-fade-in">
      {/* Top Bar: Time & Exit */}
      <div className="flex justify-between items-start mb-6">
        <div className="text-6xl font-bold font-mono tracking-tighter text-slate-200">
          {time}
        </div>
        <button 
          onClick={onExit}
          className="bg-slate-800 hover:bg-red-600 active:bg-red-700 transition-colors w-24 h-24 rounded-2xl flex items-center justify-center border-2 border-slate-700"
        >
          <X className="w-12 h-12" />
        </button>
      </div>

      {/* Main Speedometer Area */}
      <div className="flex-1 flex flex-col items-center justify-center mb-8 relative">
         <div className="absolute inset-0 bg-amber-500/5 blur-3xl rounded-full"></div>
         <div className="relative z-10 text-center">
            <span className="text-[180px] leading-none font-black text-white tracking-tighter drop-shadow-2xl">
              {speed}
            </span>
            <span className="text-4xl font-bold text-amber-500 block uppercase tracking-widest mt-2">
              km/h
            </span>
         </div>
         {heading !== null && (
            <div className="mt-8 text-2xl text-slate-500 font-mono">
               {heading.toFixed(0)}°
            </div>
         )}
      </div>

      {/* Music Controls (Simulated) */}
      <div className="bg-slate-900/80 rounded-3xl p-4 mb-4 flex items-center justify-between border border-slate-800">
         <button className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center active:bg-amber-600 transition text-slate-300 active:text-white">
            <SkipBack className="w-10 h-10 fill-current" />
         </button>
         
         <button 
            onClick={toggleMusic}
            className={`flex-1 mx-4 h-24 rounded-2xl flex items-center justify-center transition border-2 ${
                isPlaying 
                ? 'bg-amber-500 border-amber-500 text-black shadow-[0_0_30px_rgba(245,158,11,0.4)]' 
                : 'bg-slate-800 border-slate-700 text-white'
            }`}
         >
            {isPlaying ? <Pause className="w-12 h-12 fill-current" /> : <Play className="w-12 h-12 fill-current ml-2" />}
         </button>

         <button className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center active:bg-amber-600 transition text-slate-300 active:text-white">
            <SkipForward className="w-10 h-10 fill-current" />
         </button>
      </div>

      {/* Bottom Actions */}
      <div className="grid grid-cols-2 gap-4 h-40">
        <button 
          onClick={openMaps}
          className="bg-blue-600 active:bg-blue-500 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-lg transition"
        >
          <Navigation className="w-12 h-12" />
          <span className="text-xl font-bold uppercase">Navigace</span>
        </button>

        <button 
          className="bg-slate-800 active:bg-slate-700 border-2 border-slate-700 rounded-3xl flex flex-col items-center justify-center gap-2 transition"
          onClick={() => alert("Hlasové ovládání aktivní")}
        >
          <Mic className="w-12 h-12 text-amber-500" />
          <span className="text-xl font-bold uppercase text-slate-300">Povel</span>
        </button>
      </div>
    </div>
  );
};

export default GloveMode;