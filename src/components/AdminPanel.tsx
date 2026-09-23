import React, { useState, useRef } from 'react';
import { Employee, Job } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getFullBackup, restoreBackup, KABEL_SUPABASE_SETUP_SQL, checkConnection } from '../services/supabase';
import { getKabelCredentials, isSupabaseConfigured } from '../credentials';

interface AdminPanelProps {
  employees: Employee[];
  jobs: Job[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onToggleEmployeeStatus: (id: string, isActive: boolean) => void;
  onDeleteEmployee?: (id: string) => void;
  onAddJob: (job: Job) => void;
  onUpdateJob: (job: Job) => void;
  onToggleJobStatus: (id: string, isActive: boolean) => void;
  onOpenSupabaseConfig: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  employees, 
  jobs, 
  onAddEmployee, 
  onUpdateEmployee, 
  onToggleEmployeeStatus, 
  onDeleteEmployee,
  onAddJob, 
  onUpdateJob,
  onToggleJobStatus,
  onOpenSupabaseConfig
}) => {
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'Manager' | 'Zaměstnanec'>('Zaměstnanec');
  const [newEmpPin, setNewEmpPin] = useState('');
  const [newEmpDepartment, setNewEmpDepartment] = useState<'10000' | '10001' | string>('10001');
  
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [newJobName, setNewJobName] = useState('');
  const [newJobCode, setNewJobCode] = useState('');

  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const creds = getKabelCredentials();
  const configured = isSupabaseConfigured();

  const handleCopySql = () => {
    navigator.clipboard.writeText(KABEL_SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleTestConnection = async () => {
    setTestResult('Testuji spojení se Supabase...');
    const res = await checkConnection();
    setTestResult(res.success ? `✓ ${res.message}` : `✗ ${res.message}`);
  };

  const handleDownloadBackup = async () => {
    setIsBackupLoading(true);
    try {
      const data = await getFullBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kabel_zaloha_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Chyba při stahování zálohy: ' + err.message);
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('VAROVÁNÍ: Obnova dat ze zálohy nahradí aktuální stav databáze. Chcete pokračovat?')) {
      e.target.value = '';
      return;
    }

    setIsBackupLoading(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      await restoreBackup(backupData);
      alert('Data firmy Kabel byla úspěšně obnovena ze zálohy!');
      window.location.reload();
    } catch (err: any) {
      alert('Chyba při obnově dat: ' + err.message);
    } finally {
      setIsBackupLoading(false);
      e.target.value = '';
    }
  };

  const handleAddEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    
    if (editingEmpId) {
      const existingEmp = employees.find(emp => String(emp.id) === String(editingEmpId));
      if (existingEmp) {
        onUpdateEmployee({
          ...existingEmp,
          name: newEmpName.trim(),
          email: newEmpEmail.trim(),
          role: newEmpRole,
          pinCode: newEmpPin.trim() || undefined,
          department: newEmpDepartment || undefined
        });
      }
      setEditingEmpId(null);
    } else {
      onAddEmployee({
        id: uuidv4(),
        name: newEmpName.trim(),
        email: newEmpEmail.trim(),
        role: newEmpRole,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newEmpName)}`,
        isActive: true,
        pinCode: newEmpPin.trim() || undefined,
        department: newEmpDepartment || undefined
      });
    }
    setNewEmpName('');
    setNewEmpEmail('');
    setNewEmpRole('Zaměstnanec');
    setNewEmpPin('');
    setNewEmpDepartment('10001');
  };

  const handleEditEmpClick = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setNewEmpName(emp.name);
    setNewEmpEmail(emp.email || '');
    setNewEmpRole(emp.role);
    setNewEmpPin(emp.pinCode || '');
    setNewEmpDepartment(emp.department || '10001');
  };

  const handleCancelEditEmp = () => {
    setEditingEmpId(null);
    setNewEmpName('');
    setNewEmpEmail('');
    setNewEmpRole('Zaměstnanec');
    setNewEmpPin('');
    setNewEmpDepartment('10001');
  };

  const handleAddJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName.trim() || !newJobCode.trim()) return;
    
    if (editingJobId) {
      const existingJob = jobs.find(j => String(j.id) === String(editingJobId));
      if (existingJob) {
        onUpdateJob({
          ...existingJob,
          name: newJobName.trim(),
          code: newJobCode.trim().toUpperCase()
        });
      }
      setEditingJobId(null);
    } else {
      onAddJob({
        id: uuidv4(),
        name: newJobName.trim(),
        code: newJobCode.trim().toUpperCase(),
        isActive: true
      });
    }
    setNewJobName('');
    setNewJobCode('');
  };

  const handleEditJobClick = (job: Job) => {
    setEditingJobId(job.id);
    setNewJobName(job.name);
    setNewJobCode(job.code);
  };

  const handleCancelEditJob = () => {
    setEditingJobId(null);
    setNewJobName('');
    setNewJobCode('');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>⚙️</span>
            <span>Administrace a nastavení firmy Kabel</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Správa zaměstnanců, výrobních středisek, zakázek kabeláže a propojení s novou Supabase databází.
          </p>
        </div>

        {/* 1. KABEL SUPABASE KONFIGURACE */}
        <section className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-lg font-black text-white">Databáze Supabase pro firmu Kabel</h3>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {configured ? (
                  <span>Aktivní připojení: <code className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-mono text-[11px]">{creds.url}</code></span>
                ) : (
                  <span>Databáze není připojena (aplikace běží v lokálním Demo režimu s ukázkovými daty). Původní vazby na K+P byly odstraněny.</span>
                )}
              </p>
              {testResult && (
                <p className={`text-xs mt-2 font-bold ${testResult.startsWith('✓') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {testResult}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleCopySql}
                className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {copiedSql ? '✓ Zkopírováno!' : '📋 Zkopírovat SQL pro Supabase'}
              </button>
              {configured && (
                <button
                  type="button"
                  onClick={handleTestConnection}
                  className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Otestovat
                </button>
              )}
              <button
                type="button"
                onClick={onOpenSupabaseConfig}
                className="h-10 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md"
              >
                {configured ? 'Změnit konfiguraci' : 'Připojit novou Supabase'}
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Zaměstnanci */}
          <section className="space-y-4">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <span>👥</span>
              <span>Zaměstnanci firmy Kabel</span>
            </h3>
            
            <form onSubmit={handleAddEmp} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                {editingEmpId ? 'Upravit zaměstnance' : 'Nový zaměstnanec'}
              </h4>
              
              <input 
                type="text" 
                placeholder="Jméno a příjmení" 
                value={newEmpName} 
                onChange={e => setNewEmpName(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              
              <input 
                type="email" 
                placeholder="Firemní e-mail (např. jmeno@kabel.cz)" 
                value={newEmpEmail} 
                onChange={e => setNewEmpEmail(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={newEmpRole} 
                  onChange={e => setNewEmpRole(e.target.value as any)}
                  className="h-10 px-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                >
                  <option value="Zaměstnanec">Zaměstnanec</option>
                  <option value="Manager">Manažer / Admin</option>
                </select>

                <input 
                  type="text" 
                  placeholder="PIN kód (4 číslice)" 
                  value={newEmpPin} 
                  maxLength={4}
                  onChange={e => setNewEmpPin(e.target.value.replace(/\D/g, ''))}
                  className="h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Výchozí středisko:</label>
                <select
                  value={newEmpDepartment}
                  onChange={e => setNewEmpDepartment(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                >
                  <option value="10001">10001 - Výroba a montáž kabelů</option>
                  <option value="10000">10000 - Kancelář a administrativa</option>
                  <option value="">Bez střediska</option>
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                <button 
                  type="submit" 
                  className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  {editingEmpId ? 'Uložit změny' : 'Přidat zaměstnance'}
                </button>
                {editingEmpId && (
                  <button 
                    type="button" 
                    onClick={handleCancelEditEmp} 
                    className="h-10 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Zrušit
                  </button>
                )}
              </div>
            </form>

            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {employees.map(e => (
                <div key={e.id} className={`p-3 flex justify-between items-center ${!e.isActive ? 'opacity-50 bg-slate-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <img src={e.avatar} alt="" className="w-9 h-9 rounded-full bg-slate-100 object-cover" />
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>{e.name}</span>
                        {e.pinCode && <span title="Chráněno PINem">🔒</span>}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {e.role} • {e.department === '10000' ? 'Kancelář' : e.department === '10001' ? 'Výroba' : e.department || 'Bez střediska'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button 
                      type="button"
                      onClick={() => handleEditEmpClick(e)}
                      className="text-xs px-2.5 py-1 rounded-lg font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      Upravit
                    </button>
                    <button 
                      type="button"
                      onClick={() => onToggleEmployeeStatus(e.id, !e.isActive)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        e.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {e.isActive ? 'Archivovat' : 'Aktivovat'}
                    </button>
                    {onDeleteEmployee && (
                      <button 
                        type="button"
                        onClick={() => {
                          if (confirm(`Opravdu chcete smazat zaměstnance ${e.name}?`)) {
                            onDeleteEmployee(e.id);
                          }
                        }}
                        className="text-xs px-2 py-1 rounded-lg font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                        title="Smazat zaměstnance"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Zakázky a střediska */}
          <section className="space-y-4">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <span>📁</span>
              <span>Zakázky a výrobní střediska Kabel</span>
            </h3>
            
            <form onSubmit={handleAddJobSubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                {editingJobId ? 'Upravit zakázku' : 'Nová zakázka / projekt'}
              </h4>
              
              <input 
                type="text" 
                placeholder="Název zakázky (např. Kabeláž pro automotive)" 
                value={newJobName} 
                onChange={e => setNewJobName(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              
              <input 
                type="text" 
                placeholder="Kód zakázky (např. KAB-2026-05 nebo 10001)" 
                value={newJobCode} 
                onChange={e => setNewJobCode(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                required
              />

              <div className="flex gap-2 pt-1">
                <button 
                  type="submit" 
                  className="flex-1 h-10 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  {editingJobId ? 'Uložit změny' : 'Přidat zakázku'}
                </button>
                {editingJobId && (
                  <button 
                    type="button" 
                    onClick={handleCancelEditJob} 
                    className="h-10 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Zrušit
                  </button>
                )}
              </div>
            </form>

            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {jobs.map(j => (
                <div key={j.id} className={`p-3 flex justify-between items-center ${!j.isActive ? 'opacity-50 bg-slate-50' : ''}`}>
                  <div>
                    <div className="font-bold text-xs text-slate-900">{j.name}</div>
                    <div className="text-[11px] font-mono font-bold text-indigo-600">{j.code}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      type="button"
                      onClick={() => handleEditJobClick(j)}
                      className="text-xs px-2.5 py-1 rounded-lg font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      Upravit
                    </button>
                    <button 
                      type="button"
                      onClick={() => onToggleJobStatus(j.id, !j.isActive)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        j.isActive ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {j.isActive ? 'Archivovat' : 'Aktivovat'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Zálohování a obnova dat */}
          <section className="lg:col-span-2 space-y-4 border-t border-slate-100 pt-6">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>💾</span>
              <span>Zálohování a obnova dat docházky Kabel</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Exportovat kompletní zálohu</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Stáhne do JSON souboru všechny zaměstnance, zakázky a docházkové záznamy.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={isBackupLoading}
                  className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors whitespace-nowrap disabled:opacity-50 self-start shadow-xs"
                >
                  {isBackupLoading ? 'Exportuji...' : 'Stáhnout JSON zálohu'}
                </button>
              </div>

              <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-rose-900">Obnovit data ze záložního souboru</h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Nahradí data v systému obsahem ze záložního JSON souboru.
                  </p>
                </div>
                <div>
                  <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleRestoreBackup} 
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBackupLoading}
                    className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors whitespace-nowrap shadow-xs disabled:opacity-50"
                  >
                    {isBackupLoading ? 'Nahrávám...' : 'Vybrat soubor a obnovit'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
