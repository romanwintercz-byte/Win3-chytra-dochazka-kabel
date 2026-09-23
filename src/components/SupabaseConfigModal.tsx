import React, { useState } from 'react';
import { getKabelCredentials, saveCustomCredentials, clearCustomCredentials, isSupabaseConfigured } from '../credentials';
import { checkConnection, KABEL_SUPABASE_SETUP_SQL } from '../services/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose, onConfigSaved }) => {
  const currentCreds = getKabelCredentials();
  const [url, setUrl] = useState(currentCreds.url);
  const [key, setKey] = useState(currentCreds.key);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSql, setShowSql] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!url || !key) {
      setTestResult({ success: false, message: 'Vyplňte prosím URL i API klíč projektu Kabel.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    // Dočasně uložit pro otestování
    saveCustomCredentials(url, key);

    try {
      const res = await checkConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Chyba připojení' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    saveCustomCredentials(url, key);
    onConfigSaved();
    onClose();
  };

  const handleClear = () => {
    if (confirm('Opravdu chcete odpojit Supabase a přepnout aplikaci Kabel do lokálního / ukázkového režimu?')) {
      clearCustomCredentials();
      setUrl('');
      setKey('');
      setTestResult(null);
      onConfigSaved();
      onClose();
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(KABEL_SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>⚡</span>
              <span>Připojení Supabase pro firmu Kabel</span>
            </h3>
            <p className="text-xs text-slate-500">
              Původní databáze K+P byla odpojena. Zde nastavte nový projekt pro firmu Kabel.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl text-xs text-indigo-900">
            <strong>Jak nastavit novou databázi pro firmu Kabel:</strong>
            <ol className="list-decimal pl-4 mt-1.5 space-y-1 text-slate-600">
              <li>Vytvořte si nový projekt na <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-bold">supabase.com</a> (např. s názvem <em>Kabel-Dochazka</em>).</li>
              <li>V sekci <strong>Project Settings → API</strong> zkopírujte <strong>Project URL</strong> a <strong>anon / public key</strong>.</li>
              <li>Vložte je níže do formuláře a spusťte v Supabase SQL skript (tlačítko níže).</li>
            </ol>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Project URL pro Kabel
            </label>
            <input 
              type="text" 
              placeholder="https://xxxxxxxx.supabase.co" 
              value={url} 
              onChange={e => setUrl(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              API anon / public key pro Kabel
            </label>
            <textarea 
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
              value={key} 
              onChange={e => setKey(e.target.value)}
              rows={3}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl text-xs font-medium border ${testResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <div className="font-bold">{testResult.success ? '✓ Spojení úspěšné' : '✗ Chyba připojení:'}</div>
              <div>{testResult.message}</div>
            </div>
          )}

          {/* SQL Skript pro Supabase */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>📋</span>
                <span>SQL skript pro vytvoření tabulek v Supabase</span>
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="text-xs font-bold px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-xs"
              >
                {copiedSql ? '✓ Zkopírováno!' : 'Zkopírovat SQL'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              V novém Supabase projektu otevřete vlevo <strong>SQL Editor</strong>, vložte tento skript a klikněte na <strong>Run</strong>. Vytvoří tabulky <code>employees</code>, <code>jobs</code>, <code>time_entries</code> a <code>month_status</code>.
            </p>
            <div>
              <button
                type="button"
                onClick={() => setShowSql(!showSql)}
                className="text-[11px] text-indigo-600 hover:underline font-semibold"
              >
                {showSql ? 'Skrýt SQL kód' : 'Zobrazit SQL kód'}
              </button>
              {showSql && (
                <pre className="mt-2 p-2 bg-slate-900 text-emerald-400 text-[10px] rounded-lg overflow-x-auto max-h-40 font-mono">
                  {KABEL_SUPABASE_SETUP_SQL}
                </pre>
              )}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          {isSupabaseConfigured() && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50"
            >
              Odpojit a přepnout na Demo
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
            >
              {testing ? 'Testuji...' : 'Otestovat spojení'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md"
            >
              Uložit konfiguraci
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseConfigModal;
