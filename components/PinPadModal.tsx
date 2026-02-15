
import React, { useState } from 'react';

const PinPadModal: React.FC<{isOpen: boolean, onClose: () => void, onSuccess: () => void, targetPin: string, targetUserName: string}> = ({ isOpen, onClose, onSuccess, targetPin, targetUserName }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const add = (n: number) => {
    if (pin.length < 4) {
      const next = pin + n;
      setPin(next);
      if (next.length === 4) {
        if (next === targetPin) {
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => { setPin(''); setError(false); }, 1000);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
        <h3 className="text-xl font-bold mb-1">Zadejte PIN</h3>
        <p className="text-xs text-slate-400 mb-6">{targetUserName}</p>
        <div className="flex justify-center gap-4 mb-8 h-8">
            {[0, 1, 2, 3].map(i => <div key={i} className={`w-4 h-4 rounded-full ${i < pin.length ? (error ? 'bg-red-500' : 'bg-indigo-600') : 'bg-gray-200'}`} />)}
        </div>
        <div className="grid grid-cols-3 gap-4 max-w-[240px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0].map((n, i) => (
                n !== '' ? (
                    <button key={i} onClick={() => add(Number(n))} className="w-14 h-14 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-full text-xl font-bold transition shadow-sm">{n}</button>
                ) : <div key={i} />
            ))}
            <button onClick={() => setPin('')} className="w-14 h-14 text-slate-400">CLR</button>
        </div>
        <button onClick={onClose} className="mt-8 text-xs font-bold text-slate-400">ZRUŠIT</button>
      </div>
    </div>
  );
};
export default PinPadModal;
