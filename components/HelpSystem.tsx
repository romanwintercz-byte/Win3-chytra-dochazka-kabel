
import React, { useState } from 'react';

const HelpSystem: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'guide' | 'cheatsheet'>('cheatsheet');

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 flex items-center justify-center"
        title="Nápověda a Průvodce"
      >
        {isOpen ? (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
           </svg>
        ) : (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        )}
      </button>

      {/* Main Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-[90vw] max-w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col h-[600px] animate-fade-in overflow-hidden">
          
          {/* Header */}
          <div className="bg-indigo-600 p-4 text-white shrink-0">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              SmartWork Nápověda
            </h3>
            <div className="flex mt-4 bg-indigo-800/50 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('cheatsheet')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'cheatsheet' ? 'bg-white text-indigo-700 shadow' : 'text-indigo-200 hover:text-white'}`}
                >
                    TAHÁK
                </button>
                <button 
                    onClick={() => setActiveTab('guide')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'guide' ? 'bg-white text-indigo-700 shadow' : 'text-indigo-200 hover:text-white'}`}
                >
                    OTÁZKY & ODPOVĚDI
                </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50 scrollbar-thin">
            
            {activeTab === 'cheatsheet' && (
                <div className="p-5 space-y-6">
                    {/* Krok 1 - Instalace */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-bl-lg">KROK 1</div>
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                            Instalace na plochu
                        </h4>
                        
                        <div className="space-y-3">
                            {/* Apple */}
                            <div className="flex gap-3 items-start bg-gray-50 p-2 rounded-lg border border-gray-100">
                                <div className="text-xl">🍏</div>
                                <div>
                                    <strong className="text-xs font-bold text-gray-800 block">iPhone / iPad (Safari)</strong>
                                    <p className="text-xs text-gray-600 mt-1">
                                        1. Klikněte na tlačítko <strong>Sdílet</strong> (čtvereček se šipkou dole).<br/>
                                        2. Sjeďte dolů a vyberte <strong>"Přidat na plochu"</strong>.
                                    </p>
                                </div>
                            </div>

                            {/* Android */}
                            <div className="flex gap-3 items-start bg-gray-50 p-2 rounded-lg border border-gray-100">
                                <div className="text-xl">🤖</div>
                                <div>
                                    <strong className="text-xs font-bold text-gray-800 block">Android (Chrome)</strong>
                                    <p className="text-xs text-gray-600 mt-1">
                                        1. Klikněte na <strong>Menu</strong> (tři tečky vpravo nahoře).<br/>
                                        2. Vyberte <strong>"Instalovat aplikaci"</strong> nebo "Přidat na plochu".
                                    </p>
                                </div>
                            </div>

                            {/* PC / Windows */}
                            <div className="flex gap-3 items-start bg-gray-50 p-2 rounded-lg border border-gray-100">
                                <div className="text-xl">💻</div>
                                <div>
                                    <strong className="text-xs font-bold text-gray-800 block">Počítač (Windows/Mac)</strong>
                                    <p className="text-xs text-gray-600 mt-1">
                                        V adresním řádku vpravo nahoře klikněte na ikonu <strong>Instalovat</strong> (monitor se šipkou).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Krok 2 */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-bl-lg">KROK 2</div>
                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                            Jak zadat práci?
                        </h4>
                        
                        <div className="space-y-3">
                            <div className="flex gap-3 items-start">
                                <div className="mt-1 p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                </div>
                                <div>
                                    <strong className="text-sm text-gray-800">Děláte to co včera?</strong>
                                    <p className="text-xs text-gray-500">Klikněte na tlačítko <strong>Zkopírovat minulý den</strong>. Hotovo za 1 vteřinu.</p>
                                </div>
                            </div>

                            <div className="flex gap-3 items-start">
                                <div className="mt-1 p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <div>
                                    <strong className="text-sm text-gray-800">Celý měsíc na jedné akci?</strong>
                                    <p className="text-xs text-gray-500">Otevřete Editor ➝ Vyplňte 1 den ➝ Klikněte na <strong>Vyplnit zbytek měsíce</strong>.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* NOVÁ FUNKCE - FOTKY */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-bl-lg">FOTKY</div>
                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <span className="text-xl">📷</span>
                            Jak nahrát propustku?
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                             U lékaře, nemoci nebo OČR můžete rovnou vyfotit doklad a poslat ho vedení.
                        </p>
                        <ol className="text-sm text-gray-600 list-decimal pl-4 space-y-1">
                             <li>Otevřete <strong>Editor dne</strong>.</li>
                             <li>Vyberte činnost (např. Lékař).</li>
                             <li>Vedle poznámky klikněte na <strong>ikonu Fotoaparátu</strong>.</li>
                             <li>Vyfoťte lístek mobilem.</li>
                        </ol>
                    </div>

                    {/* NOVÁ FUNKCE - UPDATE */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-bl-lg">UPDATE</div>
                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <span className="text-xl">🔄</span>
                            Jak aktualizovat aplikaci?
                        </h4>
                        <p className="text-sm text-gray-600">
                             Aplikace se vylepšuje sama na pozadí. Aby se změny projevily:
                        </p>
                        <ul className="text-sm text-gray-600 list-disc pl-4 mt-2 space-y-1">
                             <li>Sledujte černou lištu dole: <strong>"Nová verze k dispozici"</strong>.</li>
                             <li>Vždy klikněte na tlačítko <strong>AKTUALIZOVAT</strong>.</li>
                             <li>Pokud se aplikace chová divně, úplně ji zavřete a znovu otevřete.</li>
                        </ul>
                    </div>

                    {/* Krok 3 */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-bl-lg">KROK 3</div>
                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
                            Konec měsíce
                        </h4>
                        <ul className="text-sm text-gray-600 space-y-2">
                            <li className="flex items-center gap-2">
                                <span className="text-green-500">●</span> 
                                Zkontrolujte, zda nemáte červené dny (chybějící hodiny).
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-indigo-500">●</span> 
                                Klikněte na <strong>Odeslat ke schválení</strong>.
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {activeTab === 'guide' && (
              <div className="p-4 space-y-3">
                <details className="group bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-3 bg-gray-50 group-open:bg-indigo-50 text-gray-800">
                    <span>⚡ Rychlé akce</span>
                    <span className="transition group-open:rotate-180">
                      <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="text-gray-600 text-sm p-3 border-t border-gray-100">
                    <p>Jak si ušetřit práci?</p>
                    <ul className="list-disc pl-4 mt-2 space-y-1">
                      <li><strong>Zkopírovat minulý den:</strong> Vezme vše, co jste dělali naposledy, a vloží to do dneška. Ideální, pokud děláte na stejném projektu.</li>
                      <li><strong>Dovolená/Nemoc:</strong> Tlačítka na jeden klik v hlavním panelu.</li>
                    </ul>
                  </div>
                </details>

                <details className="group bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-3 bg-gray-50 group-open:bg-indigo-50 text-gray-800">
                    <span>📷 Doklady a propustky</span>
                    <span className="transition group-open:rotate-180">
                      <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="text-gray-600 text-sm p-3 border-t border-gray-100">
                    <p>Kam s lístkem od doktora?</p>
                    <ul className="list-disc pl-4 mt-2 space-y-1">
                      <li>Nemusíte nikam chodit ani posílat mail.</li>
                      <li>Při zadávání "Lékaře" nebo "Nemoci" v Editoru klikněte na ikonu fotky.</li>
                      <li>Vyfoťte lístek. Vedení ho uvidí v systému.</li>
                    </ul>
                  </div>
                </details>

                <details className="group bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-3 bg-gray-50 group-open:bg-indigo-50 text-gray-800">
                    <span>🧩 Více zakázek v jeden den</span>
                    <span className="transition group-open:rotate-180">
                      <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="text-gray-600 text-sm p-3 border-t border-gray-100">
                    <p>Potřebujete rozdělit 8 hodin mezi více projektů nebo přidat lékaře?</p>
                    <ul className="list-disc pl-4 mt-2 space-y-1">
                      <li>Klikněte na <strong>Otevřít Editor</strong> nebo na den v tabulce.</li>
                      <li>Tlačítkem <strong>"Přidat další činnost"</strong> přidejte řádky.</li>
                      <li>Skládejte činnosti jako kostičky, dokud dole nesvítí zelených 8h.</li>
                    </ul>
                  </div>
                </details>

                <details className="group bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-3 bg-gray-50 group-open:bg-indigo-50 text-gray-800">
                    <span>📅 Hromadné zadávání</span>
                    <span className="transition group-open:rotate-180">
                       <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="text-gray-600 text-sm p-3 border-t border-gray-100">
                    <p>Chcete zadat celý týden najednou?</p>
                    <ol className="list-decimal pl-4 mt-2 space-y-1">
                      <li>Klikněte na <strong>Otevřít Editor</strong>.</li>
                      <li>Zaškrtněte <strong>Více dní</strong>.</li>
                      <li>Vyberte datum Od a Do.</li>
                      <li>Vyplňte činnost (např. 8h Projekt X).</li>
                      <li>Aplikace vytvoří záznamy pro všechny pracovní dny.</li>
                    </ol>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default HelpSystem;
