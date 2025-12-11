
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
  
  // Employee Form State
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'Manager' | 'Zaměstnanec'>('Zaměstnanec');

  // Job Form State
  const [newJobName, setNewJobName] = useState('');
  const [newJobCode, setNewJobCode] = useState('');

  // Closings State
  const [monthsList, setMonthsList] = useState<{month: string, isLocked: boolean}[]>([]);

  // Announcement State
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info'|'warning'>('info');
  const [announcementTarget, setAnnouncementTarget] = useState<'all' | 'single'>('all');
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>('');

  // Load locks when switching to 'closings'
  useEffect(() => {
      if (activeSection === 'closings') {
          loadMonthsData();
      }
  }, [activeSection]);

  const loadMonthsData = async () => {
      // Generate last 12 months
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
          
          // Send notification if locking
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
              alert('Oznámení odesláno všem aktivním zaměstnancům.');
          } else {
              if (!selectedTargetUserId) {
                  alert('Vyberte prosím příjemce.');
                  return;
              }
              // Send single notification
              await createNotification(selectedTargetUserId, announcementMsg, announcementType, currentUser.id);
              alert('Zpráva odeslána.');
          }
          setAnnouncementMsg('');
      } catch (e) {
          console.error(e);
          alert('Chyba při odesílání.');
      }
  };

  const activeEmployees = employees.filter(e => e.isActive !== false);
  const activeJobs = jobs.filter(j => j.isActive !== false);
  const archivedEmployees = employees.filter(e => e.isActive === false);
  const archivedJobs = jobs.filter(j => j.isActive === false);

  const handleSaveEmployee = async () => {
    if (!newEmpName || !newEmpEmail) return;

    if (editingEmployeeId) {
        // UPDATE MODE
        const existing = employees.find(e => e.id === editingEmployeeId);
        if (existing) {
            await onUpdateEmployee({
                ...existing,
                name: newEmpName,
                email: newEmpEmail,
                role: newEmpRole
            });
        }
    } else {
        // ADD MODE
        const newId = uuidv4(); 
        await onAddEmployee({
          id: newId,
          name: newEmpName,
          email: newEmpEmail,
          role: newEmpRole,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newEmpName)}&background=random`,
          isActive: true
        });
    }
    
    // Reset Form
    setEditingEmployeeId(null);
    setNewEmpName('');
    setNewEmpEmail('');
    setNewEmpRole('Zaměstnanec');
  };

  const startEditingEmployee = (emp: Employee) => {
      setEditingEmployeeId(emp.id);
      setNewEmpName(emp.name);
      setNewEmpEmail(emp.email);
      setNewEmpRole(emp.role);
  };

  const cancelEditingEmployee = () => {
      setEditingEmployeeId(null);
      setNewEmpName('');
      setNewEmpEmail('');
      setNewEmpRole('Zaměstnanec');
  };

  const handleAddJob = async () => {
    if (!newJobName || !newJobCode) return;
    await onAddJob({
      id: uuidv4(),
      name: newJobName,
      code: newJobCode,
      isActive: true
    });
    setNewJobName('');
    setNewJobCode('');
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 mb-6 border-b border-gray-200 overflow-x-auto">
        <button onClick={() => setActiveSection('employees')} className={`py-2 px-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === 'employees' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Zaměstnanci</button>
        <button onClick={() => setActiveSection('jobs')} className={`py-2 px-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === 'jobs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Zakázky</button>
        <button onClick={() => setActiveSection('closings')} className={`py-2 px-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === 'closings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Uzávěrky</button>
        <button onClick={() => setActiveSection('announcements')} className={`py-2 px-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === 'announcements' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Oznámení</button>
        <button onClick={() => setActiveSection('presentation')} className={`py-2 px-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === 'presentation' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Prezentace</button>
      </div>

      {activeSection === 'employees' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
                {editingEmployeeId ? 'Upravit zaměstnance' : 'Přidat zaměstnance'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jméno a Příjmení</label>
                <input type="text" value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="např. Petr Novák" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={newEmpEmail} onChange={(e) => setNewEmpEmail(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="petr@firma.cz" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={newEmpRole} onChange={(e) => setNewEmpRole(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-lg">
                  <option value="Zaměstnanec">Zaměstnanec</option>
                  <option value="Manager">Manažer</option>
                </select>
              </div>
              
              <div className="flex gap-2 pt-2">
                {editingEmployeeId && (
                    <button onClick={cancelEditingEmployee} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">
                        Zrušit
                    </button>
                )}
                <button 
                    onClick={handleSaveEmployee} 
                    disabled={!newEmpName || !newEmpEmail} 
                    className={`flex-1 text-white py-2 rounded-lg transition-colors disabled:bg-gray-300 ${
                        editingEmployeeId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                >
                    {editingEmployeeId ? 'Uložit změny' : 'Přidat uživatele'}
                </button>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="text-lg font-semibold mb-4 text-gray-800">Aktivní zaměstnanci</h3>
             <div className="space-y-3 max-h-[400px] overflow-y-auto mb-6">
                {activeEmployees.map(emp => (
                  <div key={emp.id} className={`flex items-center justify-between p-3 border rounded-lg ${editingEmployeeId === emp.id ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                       <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full" />
                       <div>
                         <div className="text-sm font-medium">{emp.name}</div>
                         <div className="text-xs text-gray-500">{emp.email} ({emp.role})</div>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => startEditingEmployee(emp)} className="text-gray-400 hover:text-indigo-600 p-1" title="Upravit">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                           </svg>
                        </button>
                        <button onClick={() => onToggleEmployeeStatus(emp.id, false)} className="text-gray-400 hover:text-orange-500 p-1" title="Archivovat">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        </button>
                    </div>
                  </div>
                ))}
             </div>

             {archivedEmployees.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold mb-2 text-gray-500 border-t pt-4">Archiv (Neaktivní)</h3>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto opacity-70">
                    {archivedEmployees.map(emp => (
                      <div key={emp.id} className="flex items-center justify-between p-3 border border-gray-200 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 grayscale">
                           <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full" />
                           <div className="text-sm font-medium text-gray-600">{emp.name}</div>
                        </div>
                        <button onClick={() => onToggleEmployeeStatus(emp.id, true)} className="text-green-600 hover:text-green-800 text-sm font-medium">
                           Obnovit
                        </button>
                      </div>
                    ))}
                  </div>
                </>
             )}
          </div>
        </div>
      )}

      {activeSection === 'jobs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Přidat zakázku</h3>
            <div className="space-y-3">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kód</label>
                <input type="text" value={newJobCode} onChange={(e) => setNewJobCode(e.target.value.toUpperCase())} className="w-full p-2 border border-gray-300 rounded-lg" />
               </div>
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Název</label>
                <input type="text" value={newJobName} onChange={(e) => setNewJobName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
               </div>
               <button onClick={handleAddJob} disabled={!newJobName || !newJobCode} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 mt-2">Vytvořit</button>
            </div>
          </div>
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="text-lg font-semibold mb-4 text-gray-800">Aktivní zakázky</h3>
             <div className="space-y-3 max-h-[400px] overflow-y-auto mb-6">
                {activeJobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                        <div className="font-medium">{job.name}</div>
                        <div className="text-xs text-gray-500">{job.code}</div>
                    </div>
                    <button onClick={() => onToggleJobStatus(job.id, false)} className="text-gray-400 hover:text-orange-500" title="Archivovat">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                       </svg>
                    </button>
                  </div>
                ))}
             </div>

             {archivedJobs.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold mb-2 text-gray-500 border-t pt-4">Archiv (Neaktivní)</h3>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto opacity-70">
                    {archivedJobs.map(job => (
                      <div key={job.id} className="flex items-center justify-between p-3 border border-gray-200 bg-gray-50 rounded-lg">
                        <div>
                            <div className="font-medium text-gray-600">{job.name}</div>
                            <div className="text-xs text-gray-400">{job.code}</div>
                        </div>
                        <button onClick={() => onToggleJobStatus(job.id, true)} className="text-green-600 hover:text-green-800 text-sm font-medium">
                           Obnovit
                        </button>
                      </div>
                    ))}
                  </div>
                </>
             )}
          </div>
        </div>
      )}

      {activeSection === 'closings' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Globální Uzávěrky (Mzdy)</h3>
              <div className="space-y-3">
                  {monthsList.map(item => {
                      const [y, m] = item.month.split('-');
                      const label = new Date(parseInt(y), parseInt(m)-1).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
                      const capLabel = label.charAt(0).toUpperCase() + label.slice(1);

                      return (
                          <div key={item.month} className={`flex justify-between items-center p-4 border rounded-lg ${item.isLocked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                              <div className="font-medium text-gray-800">{capLabel}</div>
                              <div className="flex items-center gap-3">
                                  <span className={`text-xs font-bold uppercase tracking-wider ${item.isLocked ? 'text-red-700' : 'text-green-700'}`}>
                                      {item.isLocked ? 'UZAVŘENO' : 'OTEVŘENO'}
                                  </span>
                                  <button
                                      onClick={() => handleToggleLock(item.month, item.isLocked)}
                                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${item.isLocked ? 'bg-red-600' : 'bg-gray-200'}`}
                                  >
                                      <span className="sr-only">Toggle lock</span>
                                      <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${item.isLocked ? 'translate-x-5' : 'translate-x-0'}`} />
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {activeSection === 'announcements' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Centrum zpráv</h3>
              <p className="text-sm text-gray-500 mb-4">
                  Odešlete zprávu, která se zobrazí pod ikonou zvonku 🔔.
              </p>
              
              <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Příjemce</label>
                    <div className="flex gap-2 mb-2">
                        <button 
                            onClick={() => setAnnouncementTarget('all')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${announcementTarget === 'all' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-300 text-gray-700'}`}
                        >
                            📢 Všem zaměstnancům
                        </button>
                        <button 
                            onClick={() => setAnnouncementTarget('single')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${announcementTarget === 'single' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-300 text-gray-700'}`}
                        >
                            👤 Konkrétní osobě
                        </button>
                    </div>

                    {announcementTarget === 'single' && (
                        <select 
                            value={selectedTargetUserId}
                            onChange={(e) => setSelectedTargetUserId(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50"
                        >
                            <option value="">-- Vyberte zaměstnance --</option>
                            {activeEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    )}
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Typ zprávy</label>
                      <select 
                        value={announcementType} 
                        onChange={(e) => setAnnouncementType(e.target.value as any)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      >
                          <option value="info">Informace (Modrá)</option>
                          <option value="warning">Upozornění (Oranžová)</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Text zprávy</label>
                      <textarea
                        value={announcementMsg}
                        onChange={(e) => setAnnouncementMsg(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg h-32"
                        placeholder={announcementTarget === 'all' ? "Např. Prosím o uzavření docházky do pátku..." : "Např. Prosím o opravu výkazu za minulý měsíc..."}
                      />
                  </div>
                  <button 
                    onClick={handleSendAnnouncement}
                    disabled={!announcementMsg}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 font-medium w-full sm:w-auto"
                  >
                      Odeslat zprávu
                  </button>
              </div>
          </div>
      )}

      {activeSection === 'presentation' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => onStartPresentation('manager')}
                className="bg-indigo-900 text-white p-8 rounded-xl shadow-lg cursor-pointer transform hover:scale-105 transition-all group relative overflow-hidden"
              >
                  <h3 className="text-2xl font-bold mb-2">Prezentace pro Vedení</h3>
                  <button className="bg-white text-indigo-900 px-6 py-2 rounded-full font-bold shadow-md">Spustit</button>
              </div>

              <div 
                onClick={() => onStartPresentation('employee')}
                className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-8 rounded-xl shadow-lg cursor-pointer transform hover:scale-105 transition-all group relative overflow-hidden"
              >
                  <h3 className="text-2xl font-bold mb-2">Školení Zaměstnanců</h3>
                  <button className="bg-white text-blue-600 px-6 py-2 rounded-full font-bold shadow-md">Spustit</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
