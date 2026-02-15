
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
        
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="text-xl">✉️</span> Nová zpráva
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Příjemce</label>
            <div className="bg-gray-100 p-2 rounded-lg text-gray-800 font-medium flex justify-between items-center">
                <span>{recipientName}</span>
                {isRecipientOnline && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        Online
                    </span>
                )}
            </div>
        </div>

        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Zpráva</label>
            <textarea 
                className="w-full p-3 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Napište zprávu..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                autoFocus
            ></textarea>
        </div>

        <div className="flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
                Zrušit
            </button>
            <button 
                onClick={handleSend}
                disabled={!message.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md font-bold flex items-center gap-2"
            >
                <span>Odeslat</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </button>
        </div>

      </div>
    </div>
  );
};

export default MessageModal;
