
import React from 'react';

const PresentationMode: React.FC<{type: string, onClose: () => void}> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col p-12">
      <div className="flex justify-between items-start mb-20">
        <h1 className="text-4xl font-black">Digitalizace Docházky</h1>
        <button onClick={onClose} className="text-slate-500 hover:text-white">Zavřít</button>
      </div>
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="space-y-4">
          <h2 className="text-6xl font-black text-indigo-500">Konec papírů.</h2>
          <p className="text-2xl text-slate-400">Přenášíme evidenci času do 21. století.</p>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800">
            <h3 className="text-2xl font-bold mb-4">Pro firmu</h3>
            <ul className="space-y-2 text-slate-400"><li>✓ Přesné náklady na zakázky</li><li>✓ Rychlé podklady pro mzdy</li></ul>
          </div>
          <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800">
            <h3 className="text-2xl font-bold mb-4">Pro lidi</h3>
            <ul className="space-y-2 text-slate-400"><li>✓ Vyplnění kdekoli (mobil)</li><li>✓ Žádné ruční počítání sumy</li></ul>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PresentationMode;
