
import React, { useState, useEffect } from 'react';

export type PresentationType = 'manager' | 'employee';

interface PresentationModeProps {
  type: PresentationType;
  onClose: () => void;
}

const SLIDES = {
  manager: [
    {
      title: "Digitalizace docházky a zakázek",
      subtitle: "Konec nepřesných Excelů a dohledávání hodin",
      icon: (
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="50" fill="#4f46e5" />
            <path d="M30 35 L42 70 L54 35 L66 70 L78 35" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      bullets: []
    },
    {
      title: "Současný stav (Problém)",
      subtitle: "Proč potřebujeme změnu?",
      icon: "❌",
      bullets: [
        "Zdlouhavá administrativa na konci měsíce.",
        "Zpoždění podkladů pro mzdy (urgování lidí).",
        "Nepřesná evidence nákladů na zakázky.",
        "Riziko chyb při ručním přepisování dat."
      ]
    },
    {
      title: "Řešení: Chytrá Docházka",
      subtitle: "Moderní nástroj pro řízení firmy",
      icon: "✅",
      bullets: [
        "Online a Teď: Data vidíme v reálném čase.",
        "Mobilní přístup: Vyplnění rovnou na stavbě/v autě.",
        "Přesné náklady: Oddělení fakturovatelné práce a režie.",
        "Bez instalace: Funguje na každém telefonu."
      ]
    },
    {
      title: "Manažerská kontrola",
      subtitle: "Nástroje pro vedení",
      icon: "🛡️",
      bullets: [
        "Týmový přehled: Okamžitě vidíte, kdo má splněno.",
        "Schvalování: Výkaz nelze odeslat s chybami.",
        "Globální uzávěrka: Po mzdách se měsíc 'zamkne'.",
        "Data jsou v bezpečí a neměnná."
      ]
    },
    {
      title: "Výsledek pro firmu",
      subtitle: "Co nám to přinese?",
      icon: "📈",
      bullets: [
        "Úspora 5-8 hodin měsíčně pro účetní.",
        "Přesné podklady pro fakturaci klientům.",
        "Profesionální image firmy.",
        "Konec dohadování o hodinách."
      ]
    }
  ],
  employee: [
    {
      title: "Nová docházka: Hotovo za 30 vteřin",
      subtitle: "Jak používat aplikaci Chytrá Docházka",
      icon: "📱",
      bullets: []
    },
    {
      title: "Proč to děláme?",
      subtitle: "Abychom vám ušetřili nervy",
      icon: "🤝",
      bullets: [
        "Už žádné vzpomínání na konci měsíce.",
        "Už žádné vracení výkazů kvůli chybám v součtech.",
        "Můžete to 'naťukat' při čekání na oběd.",
        "Máte jistotu, že hodiny sedí."
      ]
    },
    {
      title: "Funkce pro 'Líné' (To nejlepší)",
      subtitle: "Jak to vyplnit co nejrychleji?",
      icon: "⚡",
      bullets: [
        "🔄 Zkopírovat minulý den: Děláte to samé? Jeden klik.",
        "📅 Vyplnit zbytek měsíce: Dlouhodobá zakázka? Jeden klik.",
        "🤒 Šablony: Dovolená nebo Nemoc.",
        "Žádné vypisování textů."
      ]
    },
    {
      title: "Jak začít?",
      subtitle: "Stáhněte si to hned teď",
      icon: "📲",
      bullets: [
        "1. Otevřete odkaz v mobilu.",
        "2. Klikněte na 'Sdílet' (iPhone) nebo 'Menu' (Android).",
        "3. Zvolte 'Přidat na plochu'.",
        "Funguje to jako normální aplikace."
      ]
    },
    {
      title: "Pojďme si to zkusit",
      subtitle: "Živá ukázka",
      icon: "🚀",
      bullets: [
        "Vytáhněte telefony.",
        "Zkuste si zadat včerejší den.",
        "Zeptejte se na cokoliv."
      ]
    }
  ]
};

const PresentationMode: React.FC<PresentationModeProps> = ({ type, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = SLIDES[type];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        if (currentSlide < slides.length - 1) setCurrentSlide(prev => prev + 1);
      } else if (e.key === 'ArrowLeft') {
        if (currentSlide > 0) setCurrentSlide(prev => prev - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, slides.length, onClose]);

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 text-white flex flex-col animate-fade-in">
      {/* Controls / Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
        <div className="text-slate-400 text-sm font-medium tracking-widest uppercase">
          {type === 'manager' ? 'Prezentace pro Vedení' : 'Školení Zaměstnanců'}
        </div>
        <button 
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors backdrop-blur-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Slide Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-5xl mx-auto w-full text-center">
        
        {/* Icon / Image */}
        <div className="mb-12 transform transition-all duration-500 scale-100 animate-fade-in-up">
           {typeof slide.icon === 'string' ? (
             <div className="text-8xl">{slide.icon}</div>
           ) : (
             slide.icon
           )}
        </div>

        {/* Text */}
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight animate-fade-in-up" key={`title-${currentSlide}`}>
          {slide.title}
        </h1>
        
        {slide.subtitle && (
          <p className="text-xl md:text-2xl text-slate-300 mb-12 font-light animate-fade-in-up delay-100" key={`sub-${currentSlide}`}>
            {slide.subtitle}
          </p>
        )}

        {/* Bullets */}
        {slide.bullets.length > 0 && (
          <div className="text-left bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl animate-fade-in-up delay-200" key={`bullets-${currentSlide}`}>
            <ul className="space-y-6">
              {slide.bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-4 text-lg md:text-2xl text-slate-200">
                  <span className="text-indigo-400 mt-1">●</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer / Navigation */}
      <div className="p-8 flex justify-between items-center bg-gradient-to-t from-slate-900 to-transparent">
        <div className="text-slate-500 text-sm font-mono">
          {currentSlide + 1} / {slides.length}
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
            disabled={currentSlide === 0}
            className="p-4 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
            disabled={currentSlide === slides.length - 1}
            className="p-4 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresentationMode;
