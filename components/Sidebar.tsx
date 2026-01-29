
import React from 'react';
import { Employee, Notification } from '../types';
import NotificationBell from './NotificationBell';

interface SidebarProps {
  activeTab: 'overview' | 'report' | 'settings';
  setActiveTab: (tab: 'overview' | 'report' | 'settings') => void;
  installPrompt: any;
  onInstall: () => void;
  currentUser: Employee;
  employees: Employee[];
  onRequestSwitchUser: (employeeId: string) => void;
  onShowAbout: () => void;
  onContactManager: () => void;
  onlineUserIds?: Set<string>;
  version: string;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, installPrompt, onInstall,
  currentUser, employees, onRequestSwitchUser, onShowAbout, onContactManager, onlineUserIds,
  version, notifications, onMarkAsRead, onMarkAllAsRead
}) => {
  return (
    <div className="hidden md:flex flex-col w-64 bg-slate-900 text-white min-h-screen sticky top-0 h-screen z-30 shadow-2xl">
      {/* Horní část: Logo a Notifikace */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex justify-between items-start mb-4">
            <button 
              onClick={onShowAbout}
              className="flex items-center gap-3 group transition-all"
              title="O aplikaci"
            >
              <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform flex-shrink-0">
                 <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 30 L40 75 L60 30 L80 75 L100 30" stroke="white" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
              </div>
              <div className="text-left overflow-hidden">
                <h1 className="text-lg font-bold text-white leading-tight truncate">Chytrá<br/>Docházka</h1>
              </div>
            </button>
            
            <div className="bg-slate-800 rounded-full shadow-inner">
              <NotificationBell 
                notifications={notifications} 
                onMarkAsRead={onMarkAsRead} 
                onMarkAllAsRead={onMarkAllAsRead} 
              />
            </div>
        </div>
        <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-semibold tracking-wide">by Win3 Studio</span>
            <span className="text-[9px] text-slate-600 font-mono mt-0.5 tracking-widest uppercase">Verze {version}</span>
        </div>
      </div>
      
      {/* Navigace */}
      <nav className="flex-1 p-4 space-y-1.5 mt-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="font-bold text-sm">Přehled & Zadání</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            activeTab === 'report' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-bold text-sm">Reporty</span>
        </button>

        {currentUser.role === 'Manager' && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-bold text-sm">Admin & Nastavení</span>
          </button>
        )}

        {currentUser.role !== 'Manager' && (
            <button
                onClick={onContactManager}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-slate-800 hover:text-white"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
                </svg>
                <span className="font-bold text-sm">Napsat vedení</span>
            </button>
        )}
      </nav>

      {/* Spodní panel: Instalace a Uživatel */}
      <div className="p-4 border-t border-slate-700/50 space-y-4">
        {installPrompt && (
          <button
            onClick={onInstall}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all text-xs font-black shadow-lg shadow-indigo-900/40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            INSTALOVAT
          </button>
        )}
        
        <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Aktivní profil</span>
            {onlineUserIds?.has(currentUser.id) && (
              <span className="flex items-center gap-1 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[8px] text-green-500 font-bold uppercase">Online</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mb-3 px-1">
            <img src={currentUser.avatar} alt="User" className="w-8 h-8 rounded-full ring-2 ring-indigo-500/50 shadow-lg" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate w-32">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{currentUser.role}</p>
            </div>
          </div>
          
          <select 
            value={currentUser.id} 
            onChange={(e) => onRequestSwitchUser(e.target.value)}
            className="w-full text-xs bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer hover:bg-black transition-all font-medium"
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                  {onlineUserIds?.has(emp.id) ? '🟢 ' : ''} {emp.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
