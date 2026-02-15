
import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactDeveloper: () => void;
  onServiceLogin: () => void; // Původní prop zůstává, ale změníme její význam v App.tsx
  version: string;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, onContactDeveloper, onServiceLogin, version }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8 flex flex-col items-center text-center">
          {/* Win3 Logo Big */}
          <div className="mb-6 transform hover:scale-105 transition-transform duration-500">
             <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="50" fill="#1e1b4b" />
                <path d="M30 35 L42 70 L54 35 L66 70 L78 35" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Win3</h2>
          <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-6">Digital Studio</p>

          <div className="space-y-4 text-gray-600 mb-8 leading-relaxed">
            <p>
              Tuto aplikaci jsme vyrobili s důrazem na design, efektivitu a spokojenost uživatelů.
            </p>
            <p className="font-medium text-gray-800">
              Líbí se vám aplikace?
            </p>
            <p>
              Máte nápad, jak ji vylepšit pro vaši firmu? Napište nám ho přímo sem.
            </p>
          </div>

          <a 
            href="https://win3.cz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-indigo-900 text-white px-8 py-3 rounded-full font-medium hover:bg-indigo-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Navštívit Win3.cz
          </a>

          <div className="mt-8 text-xs text-gray-400">
            Verze aplikace {version}
          </div>

          {/* Service Section */}
          <div className="mt-6 pt-6 border-t border-gray-100 w-full">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Zpětná vazba</h4>
            <div className="flex gap-3 justify-center">
                <button
                    onClick={onServiceLogin}
                    className="flex-1 text-xs text-indigo-700 hover:text-white font-bold px-4 py-3 bg-indigo-50 hover:bg-indigo-600 rounded-xl transition-all flex items-center justify-center gap-2 border border-indigo-100"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Mám nápad!
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
