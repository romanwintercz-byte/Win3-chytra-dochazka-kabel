import React, { useState } from 'react';
import { getSmartHelpResponse } from '../services/geminiService';

const HelpSystem: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || asking) return;
    setAsking(true);
    const ans = await getSmartHelpResponse(question);
    setAiAnswer(ans);
    setAsking(false);
  };

  return (
    <>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)} 
        className="fixed bottom-20 right-6 md:bottom-6 z-40 bg-indigo-600 hover:bg-indigo-700 text-white w-12 h-12 rounded-full shadow-2xl hover:scale-105 transition-all flex items-center justify-center font-bold text-lg"
        title="Nápověda pro firmu Kabel"
      >
        ❓
      </button>

      {isOpen && (
        <div className="fixed bottom-36 right-4 md:bottom-20 md:right-6 w-[92vw] max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 z-50 animate-fade-in max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <span>💡</span>
              <span>Nápověda k docházce Kabel</span>
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs text-slate-600 pr-1">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <strong className="text-slate-900 block mb-1">Jak zadat směnu?</strong>
              V sekci <em>Přehled</em> klikněte na <strong>Editor</strong>. Zadejte čas příchodu a odchodu (např. 06:30 – 15:00) a vyberte kabelovou zakázku.
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <strong className="text-slate-900 block mb-1">Více zakázek nebo lékař v jeden den?</strong>
              V Editoru klikněte na <strong>+ PŘIDAT DALŠÍ ČINNOST</strong>. Můžete zkombinovat např. 6h montáž kabelů + 2h lékař. Systém vše sečte.
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <strong className="text-slate-900 block mb-1">Jak fungují přesčasy?</strong>
              Standardní denní fond je 8 hodin. Veškerý čas nad 8 hodin v pracovní den (a veškerá práce o víkendu) se automaticky eviduje jako přesčas.
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <strong className="text-slate-900 block mb-1">Schválení docházky Lucii:</strong>
              Na konci měsíce klikněte na <strong>Odeslat Lucii ke schválení</strong>. Pro zaměstnance se docházka uzamkne a Lucie ji zkontroluje.
            </div>

            {/* AI Asistent box */}
            <div className="border-t border-slate-100 pt-3">
              <form onSubmit={handleAsk} className="space-y-2">
                <label className="font-bold text-slate-700 block">Zeptejte se na cokoliv:</label>
                <div className="flex gap-1.5">
                  <input 
                    type="text" 
                    value={question} 
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Např. jak funguje náhradní volno?" 
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                  <button 
                    type="submit" 
                    disabled={asking || !question.trim()}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50"
                  >
                    {asking ? '...' : 'Ptát se'}
                  </button>
                </div>
              </form>

              {aiAnswer && (
                <div className="mt-2.5 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-950 font-medium leading-relaxed">
                  {aiAnswer}
                </div>
              )}
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setIsOpen(false)} 
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
          >
            ZAVŘÍT NÁPOVĚDU
          </button>
        </div>
      )}
    </>
  );
};

export default HelpSystem;
