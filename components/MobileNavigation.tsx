
import React from 'react';

interface MobileNavigationProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentUserRole: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ activeTab, setActiveTab, currentUserRole }) => {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex h-16 shadow-lg z-40">
      <button onClick={() => setActiveTab('overview')} className={`flex-1 flex flex-col items-center justify-center ${activeTab === 'overview' ? 'text-indigo-600' : 'text-slate-400'}`}>
        <span className="text-xl">📊</span>
        <span className="text-[10px] font-bold uppercase">Přehled</span>
      </button>
      <button onClick={() => setActiveTab('report')} className={`flex-1 flex flex-col items-center justify-center ${activeTab === 'report' ? 'text-indigo-600' : 'text-slate-400'}`}>
        <span className="text-xl">📄</span>
        <span className="text-[10px] font-bold uppercase">Reporty</span>
      </button>
      {currentUserRole === 'Manager' && (
        <button onClick={() => setActiveTab('settings')} className={`flex-1 flex flex-col items-center justify-center ${activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] font-bold uppercase">Admin</span>
        </button>
      )}
    </div>
  );
};
export default MobileNavigation;
