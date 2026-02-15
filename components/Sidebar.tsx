
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
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, employees, onRequestSwitchUser, onShowAbout, version, isConnected }) => {
  return (
    <div className="hidden md:flex flex-col w-64 bg-slate-900 text-white h-screen sticky top-0 shrink-0 shadow-xl">
      <div className="p-6 border-b border-slate-800">
        <button onClick={onShowAbout} className="flex items-center gap-3 text-left w-full group">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-110 transition-transform">W</div>
          <div>
            <h1 className="font-bold text-sm">Chytrá docházka</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[10px] text-slate-500">v{version}</p>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-amber-500'}`} title={isConnected ? 'Připojeno k DB' : 'Offline/Demo režim'}></div>
            </div>
          </div>
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'overview' ? 'bg-indigo-600' : 'hover:bg-slate-800 text-slate-400'}`}>📊 Přehled</button>
        <button onClick={() => setActiveTab('report')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'report' ? 'bg-indigo-600' : 'hover:bg-slate-800 text-slate-400'}`}>📄 Reporty</button>
        {currentUser.role === 'Manager' && (
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-indigo-600' : 'hover:bg-slate-800 text-slate-400'}`}>⚙️ Nastavení</button>
        )}
      </nav>
      <div className="p-4 border-t border-slate-800 bg-slate-800/50">
        <div className="flex items-center gap-3 mb-3">
          <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-slate-700" alt="" />
          <div className="text-xs truncate font-medium text-slate-200">{currentUser.name}</div>
        </div>
        <select value={currentUser.id} onChange={(e) => onRequestSwitchUser(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded text-xs p-2 text-slate-300 outline-none focus:border-indigo-500 transition-colors">
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
    </div>
  );
};
export default Sidebar;
