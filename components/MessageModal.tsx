
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
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 animate-fade-in overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" 
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] animate-scale-in border border-white/20">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
             </div>
             <h3 className="text-lg font-bold text-slate-900">Nová zpráva</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"
            aria-label="Zavřít"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto overflow-x-hidden">
          {/* Recipient Info */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="min-w-0">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Komu</label>
              <div className="text-slate-900 font-bold text-base truncate">{recipientName}</div>
            </div>
            {isRecipientOnline && (
              <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black border border-green-200 shrink-0">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                ONLINE
              </div>
            )}
          </div>

          {/* Message Area */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Obsah zprávy</label>
            <textarea
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Napište svůj vzkaz..."
              className="w-full min-h-[180px] p-4 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none shadow-sm text-base leading-relaxed"
            ></textarea>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-row gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-white rounded-xl transition-all"
          >
            Zrušit
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <span>Odeslat zprávu</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
