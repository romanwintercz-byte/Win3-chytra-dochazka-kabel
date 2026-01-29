
import React, { useState } from 'react';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  recipientName: string;
  isRecipientOnline?: boolean;
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, onSend, recipientName, isRecipientOnline }) => {
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message);
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      {/* Container s fixní max-šířkou a automatickým centrováním */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="text-xl">✉️</span> Nová zpráva
            </h3>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <div className="p-6 space-y-5">
            {/* Příjemce */}
            <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Příjemce</label>
                <div className="bg-slate-50 p-3 rounded-xl text-slate-900 font-bold flex justify-between items-center border border-slate-100">
                    <span className="truncate">{recipientName}</span>
                    {isRecipientOnline && (
                        <span className="shrink-0 text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-200 flex items-center gap-1.5 font-bold">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            ONLINE
                        </span>
                    )}
                </div>
            </div>

            {/* Textarea */}
            <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Vaše zpráva / nápad</label>
                <textarea 
                    className="w-full p-4 border border-slate-200 rounded-xl h-40 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400 resize-none font-medium leading-relaxed outline-none transition-all shadow-inner"
                    placeholder="Zde napište, co máte na srdci..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    autoFocus
                ></textarea>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <button 
                    onClick={onClose}
                    className="flex-1 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors font-bold text-sm"
                >
                    Zrušit
                </button>
                <button 
                    onClick={handleSend}
                    disabled={!message.trim()}
                    className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 font-bold flex items-center justify-center gap-2 active:scale-95"
                >
                    <span>Odeslat zprávu</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
