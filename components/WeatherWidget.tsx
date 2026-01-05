import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CloudRain, Wind, Sun, MapPin, Loader2, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { getLocalWeather } from '../services/geminiService';
import { WeatherData } from '../types';

const WeatherWidget: React.FC = () => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWeather = async () => {
    setLoading(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError("Geolokace není podporována");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const weatherData = await getLocalWeather(pos.coords.latitude, pos.coords.longitude);
          if (weatherData.hourly.length === 0) {
             setError("Nepodařilo se načíst data o počasí.");
          } else {
             setData(weatherData);
          }
        } catch (e: any) {
          setError(e.message || "Chyba připojení k AI službě.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError("Povolte polohu pro zobrazení počasí.");
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm h-[300px] flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-slate-400 text-sm">Zjišťuji aktuální podmínky přes AI...</p>
      </div>
    );
  }

  if (error || !data) {
     return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm h-[300px] flex flex-col items-center justify-center gap-2 text-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <p className="text-slate-300 text-sm font-bold">Chyba</p>
        <p className="text-slate-400 text-xs px-4">{error}</p>
        <button onClick={fetchWeather} className="mt-2 text-amber-500 hover:text-amber-400 text-sm font-bold flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Zkusit znovu
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm h-full relative group flex flex-col justify-between">
      <div>
        <button 
            onClick={fetchWeather} 
            className="absolute top-4 right-4 text-slate-600 hover:text-amber-500 transition opacity-0 group-hover:opacity-100"
            title="Aktualizovat"
        >
            <RefreshCw className="w-4 h-4" />
        </button>

        <div className="flex justify-between items-start mb-6">
            <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-500" />
                Počasí na jízdu
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> {data.locationName}
            </p>
            </div>
            <div className="text-right">
            <span className="text-3xl font-bold text-slate-100">{data.currentTemp}°C</span>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <Wind className="w-5 h-5 text-blue-400" />
            <div>
                <p className="text-xs text-slate-400">Vítr</p>
                <p className="font-medium text-slate-200">{data.windSpeed} km/h</p>
            </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <CloudRain className="w-5 h-5 text-blue-400" />
            <div>
                <p className="text-xs text-slate-400">Srážky</p>
                <p className="font-medium text-slate-200">{data.precipChance}%</p>
            </div>
            </div>
        </div>

        <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.hourly}>
                <defs>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }}
                itemStyle={{ color: '#fbbf24' }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(value: any, name: any) => [
                    name === 'temp' ? `${value}°C` : `${value} %`,
                    name === 'temp' ? 'Teplota' : 'Déšť'
                ]}
                />
                <Area 
                    type="monotone" 
                    dataKey="temp" 
                    stroke="#fbbf24" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorTemp)" 
                    name="temp"
                />
            </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>
      
      {/* Sources footer for Grounding compliance */}
      {data.sourceUrls && data.sourceUrls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-1 text-[10px] text-slate-600 overflow-hidden">
             <Info className="w-3 h-3 shrink-0" />
             <span className="shrink-0">Zdroje:</span>
             <div className="flex gap-2 overflow-hidden">
                {data.sourceUrls.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="hover:text-amber-500 truncate underline">
                        {new URL(url).hostname.replace('www.', '')}
                    </a>
                ))}
             </div>
          </div>
      )}
    </div>
  );
};

export default WeatherWidget;