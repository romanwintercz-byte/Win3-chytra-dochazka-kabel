import React, { useState } from 'react';
import { getSmartHelpResponse, ChatMessage } from '../services/geminiService';
import { useRef, useEffect } from 'react';

const HelpSystem: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [asking, setAsking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || asking) return;
    const q = question.trim();
    setQuestion('');
    
    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: q }];
    setMessages(newMessages);
    setAsking(true);
    
    const ans = await getSmartHelpResponse(newMessages);
    setMessages([...newMessages, { role: 'model', text: ans }]);
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
              <strong className="text-slate-900 block mb-1">Jak funguje živý záznamník (Jízda / Práce)?</strong>
              Přímo v horní části přehledu máte stopky „na ráně“. Ráno zvolte zakázku a klikněte na <strong>Zahájit Jízdu</strong>. Po příjezdu na místo klikněte na <strong>Práce</strong> (automaticky se ukončí jízda a začne měřit práce). Po směně klikněte na <strong>Jízda</strong> a po dojezdu na <strong>Konec jízdy</strong>.
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <strong className="text-slate-900 block mb-1">Počítá se jízda do pracovní doby?</strong>
              Jízda se eviduje samostatně s přesnými časy i zakázkou, ale nezapočítává se do fondu pracovní doby. Ve výkazech i přehledech je přehledně vyčíslena.
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <strong className="text-slate-900 block mb-1">Jak zadat směnu ručně zpětně?</strong>
              V sekci <em>Přehled</em> klikněte na <strong>Editor</strong>. Zadejte čas příchodu a odchodu (např. 06:30 – 15:00) a vyberte zakázku.
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
              <strong className="text-slate-900 block mb-1">Schválení docházky:</strong>
              Na konci měsíce klikněte na <strong>Odeslat ke schválení</strong>. Pro zaměstnance se docházka uzamkne a vedení firmy ji zkontroluje.
            </div>

            {/* AI Asistent box (CHAT) */}
            <div className="border-t border-slate-100 pt-3 mt-4 flex flex-col h-[300px]">
              <label className="font-bold text-slate-700 block mb-2">Zeptejte se AI asistenta:</label>
              
              <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-3 mb-2 flex flex-col">
                {messages.length === 0 ? (
                  <div className="text-slate-400 text-center my-auto italic">Zatím žádné zprávy. Zeptejte se mě na cokoliv!</div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <span className={`text-[10px] font-bold mb-0.5 ${m.role === 'user' ? 'text-indigo-400' : 'text-slate-400'}`}>
                        {m.role === 'user' ? 'Vy' : 'Asistent'}
                      </span>
                      <div className={`px-3 py-2 rounded-2xl max-w-[90%] leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                        {m.text}
                      </div>
                    </div>
                  ))
                )}
                {asking && (
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold mb-0.5 text-slate-400">Asistent</span>
                    <div className="px-3 py-2 bg-white border border-slate-200 rounded-2xl rounded-tl-sm text-slate-400">...</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleAsk} className="flex gap-1.5 shrink-0">
                <input 
                  type="text" 
                  value={question} 
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="Např. jak zadat jízdu?" 
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  type="submit" 
                  disabled={asking || !question.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors"
                >
                  Odeslat
                </button>
              </form>
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
