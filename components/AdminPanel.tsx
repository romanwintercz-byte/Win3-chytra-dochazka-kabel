
import React, { useState } from 'react';
import { Employee, Job } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AdminPanelProps {
  employees: Employee[];
  jobs: Job[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onToggleEmployeeStatus: (id: string, isActive: boolean) => void;
  onAddJob: (job: Job) => void;
  onUpdateJob: (job: Job) => void;
  onToggleJobStatus: (id: string, isActive: boolean) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  employees, 
  jobs, 
  onAddEmployee, 
  onUpdateEmployee, 
  onToggleEmployeeStatus, 
  onAddJob, 
  onUpdateJob,
  onToggleJobStatus 
}) => {
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('Zaměstnanec');
  const [newEmpPin, setNewEmpPin] = useState('');
  const [newEmpDepartment, setNewEmpDepartment] = useState<'10000' | '10001' | ''>('');
  
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [newJobName, setNewJobName] = useState('');
  const [newJobCode, setNewJobCode] = useState('');

  const handleAddEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    
    if (editingEmpId) {
      const existingEmp = employees.find(emp => String(emp.id) === String(editingEmpId));
      if (existingEmp) {
        onUpdateEmployee({
          ...existingEmp,
          name: newEmpName,
          email: newEmpEmail,
          role: newEmpRole as 'Manager' | 'Zaměstnanec',
          pinCode: newEmpPin || undefined,
          department: newEmpDepartment || undefined
        });
      }
      setEditingEmpId(null);
    } else {
      onAddEmployee({
        id: uuidv4(),
        name: newEmpName,
        email: newEmpEmail,
        role: newEmpRole as 'Manager' | 'Zaměstnanec',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newEmpName}`,
        isActive: true,
        pinCode: newEmpPin || undefined,
        department: newEmpDepartment || undefined
      });
    }
    setNewEmpName('');
    setNewEmpEmail('');
    setNewEmpRole('Zaměstnanec');
    setNewEmpPin('');
    setNewEmpDepartment('');
  };

  const handleEditEmpClick = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setNewEmpName(emp.name);
    setNewEmpEmail(emp.email || '');
    setNewEmpRole(emp.role);
    setNewEmpPin(emp.pinCode || '');
    setNewEmpDepartment(emp.department || '');
  };

  const handleCancelEditEmp = () => {
    setEditingEmpId(null);
    setNewEmpName('');
    setNewEmpEmail('');
    setNewEmpRole('Zaměstnanec');
    setNewEmpPin('');
    setNewEmpDepartment('');
  };

  const handleAddJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName.trim() || !newJobCode.trim()) return;
    
    if (editingJobId) {
      const existingJob = jobs.find(j => String(j.id) === String(editingJobId));
      if (existingJob) {
        onUpdateJob({
          ...existingJob,
          name: newJobName,
          code: newJobCode
        });
      }
      setEditingJobId(null);
    } else {
      onAddJob({
        id: uuidv4(),
        name: newJobName,
        code: newJobCode,
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
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 mb-8">Nastavení systému</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Zaměstnanci */}
          <section>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">👥</span> 
              Zaměstnanci
            </h3>
            
            <form onSubmit={handleAddEmp} className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 space-y-3">
              <h4 className="text-sm font-bold text-slate-700">{editingEmpId ? 'Upravit zaměstnance' : 'Přidat zaměstnance'}</h4>
              <input 
                type="text" 
                placeholder="Jméno a příjmení" 
                value={newEmpName} 
                onChange={e => setNewEmpName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md text-sm"
                required
              />
              <input 
                type="email" 
                placeholder="E-mail" 
                value={newEmpEmail} 
                onChange={e => setNewEmpEmail(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md text-sm"
                required
              />
              <div className="flex gap-2">
                <select 
                  value={newEmpRole} 
                  onChange={e => setNewEmpRole(e.target.value)}
                  className="flex-1 p-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="Zaměstnanec">Zaměstnanec</option>
                  <option value="Manager">Manažer</option>
                </select>
                <input 
                  type="text" 
                  placeholder="PIN (volitelné)" 
                  value={newEmpPin} 
                  onChange={e => setNewEmpPin(e.target.value)}
                  className="flex-1 p-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={newEmpDepartment}
                  onChange={e => setNewEmpDepartment(e.target.value as '10000' | '10001' | '')}
                  className="w-full p-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">-- Vyberte středisko --</option>
                  <option value="10000">10000 - Kancelář</option>
                  <option value="10001">10001 - Výroba</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-md text-sm font-bold hover:bg-indigo-700 transition-colors">
                  {editingEmpId ? 'Uložit změny' : 'Přidat zaměstnance'}
                </button>
                {editingEmpId && (
                  <button type="button" onClick={handleCancelEditEmp} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-md text-sm font-bold hover:bg-slate-300 transition-colors">
                    Zrušit
                  </button>
                )}
              </div>
            </form>

            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {employees.map(e => (
                <div key={e.id} className={`p-3 flex justify-between items-center ${!e.isActive ? 'opacity-50 bg-slate-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <img src={e.avatar} alt="" className="w-8 h-8 rounded-full bg-slate-100" />
                    <div>
                      <div className="font-medium text-sm text-slate-900">{e.name} <span className="text-normal text-slate-500 font-normal">({e.email})</span></div>
                      <div className="text-xs text-slate-500">{e.role} {e.pinCode ? '• PIN nastaven' : ''} {e.department ? `• ${e.department === '10000' ? '10000 - Kancelář' : '10001 - Výroba'}` : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEditEmpClick(e)}
                      className="text-xs px-3 py-1 rounded-full font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Upravit
                    </button>
                    <button 
                      onClick={() => onToggleEmployeeStatus(e.id, !e.isActive)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${e.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                    >
                      {e.isActive ? 'Archivovat' : 'Obnovit'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Zakázky */}
          <section>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="bg-orange-100 text-orange-600 p-1.5 rounded-lg">📁</span> 
              Zakázky
            </h3>
            
            <form onSubmit={handleAddJobSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 space-y-3">
              <h4 className="text-sm font-bold text-slate-700">{editingJobId ? 'Upravit zakázku' : 'Přidat zakázku'}</h4>
              <input 
                type="text" 
                placeholder="Název zakázky (např. Rekonstrukce bytu)" 
                value={newJobName} 
                onChange={e => setNewJobName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md text-sm"
                required
              />
              <input 
                type="text" 
                placeholder="Kód zakázky (např. ZAK-2023-01)" 
                value={newJobCode} 
                onChange={e => setNewJobCode(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md text-sm"
                required
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-orange-600 text-white py-2 rounded-md text-sm font-bold hover:bg-orange-700 transition-colors">
                  {editingJobId ? 'Uložit změny' : 'Přidat zakázku'}
                </button>
                {editingJobId && (
                  <button type="button" onClick={handleCancelEditJob} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-md text-sm font-bold hover:bg-slate-300 transition-colors">
                    Zrušit
                  </button>
                )}
              </div>
            </form>

            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {jobs.map(j => (
                <div key={j.id} className={`p-3 flex justify-between items-center ${!j.isActive ? 'opacity-50 bg-slate-50' : ''}`}>
                  <div>
                    <div className="font-medium text-sm text-slate-900">{j.name}</div>
                    <div className="text-xs text-slate-500">{j.code}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEditJobClick(j)}
                      className="text-xs px-3 py-1 rounded-full font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Upravit
                    </button>
                    <button 
                      onClick={() => onToggleJobStatus(j.id, !j.isActive)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${j.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                    >
                      {j.isActive ? 'Archivovat' : 'Obnovit'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
