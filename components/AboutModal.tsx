
import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactDeveloper: () => void;
  onServiceLogin: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, onContactDeveloper, onServiceLogin }) => {
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
              Líbí se vám?
            </p>
            <p>
              Rádi pro vás vytvoříme podobné softwarové řešení nebo mobilní aplikaci na míru.
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
            Verze aplikace 1.5.6
          </div>

          {/* Service Section */}
          <div className="mt-6 pt-6 border-t border-gray-100 w-full">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Podpora & Servis</h4>
            <div className="flex gap-3 justify-center">
                <button
                    onClick={onContactDeveloper}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-2 bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Napsat vývojáři
                </button>
                <button
                    onClick={onServiceLogin}
                    className="text-xs text-gray-400 hover:text-gray-600 font-medium px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Servisní přístup
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
