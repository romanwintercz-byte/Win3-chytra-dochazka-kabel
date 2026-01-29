
import React, { useState, useEffect } from 'react';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  recipientName: string;
  isRecipientOnline?: boolean;
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, onSend, recipientName, isRecipientOnline }) => {
  const [message, setMessage] = useState('');

  // Reset zprávy při otevření
  useEffect(() => {
    if (isOpen) setMessage('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto overflow-x-hidden">
      {/* Overlay - Pozadí */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Kontejner pro centrování - tento flexbox zajistí, že okno bude vždy uprostřed */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        
        {/* Samotné okno */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-md sm:my-8 animate-fade-in">
          
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="text-xl">✉️</span> Nová zpráva
            </h3>
            <button 
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Info o příjemci */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Příjemce</label>
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <span className="text-slate-900 font-bold truncate pr-2">{recipientName}</span>
                {isRecipientOnline && (
                  <span className="shrink-0 flex items-center gap-1.5 bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold border border-green-200">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    ONLINE
                  </span>
                )}
              </div>
            </div>

            {/* Editor zprávy */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Vaše zpráva</label>
              <textarea
                autoFocus
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Napište svůj vzkaz nebo nápad..."
                className="w-full min-h-[160px] p-4 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none shadow-inner text-base"
              ></textarea>
            </div>
          </div>

          {/* Footer s akcemi */}
          <div className="bg-gray-50 px-6 py-4 flex flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-white hover:text-slate-700 rounded-xl transition-all"
            >
              Zrušit
            </button>
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Odeslat zprávu</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
