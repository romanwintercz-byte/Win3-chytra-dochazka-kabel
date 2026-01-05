import React, { useState, useEffect } from 'react';
import { Employee, Job } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { fetchGlobalLock, toggleGlobalLock, createGlobalNotification, createNotification } from '../services/supabase';
import { PresentationType } from './PresentationMode';

interface AdminPanelProps {
  employees: Employee[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onToggleEmployeeStatus: (id: string, isActive: boolean) => void;
  jobs: Job[];
  onAddJob: (job: Job) => void;
  onToggleJobStatus: (id: string, isActive: boolean) => void;
  currentUser: Employee;
  onStartPresentation: (type: PresentationType) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  employees, onAddEmployee, onUpdateEmployee, onToggleEmployeeStatus,
  jobs, onAddJob, onToggleJobStatus, currentUser, onStartPresentation
}) => {
  const [activeSection, setActiveSection] = useState<'employees' | 'jobs' | 'closings' | 'presentation' | 'announcements'>('employees');
  
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'Manager' | 'Zaměstnanec'>('Zaměstnanec');

  const [newJobName, setNewJobName] = useState('');
  const [newJobCode, setNewJobCode] = useState('');

  const [monthsList, setMonthsList] = useState<{month: string, isLocked: boolean}[]>([]);

  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info'|'warning'>('info');
  const [announcementTarget, setAnnouncementTarget] = useState<'all' | 'single'>('all');
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>('');

  useEffect(() => {
      if (activeSection === 'closings') {
          loadMonthsData();
      }
  }, [activeSection]);

  const loadMonthsData = async () => {
      const list = [];
      const today = new Date();
      for (let i = 0; i < 12; i++) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthStr = d.toISOString().slice(0, 7);
          const locked = await fetchGlobalLock(monthStr);
          list.push({ month: monthStr, isLocked: locked });
      }
      setMonthsList(list);
  };

  const handleToggleLock = async (month: string, currentStatus: boolean) => {
      try {
          await toggleGlobalLock(month, !currentStatus, currentUser.id);
          setMonthsList(prev => prev.map(m => m.month === month ? { ...m, isLocked: !currentStatus } : m));
          if (!currentStatus) {
              const activeUserIds = employees.filter(e => e.isActive).map(e => e.id);
              await createGlobalNotification(activeUserIds, `Měsíc ${month} byl globálně uzavřen pro zpracování mezd.`, 'warning');
          }
      } catch (e) {
          alert('Chyba při změně zámku.');
      }
  };

  const handleSendAnnouncement = async () => {
      if (!announcementMsg.trim()) return;
      try {
          if (announcementTarget === 'all') {
              const activeUserIds = employees.filter(e => e.isActive).map(e => e.id);
              await createGlobalNotification(activeUserIds, announcementMsg, announcementType);
              alert('Oznámení odesláno.');
          } else {
              if (!selectedTargetUserId) return alert('Vyberte příjemce.');
              await createNotification(selectedTargetUserId, announcementMsg, announcementType, currentUser.id);
              alert('Zpráva odeslána.');
          }
          setAnnouncementMsg('');
      } catch (e) { alert('Chyba.'); }
  };

  const activeEmployees = employees.filter(e => e.isActive !== false);
  const activeJobs = jobs.filter(j => j.isActive !== false);

  const handleSaveEmployee = async () => {
    if (!newEmpName || !newEmpEmail) return;
    if (editingEmployeeId) {
        const existing = employees.find(e => e.id === editingEmployeeId);
        if (existing) await onUpdateEmployee({ ...existing, name: newEmpName, email: newEmpEmail, role: newEmpRole });
    } else {
        await onAddEmployee({
          id: uuidv4(), name: newEmpName, email: newEmpEmail, role: newEmpRole,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newEmpName)}&background=random`,
          isActive: true
        });
    }
    setEditingEmployeeId(null); setNewEmpName(''); setNewEmpEmail(''); setNewEmpRole('Zaměstnanec');
  };

  const handleAddJob = async () => {
    if (!newJobName || !newJobCode) return;
    await onAddJob({ id: uuidv4(), name: newJobName, code: newJobCode, isActive: true });
    setNewJobName(''); setNewJobCode('');
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 mb-6 border-b border-gray-200 overflow-x-auto">
        <button onClick={() => setActiveSection('employees')} className={`py-2 px-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === 'employees' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Zaměstnanci</button>
        <button onClick={() => setActiveSection('jobs')} className={`py-2 px-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === 'jobs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Zakázky</button>
        <button onClick={() => setActiveSection('closings')} className={`py-2 px-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === 'closings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Uzávěrky</button>
        <button onClick={() => setActiveSection('announcements')} className={`py-2 px-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === 'announcements' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Oznámení</button>
      </div>

      {activeSection === 'employees' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h3 className="text-lg font-semibold mb-4 text-slate-900">Zaměstnanec</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jméno</label>
                <input type="text" value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-slate-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={newEmpEmail} onChange={(e) => setNewEmpEmail(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-slate-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select value={newEmpRole} onChange={(e) => setNewEmpRole(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-lg text-slate-900 bg-white">
                  <option value="Zaměstnanec">Zaměstnanec</option>
                  <option value="Manager">Manažer</option>
                </select>
              </div>
              <button onClick={handleSaveEmployee} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold">Uložit</button>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="text-lg font-semibold mb-4 text-slate-900">Seznam</h3>
             <div className="space-y-3">
                {activeEmployees.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg text-slate-900">
                    <div>{emp.name} <span className="text-xs text-gray-500">({emp.role})</span></div>
                    <button onClick={() => setEditingEmployeeId(emp.id)} className="text-indigo-600 font-bold text-sm">Upravit</button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {activeSection === 'jobs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h3 className="text-lg font-semibold mb-4 text-slate-900">Přidat zakázku</h3>
            <div className="space-y-3">
               <input type="text" value={newJobCode} onChange={(e) => setNewJobCode(e.target.value.toUpperCase())} placeholder="Kód" className="w-full p-2 border border-gray-300 rounded-lg text-slate-900 bg-white" />
               <input type="text" value={newJobName} onChange={(e) => setNewJobName(e.target.value)} placeholder="Název" className="w-full p-2 border border-gray-300 rounded-lg text-slate-900 bg-white" />
               <button onClick={handleAddJob} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold">Vytvořit</button>
            </div>
          </div>
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="text-lg font-semibold mb-4 text-slate-900">Aktivní</h3>
             {activeJobs.map(job => (
               <div key={job.id} className="p-3 border rounded-lg mb-2 text-slate-900">
                 {job.name} <span className="text-xs text-gray-500">({job.code})</span>
               </div>
             ))}
          </div>
        </div>
      )}

      {activeSection === 'announcements' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
              <h3 className="text-lg font-semibold mb-4 text-slate-900">Oznámení</h3>
              <div className="space-y-4">
                  <select value={announcementTarget} onChange={(e) => setAnnouncementTarget(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-lg text-slate-900 bg-white">
                      <option value="all">Všem</option>
                      <option value="single">Jednotlivci</option>
                  </select>
                  {announcementTarget === 'single' && (
                      <select value={selectedTargetUserId} onChange={(e) => setSelectedTargetUserId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-slate-900 bg-white">
                          <option value="">Vyberte...</option>
                          {activeEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                  )}
                  <textarea value={announcementMsg} onChange={(e) => setAnnouncementMsg(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg h-32 text-slate-900 bg-white" placeholder="Text..." />
                  <button onClick={handleSendAnnouncement} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Odeslat</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;