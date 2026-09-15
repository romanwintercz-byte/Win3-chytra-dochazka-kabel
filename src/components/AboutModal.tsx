
import React from 'react';

// Fix: Defined AboutModalProps and added missing optional handlers passed from App.tsx
interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
  onContactDeveloper?: () => void;
  onServiceLogin?: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, version }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-20 h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl shadow-xl">W</div>
        <h2 className="text-2xl font-bold mb-1">Win3 Studio</h2>
        <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest mb-4">Digital Solutions</p>
        <p className="text-slate-600 mb-6 text-sm">Profesionální řešení docházkových a manažerských systémů na míru.</p>
        <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl">Zavřít</button>
        <p className="mt-4 text-[10px] text-slate-400">Verze aplikace {version}</p>
      </div>
    </div>
  );
};
export default AboutModal;
