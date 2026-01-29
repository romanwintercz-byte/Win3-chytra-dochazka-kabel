
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
    // HLAVNÍ KONTEJNER: Zaručuje centrování ve všech osách
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      
      {/* MODAL: Max šířka a vnitřní padding */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">✉️</span>
            <h3 className="text-lg font-bold text-slate-900">Nová zpráva</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Příjemce</p>
              <p className="text-slate-900 font-bold truncate">{recipientName}</p>
            </div>
            {isRecipientOnline && (
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200">
                ONLINE
              </span>
            )}
          </div>

          <textarea
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Napište svůj vzkaz..."
            className="w-full min-h-[160px] p-4 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none shadow-inner"
          ></textarea>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"
          >
            Zrušit
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all"
          >
            Odeslat
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
