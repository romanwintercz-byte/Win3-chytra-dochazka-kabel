
import React, { useState } from 'react';

const HelpSystem: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-20 right-6 md:bottom-6 z-50 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition">❓</button>
      {isOpen && (
        <div className="fixed bottom-32 right-6 md:bottom-24 w-[300px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 z-50 animate-fade-in">
           <h3 className="font-bold text-lg mb-4">Nápověda</h3>
           <div className="space-y-4 text-sm text-slate-600">
              <p><strong>Jak zadat práci?</strong><br/>Klikněte na "Editor" nebo využijte "Rychlé akce" pro běžnou práci.</p>
              <p><strong>Konec měsíce?</strong><br/>Zkontrolujte zda svítí zelená u všech dní a odešlete ke schválení.</p>
           </div>
           <button onClick={()=>setIsOpen(false)} className="mt-6 w-full py-2 bg-gray-100 rounded-lg text-xs font-bold">ZAVŘÍT</button>
        </div>
      )}
    </>
  );
};
export default HelpSystem;
