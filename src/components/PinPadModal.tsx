import React, { useState, useEffect } from 'react';
import { isBiometricsSupported, hasBiometricsRegistered, registerBiometrics, authenticateBiometrics } from '../services/biometrics';

interface PinPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetPin: string;
  targetUserId?: string;
  targetUserName: string;
  title?: string;
  subtitle?: string;
}

const PinPadModal: React.FC<PinPadModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  targetPin, 
  targetUserName,
  targetUserId,
  title,
  subtitle
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsRegistered, setBiometricsRegistered] = useState(false);


  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      setBiometricsAvailable(isBiometricsSupported());
      if (targetUserId) {
        const isRegistered = hasBiometricsRegistered(targetUserId);
        setBiometricsRegistered(isRegistered);
        
        // Auto-trigger if registered
        if (isRegistered) {
          handleBiometricLogin();
        }
      }
    }
  }, [isOpen, targetUserId]);

  const handleBiometricLogin = async () => {
    if (!targetUserId) return;
    const success = await authenticateBiometrics(targetUserId);
    if (success) {
      onSuccess();
    }
  };

  const handleBiometricRegister = async () => {
    if (!targetUserId) return;
    const success = await registerBiometrics(targetUserId, targetUserName);
    if (success) {
      setBiometricsRegistered(true);
      alert('Biometrie byla úspěšně nastavena pro toto zařízení!');
    }
  };


  const add = (n: number) => {
    if (pin.length < 4) {
      const next = pin + n;
      setPin(next);
      if (next.length === 4) {
        if (next === targetPin) {
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => { setPin(''); setError(false); }, 900);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-xs">
          🔒
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-1">{title || 'Zadejte PIN kód'}</h3>
        <p className="text-xs text-slate-500 mb-6">
          {subtitle || (
            <>Přístup k profilu: <strong className="text-slate-800">{targetUserName}</strong></>
          )}
        </p>
        
        {/* PIN tečky */}
        <div className="flex justify-center gap-3 mb-6 h-6 items-center">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`rounded-full transition-all duration-200 ${
                i < pin.length 
                  ? (error ? 'w-4 h-4 bg-red-500 scale-110' : 'w-4 h-4 bg-indigo-600 scale-110') 
                  : 'w-3 h-3 bg-slate-200'
              }`} 
            />
          ))}
        </div>

        {error && (
          <div className="text-red-600 text-xs font-bold mb-4 animate-bounce">
            Nesprávný PIN kód, zkuste to znovu
          </div>
        )}

        {/* Klávesnice */}
        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button 
              key={n} 
              type="button"
              onClick={() => add(n)} 
              className="w-16 h-16 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-2xl text-xl font-black text-slate-800 transition shadow-xs flex items-center justify-center mx-auto"
            >
              {n}
            </button>
          ))}
          <button 
            type="button" 
            onClick={() => setPin('')} 
            className="w-16 h-16 text-slate-400 hover:text-slate-600 font-bold text-xs flex items-center justify-center mx-auto"
          >
            SMAZAT
          </button>
          <button 
            type="button" 
            onClick={() => add(0)} 
            className="w-16 h-16 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-2xl text-xl font-black text-slate-800 transition shadow-xs flex items-center justify-center mx-auto"
          >
            0
          </button>
          <button 
            type="button" 
            onClick={handleDelete} 
            className="w-16 h-16 text-slate-400 hover:text-slate-600 font-bold text-lg flex items-center justify-center mx-auto"
          >
            ⌫
          </button>
        </div>

        {/* Zrušit tlačítko */}
        <button 
          type="button" 
          onClick={onClose} 
          className="mt-2 text-xs font-bold text-slate-400 hover:text-slate-600 py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors"
        >
          ZRUŠIT
        </button>

        {/* Biometrie UI */}
        {biometricsAvailable && targetUserId && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            {biometricsRegistered ? (
              <button
                type="button"
                onClick={handleBiometricLogin}
                className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-xl">👁️</span> Přihlásit se (Face ID / Otisk)
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBiometricRegister}
                className="w-full py-3 bg-slate-50 text-slate-600 rounded-2xl font-semibold text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-lg">🔐</span> Povolit otisk prstu / Face ID
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PinPadModal;
