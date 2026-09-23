import React from 'react';

interface MobileNavigationProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentUserRole: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ activeTab, setActiveTab, currentUserRole }) => {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 flex h-16 shadow-lg z-40 print:hidden pb-[env(safe-area-inset-bottom)]">
      <button 
        type="button"
        onClick={() => setActiveTab('overview')} 
        className={`flex-1 flex flex-col items-center justify-center transition-colors ${activeTab === 'overview' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
      >
        <span className="text-xl">📊</span>
        <span className="text-[10px] uppercase tracking-wider font-extrabold mt-0.5">Přehled</span>
      </button>
      
      <button 
        type="button"
        onClick={() => setActiveTab('report')} 
        className={`flex-1 flex flex-col items-center justify-center transition-colors ${activeTab === 'report' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
      >
        <span className="text-xl">📄</span>
        <span className="text-[10px] uppercase tracking-wider font-extrabold mt-0.5">Reporty</span>
      </button>

      {currentUserRole === 'Manager' && (
        <button 
          type="button"
          onClick={() => setActiveTab('settings')} 
          className={`flex-1 flex flex-col items-center justify-center transition-colors ${activeTab === 'settings' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
        >
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] uppercase tracking-wider font-extrabold mt-0.5">Správa</span>
        </button>
      )}
    </div>
  );
};

export default MobileNavigation;
