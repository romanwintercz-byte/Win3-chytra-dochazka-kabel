
import React, { useState, useEffect } from 'react';

const UpdatePrompt: React.FC = () => {
  const [show, setShow] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Listen for custom event triggered by index.tsx when a new SW is found
    const onSWUpdated = (e: CustomEvent) => {
      setShow(true);
      setWaitingWorker(e.detail);
    };

    window.addEventListener('swUpdated', onSWUpdated as EventListener);
    
    return () => {
      window.removeEventListener('swUpdated', onSWUpdated as EventListener);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Send message to the waiting service worker to skip waiting and activate
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      // UI will hide, and page will reload automatically via controllerchange event in index.tsx
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] animate-fade-in-up">
      <div className="bg-slate-900 border-t border-slate-700 p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto rounded-t-xl sm:rounded-xl sm:mb-6 sm:mx-6">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-500 p-2 rounded-full animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="text-white">
            <h3 className="font-bold">Nová verze k dispozici</h3>
            <p className="text-sm text-slate-300">Aplikace byla aktualizována. Pro načtení změn je nutný restart.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShow(false)}
            className="flex-1 sm:flex-none px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            Později
          </button>
          <button 
            onClick={handleUpdate}
            className="flex-1 sm:flex-none px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-900/50 transition-all transform hover:scale-105"
          >
            AKTUALIZOVAT
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdatePrompt;
