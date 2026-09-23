import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
  onOpenSupabaseConfig?: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, version, onOpenSupabaseConfig }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold p-2"
        >
          ✕
        </button>

        <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl font-black shadow-xl shadow-indigo-200">
          K
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-1">Kabel</h2>
        <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest mb-4">Chytrá docházka & Zakázky</p>
        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
          Profesionální firemní systém pro evidenci pracovní doby, kabelových zakázek, přesčasů a mzdových podkladů pro firmu <strong>Kabel</strong>.
        </p>

        {onOpenSupabaseConfig && (
          <button
            onClick={() => {
              onClose();
              onOpenSupabaseConfig();
            }}
            className="w-full py-2.5 mb-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors flex items-center justify-center gap-2"
          >
            <span>⚡</span>
            <span>Konfigurace databáze Supabase</span>
          </button>
        )}

        <button 
          onClick={onClose} 
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors shadow-md"
        >
          Zavřít
        </button>
        <p className="mt-4 text-[10px] text-slate-400 font-medium">Verze aplikace {version} • Kabel s.r.o.</p>
      </div>
    </div>
  );
};

export default AboutModal;
