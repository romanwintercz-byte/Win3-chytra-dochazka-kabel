import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Employee } from '../types';

interface DeviceGuardProps {
  employees: Employee[];
  onApprove: (deviceId: string, deviceName: string) => void;
  onRegisterRequest: (deviceId: string, deviceName: string) => void;
  onCheckApproved: (deviceId: string) => void;
}

const getDeviceId = () => {
  let id = localStorage.getItem('kabel_device_id');
  if (!id) {
    id = 'DEV-' + uuidv4().substring(0, 8).toUpperCase();
    localStorage.setItem('kabel_device_id', id);
  }
  return id;
};

const getDeviceName = () => {
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return 'Mobilní zařízení';
  if (/tablet/i.test(ua)) return 'Tablet';
  return 'Počítač / PC';
};

const DeviceGuard: React.FC<DeviceGuardProps> = ({ employees, onApprove, onRegisterRequest, onCheckApproved }) => {
  const [deviceId] = useState(getDeviceId());
  const [deviceName] = useState(getDeviceName());
  const [isPending, setIsPending] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const requestSent = useRef(false);

  useEffect(() => {
    onCheckApproved(deviceId);
    
    
    // Check if it's already in the system
    const existing = employees.find(e => e.id === deviceId);
    if (!existing) {
      if (!requestSent.current) {
        requestSent.current = true;
        onRegisterRequest(deviceId, deviceName);
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
  }, [employees, deviceId, deviceName, onCheckApproved, onRegisterRequest]);

  const handleAdminKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey.trim() === 'Win3Kabel_start01') {
      onApprove(deviceId, deviceName + ' (První Admin)');
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
            Toto zařízení zatím nemá přístup do firemního systému Kabel.
          </p>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Kód tohoto zařízení</p>
          <div className="text-4xl font-black text-slate-800 tracking-widest font-mono">
            {deviceId.replace('DEV-', '')}
          </div>
        </div>

        <p className="text-sm text-slate-600 font-medium">
          Nahlaste tento kód vašemu administrátorovi.<br/>
          Jakmile kód schválí, aplikace se <strong>automaticky odemkne</strong>.
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
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm"
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
