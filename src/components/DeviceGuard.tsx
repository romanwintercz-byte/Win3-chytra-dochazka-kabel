import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Employee } from '../types';

interface DeviceGuardProps {
  employees: Employee[];
  onApprove: (deviceId: string, deviceName: string) => void;
  onRegisterRequest: (deviceId: string, deviceName: string) => void;
  onCheckApproved: (deviceId: string) => void;
}

export const getDeviceId = () => {
  let id = localStorage.getItem('kabel_device_id');
  if (!id) {
    id = 'DEV-' + uuidv4().substring(0, 8).toUpperCase();
    localStorage.setItem('kabel_device_id', id);
  }
  return id;
};

export const getDeviceName = () => {
  const ua = navigator.userAgent;
  let os = 'Neznámé zařízení';
  if (/windows nt 10/i.test(ua)) os = 'Windows PC';
  else if (/windows/i.test(ua)) os = 'Windows PC';
  else if (/macintosh|mac os x/i.test(ua)) os = 'Mac';
  else if (/iphone/i.test(ua)) os = 'iPhone';
  else if (/ipad/i.test(ua)) os = 'iPad';
  else if (/android/i.test(ua)) {
    const match = ua.match(/Android\s+[0-9.]+;\s*([^;)]+)/i);
    if (match && match[1]) {
      const model = match[1].replace(/Build\/.*/i, '').trim();
      os = model && model.length > 1 && model !== 'K' ? `Android (${model})` : 'Android telefon';
    } else {
      os = 'Android telefon';
    }
  } else if (/linux/i.test(ua)) os = 'Linux PC';

  let browser = '';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Safari';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';

  return browser ? `${os} • ${browser}` : os;
};

const DeviceGuard: React.FC<DeviceGuardProps> = ({ employees, onApprove, onRegisterRequest, onCheckApproved }) => {
  const [deviceId] = useState(getDeviceId());
  const [deviceName] = useState(getDeviceName());
  const [ownerName, setOwnerName] = useState(() => localStorage.getItem('kabel_device_owner') || '');
  const [nameSaved, setNameSaved] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const requestSent = useRef(false);

  const buildFullDeviceName = (owner: string) => {
    const clean = owner.trim();
    return clean ? `${clean} — ${deviceName}` : deviceName;
  };

  useEffect(() => {
    onCheckApproved(deviceId);
    
    // Check if it's already in the system
    const existing = employees.find(e => e.id === deviceId);
    if (!existing) {
      if (!requestSent.current) {
        requestSent.current = true;
        onRegisterRequest(deviceId, buildFullDeviceName(ownerName));
      }
      setIsPending(true);
    } else if (!existing.isActive) {
      setIsPending(true);
    } else {
      setIsPending(false);
    }
    
    // Polling interval
    const timer = setInterval(() => {
      onCheckApproved(deviceId);
    }, 5000);
    return () => clearInterval(timer);
  }, [employees, deviceId, deviceName, ownerName, onCheckApproved, onRegisterRequest]);

  const handleOwnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim()) return;
    localStorage.setItem('kabel_device_owner', ownerName.trim());
    onRegisterRequest(deviceId, buildFullDeviceName(ownerName));
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 3000);
  };

  const handleAdminKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey.trim() === 'Win3Kabel_start01') {
      onApprove(deviceId, buildFullDeviceName(ownerName || 'Hlavní Admin'));
    } else {
      alert('Nesprávný Master klíč.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
          🔒
        </div>
        
        <div>
          <h1 className="text-2xl font-black text-slate-900">Zařízení není schváleno</h1>
          <p className="text-slate-500 text-sm mt-2">
            Toto zařízení (<strong className="text-slate-700">{deviceName}</strong>) zatím nemá přístup do systému Kabel.
          </p>
        </div>

        <form onSubmit={handleOwnerSubmit} className="text-left bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 space-y-2">
          <label className="block text-xs font-black uppercase tracking-wider text-indigo-900">
            1. Kdo z tohoto zařízení žádá o přístup?
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
              placeholder="Zadejte své jméno (např. Jan Novák)..."
              className="flex-1 px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shrink-0 transition-colors cursor-pointer"
            >
              {nameSaved ? '✓ Uloženo' : 'Odeslat'}
            </button>
          </div>
          {nameSaved && (
            <p className="text-[11px] text-emerald-700 font-bold">
              ✓ Vaše jméno teď vidí administrátor u čekajícího zařízení.
            </p>
          )}
        </form>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">2. Kód tohoto zařízení</p>
          <div className="text-4xl font-black text-slate-800 tracking-widest font-mono">
            {deviceId.replace('DEV-', '')}
          </div>
        </div>

        <p className="text-sm text-slate-600 font-medium">
          Vyplňte své jméno výše a nahlaste kód administrátorovi.<br/>
          Jakmile vás schválí, aplikace se <strong>automaticky odemkne</strong>.
        </p>

        <form onSubmit={handleAdminKeySubmit} className="pt-6 border-t border-slate-100 mt-6">
          <p className="text-xs text-slate-400 mb-2 font-bold">Jste administrátor? Zadejte master klíč:</p>
          <div className="flex gap-2">
            <input 
              type="password" 
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
              placeholder="Admin klíč..."
            />
            <button 
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm cursor-pointer"
            >
              Odemknout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceGuard;
