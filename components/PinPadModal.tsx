
import React, { useState, useEffect } from 'react';

interface PinPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetPin: string;
  targetUserName: string;
}

const PinPadModal: React.FC<PinPadModalProps> = ({ isOpen, onClose, onSuccess, targetPin, targetUserName }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
    }
  }, [isOpen]);

  const handleNumberClick = (num: number) => {
    if (pin.length < 4) {
      const newPin = pin + num.toString();
      setPin(newPin);
      setError(false);
      
      // Auto-submit on 4th digit
      if (newPin.length === 4) {
        if (newPin === targetPin) {
          setTimeout(() => {
             onSuccess();
          }, 200);
        } else {
          setTimeout(() => {
             setError(true);
             setPin('');
          }, 300);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center">
        
        <div className="mb-6 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🔒
            </div>
            <h3 className="text-xl font-bold text-gray-900">Zadejte PIN</h3>
            <p className="text-sm text-gray-500 mt-1">
                Přístup k účtu: <br/><strong>{targetUserName}</strong>
            </p>
        </div>

        {/* PIN Dots */}
        <div className="flex gap-4 mb-8 h-8 items-center">
            {[0, 1, 2, 3].map((i) => (
                <div 
                    key={i} 
                    className={`rounded-full transition-all duration-300 ${
                        i < pin.length 
                            ? (error ? 'w-4 h-4 bg-red-500' : 'w-4 h-4 bg-indigo-600')
                            : 'w-3 h-3 bg-gray-200'
                    }`}
                ></div>
            ))}
        </div>

        {error && (
            <div className="text-red-500 text-sm font-bold mb-4 animate-shake">
                Nesprávný PIN
            </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-6 w-full max-w-[260px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                    key={num}
                    onClick={() => handleNumberClick(num)}
                    className="w-16 h-16 rounded-full bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-2xl font-semibold text-gray-700 transition-colors shadow-sm border border-gray-100 flex items-center justify-center"
                >
                    {num}
                </button>
            ))}
            
            <div className="w-16 h-16"></div> {/* Empty slot */}
            
            <button
                onClick={() => handleNumberClick(0)}
                className="w-16 h-16 rounded-full bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-2xl font-semibold text-gray-700 transition-colors shadow-sm border border-gray-100 flex items-center justify-center"
            >
                0
            </button>

            <button
                onClick={handleDelete}
                className="w-16 h-16 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex items-center justify-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
            </button>
        </div>

        <button 
            onClick={onClose}
            className="mt-8 text-gray-500 hover:text-gray-800 font-medium text-sm"
        >
            Zrušit
        </button>

      </div>
    </div>
  );
};

export default PinPadModal;
