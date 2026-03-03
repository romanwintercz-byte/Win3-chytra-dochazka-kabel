
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
  onToggleJobStatus: (id: string, isActive: boolean) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  employees, 
  jobs, 
  onAddEmployee, 
  onUpdateEmployee, 
  onToggleEmployeeStatus, 
  onAddJob, 
  onToggleJobStatus 
}) => {
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('Employee');
  const [newEmpPin, setNewEmpPin] = useState('');
  
  const [newJobName, setNewJobName] = useState('');
  const [newJobCode, setNewJobCode] = useState('');

  const handleAddEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    onAddEmployee({
      id: uuidv4(),
      name: newEmpName,
      role: newEmpRole as 'Manager' | 'Employee',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newEmpName}`,
      isActive: true,
      pinCode: newEmpPin || undefined
    });
    setNewEmpName('');
    setNewEmpRole('Employee');
    setNewEmpPin('');
  };

  const handleAddJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName.trim() || !newJobCode.trim()) return;
    onAddJob({
      id: uuidv4(),
      name: newJobName,
      code: newJobCode,
      isActive: true
    });
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
              <h4 className="text-sm font-bold text-slate-700">Přidat zaměstnance</h4>
              <input 
                type="text" 
                placeholder="Jméno a příjmení" 
                value={newEmpName} 
                onChange={e => setNewEmpName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md text-sm"
                required
              />
              <div className="flex gap-2">
                <select 
                  value={newEmpRole} 
                  onChange={e => setNewEmpRole(e.target.value)}
                  className="flex-1 p-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="Employee">Zaměstnanec</option>
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
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-bold hover:bg-indigo-700 transition-colors">
                Přidat zaměstnance
              </button>
            </form>

            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {employees.map(e => (
                <div key={e.id} className={`p-3 flex justify-between items-center ${!e.isActive ? 'opacity-50 bg-slate-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <img src={e.avatar} alt="" className="w-8 h-8 rounded-full bg-slate-100" />
                    <div>
                      <div className="font-medium text-sm text-slate-900">{e.name}</div>
                      <div className="text-xs text-slate-500">{e.role} {e.pinCode ? '• PIN nastaven' : ''}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => onToggleEmployeeStatus(e.id, !e.isActive)}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${e.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                  >
                    {e.isActive ? 'Archivovat' : 'Obnovit'}
                  </button>
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
              <h4 className="text-sm font-bold text-slate-700">Přidat zakázku</h4>
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
              <button type="submit" className="w-full bg-orange-600 text-white py-2 rounded-md text-sm font-bold hover:bg-orange-700 transition-colors">
                Přidat zakázku
              </button>
            </form>

            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {jobs.map(j => (
                <div key={j.id} className={`p-3 flex justify-between items-center ${!j.isActive ? 'opacity-50 bg-slate-50' : ''}`}>
                  <div>
                    <div className="font-medium text-sm text-slate-900">{j.name}</div>
                    <div className="text-xs text-slate-500">{j.code}</div>
                  </div>
                  <button 
                    onClick={() => onToggleJobStatus(j.id, !j.isActive)}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${j.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                  >
                    {j.isActive ? 'Archivovat' : 'Obnovit'}
                  </button>
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
