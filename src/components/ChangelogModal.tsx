import React from 'react';

interface ChangelogModalProps {
  version: string;
  onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ version, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-fade-in relative overflow-hidden">
        
        {/* Dekorativní prvek nahoře */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              Aplikace byla aktualizována!
            </h2>
            <p className="text-sm text-slate-500 font-bold mt-1">Nová verze: <span className="text-indigo-600">{version}</span></p>
          </div>
        </div>

        <div className="space-y-3 py-2 text-sm text-slate-700">
          <p className="font-bold">Co je nového v této verzi:</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✔️</span>
              <span><strong>Týdenní schvalování přesčasů:</strong> Automatické štěpení přesčasů (nad 8 hodin) při stisknutí "Konec práce".</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✔️</span>
              <span><strong>Vylepšené obědy:</strong> Přehledné odpočítávání přestávek a štítky "oběd" přímo ve výpisu záznamů.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✔️</span>
              <span><strong>Inteligentní AI Asistent:</strong> Nápověda teď umí vést plynulý chat a pamatuje si historii otázek.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✔️</span>
              <span><strong>Win3 Studio:</strong> Přidány kontaktní informace a loga autorů aplikace.</span>
            </li>
          </ul>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Skvělé, jdeme pracovat!
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default ChangelogModal;
