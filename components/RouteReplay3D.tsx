
import React, { useEffect, useRef, useState } from 'react';
import { RouteSuggestion } from '../types';
import { getRouteStory } from '../services/geminiService';
import { Play, Pause, X, Navigation, RotateCcw, AlertTriangle, Layers, ExternalLink, Loader2, Info, FastForward } from 'lucide-react';

interface RouteReplay3DProps {
  route: RouteSuggestion;
  onExit: () => void;
}

declare global {
  interface Window {
    google: any;
    initMap?: () => void;
    gm_authFailure?: () => void;
  }
}

const smoothPath = (points: {lat: number, lng: number}[], density: number = 20) => {
    if (points.length < 3) return points;
    const res = [];
    const getP = (i: number) => {
        if (i < 0) return points[0];
        if (i >= points.length) return points[points.length - 1];
        return points[i];
    };
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = getP(i - 1), p1 = getP(i), p2 = getP(i + 1), p3 = getP(i + 2);
        for (let t = 0; t < density; t++) {
            const v = t / density, v2 = v * v, v3 = v2 * v;
            const lat = 0.5 * ((2 * p1.lat) + (-p0.lat + p2.lat) * v + (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * v2 + (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * v3);
            const lng = 0.5 * ((2 * p1.lng) + (-p0.lng + p2.lng) * v + (2 * p0.lng - 5 * p1.lng + 4 * p2.lng - p3.lng) * v2 + (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lng) * v3);
            res.push({ lat, lng });
        }
    }
    res.push(points[points.length - 1]);
    return res;
};

const RouteReplay3D: React.FC<RouteReplay3DProps> = ({ route, onExit }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [story, setStory] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [mapType, setMapType] = useState<'satellite' | 'roadmap'>('satellite');
  const [isCalculating, setIsCalculating] = useState(true);
  
  const animationRef = useRef<number | null>(null);
  const pathRef = useRef<any[]>([]); 
  const markerRef = useRef<any>(null);
  const lastHeadingRef = useRef<number>(0);

  useEffect(() => {
    const init = async () => {
        let apiKey = "";
        try { apiKey = process.env.API_KEY || ""; } catch(e) {}
        
        if (!apiKey) { 
          setError("API klíč nebyl v prostředí nalezen."); 
          setIsCalculating(false);
          return; 
        }

        if (!window.google) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
            script.async = true;
            script.onload = () => setupMap();
            script.onerror = () => setError("Nepodařilo se načíst Google Maps.");
            document.head.appendChild(script);
        } else {
            setupMap();
        }
    };
    init();
    getRouteStory(route).then(setStory);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [route]);

  const setupMap = async () => {
    if (!mapRef.current) return;
    try {
        const { Map } = await window.google.maps.importLibrary("maps");
        const { DirectionsService } = await window.google.maps.importLibrary("routes");
        const { Marker } = await window.google.maps.importLibrary("marker");

        const map = new Map(mapRef.current, {
            center: route.waypoints[0],
            zoom: 18, tilt: 65, heading: 0,
            mapId: '9d79905b1f3c3d52',
            disableDefaultUI: true,
            mapTypeId: mapType,
            gestureHandling: 'greedy'
        });
        setMapInstance(map);

        const ds = new DirectionsService();
        ds.route({
            origin: route.waypoints[0],
            destination: route.waypoints[route.waypoints.length - 1],
            waypoints: route.waypoints.slice(1, -1).map(w => ({ location: w, stopover: false })),
            travelMode: 'DRIVING'
        }, (result: any, status: any) => {
            setIsCalculating(false);
            let finalPath = status === 'OK' 
                ? smoothPath(result.routes[0].overview_path.map((p: any) => ({ lat: p.lat(), lng: p.lng() })), 30)
                : smoothPath(route.waypoints, 50);
            pathRef.current = finalPath;

            new window.google.maps.Polyline({
                path: finalPath, strokeColor: '#f59e0b', strokeOpacity: 0.3, strokeWeight: 4, map: map
            });

            const marker = new Marker({
                position: finalPath[0], map: map,
                icon: {
                    path: "M 0,-5 L -3,5 L 0,3 L 3,5 Z", fillColor: "#f59e0b", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2, scale: 6, rotation: 0, anchor: new window.google.maps.Point(0, 0)
                }
            });
            markerRef.current = marker;
        });
    } catch (e) { setError("Chyba inicializace mapy."); }
  };

  useEffect(() => {
    if (!isPlaying || !mapInstance || pathRef.current.length === 0) return;
    let lastTime = performance.now();
    const animate = (time: number) => {
        const delta = (time - lastTime) / 16.66;
        lastTime = time;
        setProgress(prev => {
            const next = prev + (0.8 * speedMultiplier * delta);
            if (next >= pathRef.current.length - 1) { setIsPlaying(false); return pathRef.current.length - 1; }
            const idx = Math.floor(next);
            const curr = pathRef.current[idx];
            const nextP = pathRef.current[Math.min(idx + 15, pathRef.current.length - 1)];
            const rawHeading = window.google.maps.geometry.spherical.computeHeading(curr, nextP);
            const smoothHeading = lastHeadingRef.current + (rawHeading - lastHeadingRef.current) * 0.1;
            lastHeadingRef.current = smoothHeading;
            if (markerRef.current) {
                markerRef.current.setPosition(curr);
                const icon = markerRef.current.getIcon();
                icon.rotation = smoothHeading;
                markerRef.current.setIcon(icon);
            }
            mapInstance.moveCamera({ center: curr, heading: smoothHeading, tilt: 65, zoom: 18.5 - (speedMultiplier * 0.1) });
            animationRef.current = requestAnimationFrame(animate);
            return next;
        });
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, mapInstance, speedMultiplier]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden">
        <div ref={mapRef} className="absolute inset-0 z-0 bg-slate-900" />
        {error && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
             <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
             <h2 className="text-xl font-bold text-white mb-2">Chyba Mapy</h2>
             <p className="text-slate-400 mb-6 max-w-sm">{error}</p>
             <button onClick={onExit} className="bg-amber-600 text-white px-6 py-2 rounded-xl font-bold">Zpět</button>
          </div>
        )}
        <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-start pointer-events-none z-10 bg-gradient-to-b from-black/80 to-transparent">
            <div className="pointer-events-auto flex items-center gap-3">
                <button onClick={onExit} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl backdrop-blur-md transition border border-white/10 text-white"><X className="w-6 h-6" /></button>
                <div>
                    <h2 className="text-white font-bold text-xl">{route.name}</h2>
                    <p className="text-amber-500 text-xs font-mono uppercase tracking-widest flex items-center gap-1"><Navigation className="w-3 h-3" /> {route.distance}</p>
                </div>
            </div>
            <button onClick={() => setMapType(mapType === 'satellite' ? 'roadmap' : 'satellite')} className="pointer-events-auto bg-black/40 hover:bg-black/60 p-3 rounded-xl backdrop-blur-md transition border border-white/10 text-white"><Layers className="w-6 h-6" /></button>
        </div>
        {!isPlaying && progress === 0 && !isCalculating && !error && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                <div className="max-w-md w-full m-6 p-8 bg-slate-900/90 border border-slate-700 rounded-3xl shadow-2xl text-center">
                    <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3"><Play className="w-8 h-8 text-white fill-current" /></div>
                    <p className="text-xl text-white font-light italic leading-relaxed mb-8">"{story || 'Připravte se na virtuální jízdu...'}"</p>
                    <button onClick={() => setIsPlaying(true)} className="w-full bg-amber-600 hover:bg-amber-500 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-amber-900/30">START REPLAY</button>
                </div>
            </div>
        )}
        <div className="absolute bottom-0 inset-x-0 p-8 pt-20 bg-gradient-to-t from-black/90 to-transparent z-10 pointer-events-none">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden pointer-events-auto cursor-pointer"><div className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]" style={{ width: `${(progress / (pathRef.current.length || 1)) * 100}%` }} /></div>
                <div className="flex items-center justify-between pointer-events-auto">
                    <button onClick={() => { setProgress(0); setIsPlaying(false); }} className="p-3 text-slate-400 hover:text-white transition"><RotateCcw className="w-6 h-6" /></button>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSpeedMultiplier(prev => prev === 1 ? 2 : prev === 2 ? 4 : 1)} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold border border-white/10 flex items-center gap-2"><FastForward className="w-4 h-4" />{speedMultiplier}x</button>
                        <button onClick={() => setIsPlaying(!isPlaying)} className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-2xl shadow-white/20 hover:scale-105 active:scale-95 transition">{isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}</button>
                        <div className="w-20" />
                    </div>
                    <div className="text-right">
                        <p className="text-white font-mono font-bold text-xl leading-none">{Math.floor(progress / 10)} km</p>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider mt-1">Ujeto</p>
                    </div>
                </div>
            </div>
        </div>
        {isCalculating && !error && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950"><Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" /><p className="text-slate-400 font-medium">Stavím 3D model trasy...</p></div>
        )}
    </div>
  );
};
export default RouteReplay3D;
