import React, { useState, useEffect, useRef } from 'react';
import { EmergencyContact } from '../types';
import { Phone, MapPin, X, Siren, Zap, Send, AlertTriangle, Copy, Check } from 'lucide-react';

interface SOSModalProps {
  contacts: EmergencyContact[];
  onClose: () => void;
}

const SOSModal: React.FC<SOSModalProps> = ({ contacts, onClose }) => {
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [address, setAddress] = useState<string>("Zjišťuji polohu...");
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [copied, setCopied] = useState(false);

  // Audio Context for Siren
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    // 1. Get Location immediately
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          setAddress(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        },
        (err) => {
          setAddress("Poloha nedostupná");
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Siren Logic
  const toggleSiren = () => {
    if (isSirenActive) {
      // Stop
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      }
      setIsSirenActive(false);
    } else {
      // Start
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        
        // Modulate frequency for siren effect
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 2; // Speed of siren
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 600; // Depth of siren
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        oscillatorRef.current = osc;
        gainNodeRef.current = gain;
        setIsSirenActive(true);
      } catch (e) {
        console.error("Audio API error", e);
      }
    }
  };

  // Flashlight Logic (Screen strobing)
  useEffect(() => {
    let interval: number;
    if (isFlashActive) {
      interval = window.setInterval(() => {
        document.body.classList.toggle('bg-white');
        document.body.classList.toggle('invert'); // High contrast toggle
      }, 300);
    } else {
      document.body.classList.remove('bg-white');
      document.body.classList.remove('invert');
    }
    return () => {
      clearInterval(interval);
      document.body.classList.remove('bg-white');
      document.body.classList.remove('invert');
    };
  }, [isFlashActive]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (oscillatorRef.current) oscillatorRef.current.stop();
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const copyLocation = () => {
      if(coords) {
          navigator.clipboard.writeText(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const getSmsLink = (phone: string) => {
    const text = coords 
      ? `SOS! Potrebuji pomoc. Moje poloha: https://www.google.com/maps?q=${coords.lat},${coords.lng}`
      : `SOS! Potrebuji pomoc. Nemam GPS souradnice.`;
    
    // Check for iOS
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIos ? '&' : '?';
    
    return `sms:${phone}${separator}body=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-fade-in">
      {/* Visual Strobe Overlay */}
      {isFlashActive && (
          <div className="absolute inset-0 z-0 bg-white animate-[pulse_0.1s_ease-in-out_infinite]"></div>
      )}

      {/* Header */}
      <div className="relative z-10 bg-red-600 p-6 flex items-center justify-between shadow-2xl">
        <h2 className="text-3xl font-black text-white flex items-center gap-3">
          <AlertTriangle className="w-10 h-10 fill-white text-red-600" />
          Nouzový Režim
        </h2>
        <button 
          onClick={onClose} 
          className="bg-red-800/50 hover:bg-red-800 text-white p-2 rounded-full transition"
        >
          <X className="w-8 h-8" />
        </button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        
        {/* Main 112 Button */}
        <a 
          href="tel:112"
          className="bg-red-600 hover:bg-red-500 text-white rounded-3xl p-8 flex flex-col items-center justify-center gap-2 shadow-lg shadow-red-900/50 transition transform active:scale-95"
        >
          <Phone className="w-16 h-16 animate-pulse" />
          <span className="text-4xl font-black">VOLAT 112</span>
          <span className="text-red-200">Jednotné evropské číslo tísňového volání</span>
        </a>

        {/* Location Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                    <p className="text-slate-400 text-xs uppercase">Tvoje poloha</p>
                    <p className="text-white font-mono font-bold text-lg">{address}</p>
                </div>
            </div>
            <button 
                onClick={copyLocation}
                className="bg-slate-800 p-3 rounded-xl text-slate-300 hover:text-white transition"
            >
                {copied ? <Check className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6" />}
            </button>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-2 gap-4">
             <button 
                onClick={toggleSiren}
                className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${
                    isSirenActive 
                    ? 'bg-amber-600 border-amber-500 text-white animate-pulse' 
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-amber-500/50'
                }`}
             >
                 <Siren className="w-10 h-10" />
                 <span className="font-bold">Siréna</span>
             </button>

             <button 
                onClick={() => setIsFlashActive(!isFlashActive)}
                className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${
                    isFlashActive 
                    ? 'bg-white border-white text-black' 
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-white/50'
                }`}
             >
                 <Zap className="w-10 h-10" />
                 <span className="font-bold">Baterka</span>
             </button>
        </div>

        {/* ICE Contacts */}
        <div className="space-y-3">
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Nouzové kontakty (ICE)</h3>
            {contacts.length > 0 ? (
                contacts.map(contact => (
                    <a 
                        key={contact.id}
                        href={getSmsLink(contact.phone)}
                        className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between hover:bg-slate-700 transition group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center font-bold text-slate-500">
                                {contact.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-white">{contact.name}</p>
                                <p className="text-xs text-slate-400">{contact.relation || 'Kontakt'}</p>
                            </div>
                        </div>
                        <div className="bg-amber-600/20 text-amber-500 p-2 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition">
                            <Send className="w-5 h-5" />
                        </div>
                    </a>
                ))
            ) : (
                <div className="text-center p-6 border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                    <p>Nemáš nastavené žádné kontakty.</p>
                    <p className="text-xs">Přidej je v sekci Garáž &rarr; Profil jezdce.</p>
                </div>
            )}
        </div>

        {/* First Aid Tip */}
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-auto">
            <h4 className="text-amber-500 font-bold mb-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> 5T První pomoci
            </h4>
            <p className="text-xs text-slate-400">
                1. Ticho (uklidnit) • 2. Teplo (přikrýt) • 3. Tekutiny (pouze ovlažit rty!) • 4. Tišení bolesti • 5. Transport
            </p>
        </div>

      </div>
    </div>
  );
};

export default SOSModal;