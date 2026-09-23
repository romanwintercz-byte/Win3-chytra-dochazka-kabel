import React from 'react';
import { Employee } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentUser: Employee;
  employees: Employee[];
  onRequestSwitchUser: (id: string) => void;
  onShowAbout: () => void;
  version: string;
  isConnected?: boolean;
  onOpenSupabaseConfig?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  employees, 
  onRequestSwitchUser, 
  onShowAbout, 
  version, 
  isConnected,
  onOpenSupabaseConfig
}) => {
  return (
    <div className="hidden md:flex flex-col w-64 bg-slate-900 text-white h-screen sticky top-0 shrink-0 shadow-xl print:hidden select-none">
      {/* Hlavička s logem Kabel */}
      <div className="p-5 border-b border-slate-800">
        <button 
          onClick={onShowAbout} 
          className="flex items-center gap-3 text-left w-full group cursor-pointer"
          title="O aplikaci Kabel"
        >
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            K
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
              <span>Kabel</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">Docházka v{version}</span>
              <div 
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-amber-400'}`} 
                title={isConnected ? 'Připojeno k Supabase Kabel' : 'Offline / Demo režim'}
              />
            </div>
          </div>
        </button>
      </div>

      {/* Navigační menu */}
      <nav className="flex-1 p-3.5 space-y-1.5">
        <button 
          type="button"
          onClick={() => setActiveTab('overview')} 
          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left ${
            activeTab === 'overview' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30' 
              : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <span className="text-base">📊</span>
          <span>Přehled docházky</span>
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('report')} 
          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left ${
            activeTab === 'report' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30' 
              : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <span className="text-base">📄</span>
          <span>Mzdové reporty A4</span>
        </button>

        {currentUser.role === 'Manager' && (
          <button 
            type="button"
            onClick={() => setActiveTab('settings')} 
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left ${
              activeTab === 'settings' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30' 
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <span className="text-base">⚙️</span>
            <span>Správa & Zaměstnanci</span>
          </button>
        )}

        {/* Rychlý odkaz na Supabase konfiguraci */}
        {onOpenSupabaseConfig && (
          <div className="pt-3">
            <button
              type="button"
              onClick={onOpenSupabaseConfig}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors text-left border border-slate-800"
            >
              <span className="text-sm">⚡</span>
              <span className="truncate">{isConnected ? 'Supabase Kabel: Aktivní' : 'Nastavit Supabase Kabel'}</span>
            </button>
          </div>
        )}
      </nav>

      {/* Profil přihlášeného uživatele */}
      <div className="p-4 border-t border-slate-800 bg-slate-800/40">
        <div className="flex items-center gap-3 mb-3">
          <img 
            src={currentUser.avatar} 
            className="w-9 h-9 rounded-full border-2 border-indigo-500/50 bg-slate-700 object-cover" 
            alt={currentUser.name} 
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-100 truncate">{currentUser.name}</div>
            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
              <span>{currentUser.role}</span>
              {currentUser.department && <span>• {currentUser.department}</span>}
            </div>
          </div>
        </div>

        {/* Přepínač zaměstnanců */}
        <div className="relative">
          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
            Přepnout profil:
          </label>
          <select 
            value={currentUser.id} 
            onChange={(e) => onRequestSwitchUser(e.target.value)} 
            className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl text-xs p-2 text-slate-200 outline-none focus:border-indigo-500 cursor-pointer transition-colors"
          >
            {employees.map(e => (
              <option key={e.id} value={e.id}>
                {e.name} {e.pinCode ? '🔒' : ''} ({e.role})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
