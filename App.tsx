
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import SmartInput from './components/SmartInput';
import TimesheetTable from './components/TimesheetTable';
import Dashboard from './components/Dashboard';
import ReportingModule from './components/ReportingModule';
import ApprovalWorkflow from './components/ApprovalWorkflow';
import AdminPanel from './components/AdminPanel';
import MobileNavigation from './components/MobileNavigation';
import EntryFormModal from './components/EntryFormModal';
import ValidationStatus from './components/ValidationStatus';
import TeamOverview from './components/TeamOverview';
import HelpSystem from './components/HelpSystem';
import AboutModal from './components/AboutModal';
import NotificationBell from './components/NotificationBell';
import PinPadModal from './components/PinPadModal'; 
import MonthNavigator from './components/MonthNavigator';
import { TimeEntry, MonthStatus, TimesheetStatus, Employee, Job } from './types';
import { validateMonth } from './services/validationService';
import { isSupabaseConfigured } from './credentials';
import { MOCK_EMPLOYEES, MOCK_JOBS, MOCK_ENTRIES } from './services/mockData';
import * as db from './services/supabase';

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'settings'>('overview');
  const [useDemoData, setUseDemoData] = useState(!isSupabaseConfigured());
  const [employees, setEmployees] = useState<Employee[]>(isSupabaseConfigured() ? [] : MOCK_EMPLOYEES);
  const [jobs, setJobs] = useState<Job[]>(isSupabaseConfigured() ? [] : MOCK_JOBS);
  const [entries, setEntries] = useState<TimeEntry[]>(isSupabaseConfigured() ? [] : MOCK_ENTRIES);
  const [monthStatuses, setMonthStatuses] = useState<MonthStatus[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [reviewingUserId, setReviewingUserId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [editingEntries, setEditingEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);

      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        if (!currentUserId && MOCK_EMPLOYEES.length > 0) setCurrentUserId(MOCK_EMPLOYEES[0].id);
        return;
      }

      try {
        const conn = await db.checkConnection();
        if (conn.success) {
          setUseDemoData(false);
          setIsConnected(true);
          
          const [empData, jobsData, entriesData, statusesData] = await Promise.all([
            db.fetchEmployees(),
            db.fetchJobs(),
            db.fetchTimeEntries(undefined, selectedMonth),
            db.fetchMonthlyReports(selectedMonth)
          ]);
          
          setEmployees(empData);
          setJobs(jobsData);
          setEntries(entriesData);
          setMonthStatuses(statusesData);

          const savedUserId = localStorage.getItem('lastUserId');
          if (empData.length > 0) {
            const userExists = empData.find(e => String(e.id) === String(savedUserId));
            const newId = String(userExists ? savedUserId : empData[0].id);
            if (currentUserId !== newId) setCurrentUserId(newId);
          }
        } else {
          setLoadError(`Spojení s DB: ${conn.message}`);
        }
      } catch (err: any) {
        setLoadError(err.message || "Nepodařilo se synchronizovat data.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedMonth]);

  useEffect(() => {
    if (currentUserId) localStorage.setItem('lastUserId', currentUserId);
  }, [currentUserId]);

  const currentUser = useMemo(() => {
    const list = useDemoData ? MOCK_EMPLOYEES : employees;
    const found = list.find(e => String(e.id) === String(currentUserId));
    return found || list[0] || MOCK_EMPLOYEES[0];
  }, [useDemoData, employees, currentUserId]);

  const targetUserId = reviewingUserId || currentUserId;
  const targetUser = useMemo(() => {
    const list = useDemoData ? MOCK_EMPLOYEES : employees;
    return list.find(e => String(e.id) === String(targetUserId)) || currentUser;
  }, [useDemoData, employees, targetUserId, currentUser]);

  const isManagerMode = currentUser.role === 'Manager';

  const currentMonthStatus = useMemo(() => {
    const status = monthStatuses.find(s => String(s.employeeId) === String(targetUserId) && s.month === selectedMonth);
    return status || { employeeId: targetUserId, month: selectedMonth, status: TimesheetStatus.DRAFT };
  }, [monthStatuses, targetUserId, selectedMonth]);

  const isLocked = useMemo(() => {
    const isSubmittedOrApproved = currentMonthStatus.status === TimesheetStatus.SUBMITTED || 
                                currentMonthStatus.status === TimesheetStatus.APPROVED;
    if (isManagerMode && reviewingUserId) return false; 
    return isSubmittedOrApproved;
  }, [currentMonthStatus, isManagerMode, reviewingUserId]);

  const monthlyUserEntries = useMemo(() => {
    return entries.filter(e => String(e.employeeId) === String(targetUserId) && e.date.startsWith(selectedMonth));
  }, [entries, targetUserId, selectedMonth]);

  const validationIssues = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    return validateMonth(monthlyUserEntries, year, month);
  }, [monthlyUserEntries, selectedMonth]);

  const handleUpdateStatus = async (newStatus: TimesheetStatus, comment?: string) => {
    const updatedStatus: MonthStatus = {
      ...currentMonthStatus,
      status: newStatus,
      managerComment: comment,
      submittedAt: newStatus === TimesheetStatus.SUBMITTED ? new Date().toISOString() : currentMonthStatus.submittedAt,
      approvedAt: newStatus === TimesheetStatus.APPROVED ? new Date().toISOString() : currentMonthStatus.approvedAt,
    };

    if (!useDemoData) {
      try {
        await db.upsertMonthlyReport(updatedStatus);
      } catch (e: any) {
        alert("Chyba při ukládání stavu: " + e.message);
        return;
      }
    }

    setMonthStatuses(prev => [
      ...prev.filter(s => !(String(s.employeeId) === String(targetUserId) && s.month === selectedMonth)),
      updatedStatus
    ]);
    
    if (newStatus === TimesheetStatus.APPROVED || newStatus === TimesheetStatus.REJECTED) {
      setReviewingUserId(null);
    }
  };

  const handleModalSubmit = async (date: string, submittedEntries: TimeEntry[]) => {
      if (isLocked) return;
      
      const targetDate = date === 'BULK_RANGE' ? null : date;

      if (!useDemoData) {
        try {
          if (targetDate) {
            // Při editaci dne nejdříve vymažeme vše pro daný den a uživatele
            await db.deleteTimeEntriesForDate(String(targetUserId), targetDate);
          }
          await db.addTimeEntriesBulk(submittedEntries);
        } catch (e: any) {
          alert(`Chyba DB: ${e.message}`);
          return;
        }
      }

      setEntries(prev => {
        let filtered = prev;
        if (targetDate) {
          // Lokální promazání starých záznamů dne
          filtered = prev.filter(e => !(String(e.employeeId) === String(targetUserId) && e.date.split('T')[0] === targetDate.split('T')[0]));
        }
        return [...filtered, ...submittedEntries];
      });
      
      setEditingEntries([]);
  };

  const handleDeleteEntry = async (id: string) => {
    if (isLocked) return;
    if (!useDemoData) {
      try { await db.deleteTimeEntry(id); } catch (e) { return; }
    }
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleEditEntry = (entry: TimeEntry) => {
    if (isLocked) return;
    // Najdeme všechny záznamy pro daný den, abychom je v modalitě mohli editovat najednou
    const dayEntries = monthlyUserEntries.filter(e => e.date.split('T')[0] === entry.date.split('T')[0]);
    setEditingEntries(dayEntries);
    setIsEntryModalOpen(true);
  };

  const handleAddEmployee = async (emp: Employee) => {
    if (!useDemoData) {
      try { await db.addEmployee(emp); } catch (e: any) { alert(e.message); return; }
    }
    setEmployees(prev => [...prev, emp]);
  };

  const handleUpdateEmployee = async (emp: Employee) => {
    if (!useDemoData) {
      try { await db.updateEmployee(emp); } catch (e: any) { alert(e.message); return; }
    }
    setEmployees(prev => prev.map(e => String(e.id) === String(emp.id) ? emp : e));
  };

  const handleToggleEmployeeStatus = async (id: string, isActive: boolean) => {
    if (!useDemoData) {
      try { await db.updateEmployeeStatus(id, isActive); } catch (e: any) { alert(e.message); return; }
    }
    setEmployees(prev => prev.map(e => String(e.id) === String(id) ? { ...e, isActive } : e));
  };

  const handleAddJob = async (job: Job) => {
    if (!useDemoData) {
      try { await db.addJob(job); } catch (e: any) { alert(e.message); return; }
    }
    setJobs(prev => [...prev, job]);
  };

  const handleUpdateJob = async (job: Job) => {
    if (!useDemoData) {
      try { await db.updateJob(job); } catch (e: any) { alert(e.message); return; }
    }
    setJobs(prev => prev.map(j => String(j.id) === String(job.id) ? job : j));
  };

  const handleToggleJobStatus = async (id: string, isActive: boolean) => {
    if (!useDemoData) {
      try { await db.updateJobStatus(id, isActive); } catch (e: any) { alert(e.message); return; }
    }
    setJobs(prev => prev.map(j => String(j.id) === String(id) ? { ...j, isActive } : j));
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 print:block print:bg-white print:min-h-0">
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        employees={(useDemoData ? MOCK_EMPLOYEES : employees).filter(e => e.isActive)}
        onRequestSwitchUser={(id) => {
            const list = useDemoData ? MOCK_EMPLOYEES : employees;
            const targetEmp = list.find(e => String(e.id) === String(id));
            if (targetEmp?.pinCode) { 
                setPendingUserId(id); 
                setIsPinModalOpen(true); 
            } else {
                setCurrentUserId(id);
            }
        }} 
        onShowAbout={() => setIsAboutOpen(true)}
        version="2.1.0"
        isConnected={isConnected}
      />

      <main className={`flex-1 overflow-y-auto print:overflow-visible print:block print:h-auto pb-16 md:pb-0 print:pb-0 print:p-0 print:m-0 ${activeTab !== 'report' ? 'print:hidden' : ''}`}>
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-3 sticky top-0 z-30 flex items-center justify-between shadow-sm print:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsAboutOpen(true)} className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-sm">W</button>
            <div className="flex flex-col">
              <h1 className="font-bold text-slate-800 text-sm leading-tight">K+P</h1>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500">v2.1.0</span>
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-500'}`}></div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group active:scale-95 transition-transform">
              <img src={currentUser.avatar} className="w-9 h-9 rounded-full border-2 border-indigo-500 shadow-lg object-cover" alt="User" />
              <select 
                value={currentUser.id} 
                onChange={(e) => {
                  const id = e.target.value;
                  const list = useDemoData ? MOCK_EMPLOYEES : employees;
                  const targetEmp = list.find(emp => String(emp.id) === String(id));
                  if (targetEmp?.pinCode) { 
                      setPendingUserId(id); 
                      setIsPinModalOpen(true); 
                  } else {
                      setCurrentUserId(id);
                  }
                }} 
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer appearance-none"
              >
                {(useDemoData ? MOCK_EMPLOYEES : employees).filter(e => e.isActive).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        {isLoading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[90] flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bold text-slate-700">Synchronizace...</p>
            </div>
          </div>
        )}

        {loadError && (
          <div className="bg-red-50 text-red-600 p-4 border-b border-red-100 flex justify-between items-center text-sm font-medium">
            <span>⚠️ {loadError}</span>
            <button onClick={() => window.location.reload()} className="underline font-bold">Zkusit znovu</button>
          </div>
        )}

        {reviewingUserId && (
          <div className="bg-indigo-600 text-white px-6 py-3 sticky top-0 z-40 flex justify-between items-center shadow-md print:hidden">
             <div className="font-bold text-sm flex items-center gap-2">
                <span className="bg-white/20 p-1 rounded">👁️</span> 
                Kontrola docházky: {targetUser.name}
             </div>
             <button onClick={() => setReviewingUserId(null)} className="bg-white text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm">UKONČIT KONTROLU</button>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="p-4 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Přehled docházky</h2>
              <MonthNavigator selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
            </div>

            <ApprovalWorkflow 
              status={currentMonthStatus} 
              onUpdateStatus={handleUpdateStatus} 
              isManagerMode={isManagerMode} 
              isReviewing={!!reviewingUserId}
            />
            
            {isManagerMode && !reviewingUserId && employees.length > 0 && (
                <TeamOverview 
                  employees={employees.filter(e => e.isActive)} 
                  allEntries={entries} 
                  selectedMonth={selectedMonth} 
                  onInspect={setReviewingUserId} 
                  currentUserRole={currentUser.role}
                  statuses={monthStatuses}
                />
            )}

            {!isLocked ? (
              <SmartInput 
                onEntriesAdded={(newE) => {
                  if (!useDemoData) db.addTimeEntriesBulk(newE);
                  setEntries(prev => [...prev, ...newE]);
                }} 
                currentUserId={String(targetUserId)} 
                onManualEntry={() => {setEditingEntries([]); setIsEntryModalOpen(true);}} 
                existingEntries={entries.filter(e => String(e.employeeId) === String(targetUserId))}
                targetUser={targetUser}
                jobs={jobs}
              />
            ) : (
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl mb-6 flex items-center gap-4">
                <div className="text-2xl">🔒</div>
                <div>
                  <h3 className="font-bold text-amber-900">Docházka je uzamčena</h3>
                  <p className="text-sm text-amber-700">Záznamy jsou ve stavu {currentMonthStatus.status}. Pro změny kontaktujte Lucii.</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2"><Dashboard entries={monthlyUserEntries} selectedMonth={selectedMonth} /></div>
                <div><ValidationStatus issues={validationIssues} /></div>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              Výkaz: {targetUser.name}
              {isLocked && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase font-bold">Jen pro čtení</span>}
            </h3>
            <TimesheetTable 
              entries={monthlyUserEntries} 
              onDelete={handleDeleteEntry} 
              onEdit={handleEditEntry} 
              isLocked={isLocked}
              jobs={jobs}
            />
          </div>
        )}

        {activeTab === 'report' && (
           <div className="p-4 md:p-8 print:p-0 print:m-0">
              <ReportingModule 
                entries={entries} 
                employees={employees} 
                currentUserRole={currentUser.role} 
                jobs={jobs} 
                selectedEmployeeId={String(targetUserId)} 
                selectedMonth={selectedMonth} 
                monthStatus={currentMonthStatus}
              />
           </div>
        )}

        {activeTab === 'settings' && isManagerMode && (
           <div className="p-4 md:p-8">
             <AdminPanel 
               employees={employees} 
               jobs={jobs} 
               onAddEmployee={handleAddEmployee}
               onUpdateEmployee={handleUpdateEmployee}
               onToggleEmployeeStatus={handleToggleEmployeeStatus}
               onAddJob={handleAddJob}
               onUpdateJob={handleUpdateJob}
               onToggleJobStatus={handleToggleJobStatus}
             />
           </div>
        )}
      </main>

      <EntryFormModal 
        isOpen={isEntryModalOpen} 
        onClose={() => {setIsEntryModalOpen(false); setEditingEntries([]);}} 
        onSubmit={handleModalSubmit} 
        currentUserId={String(targetUserId)} 
        jobs={jobs} 
        initialEntries={editingEntries} 
        targetUser={targetUser}
      />
      
      <PinPadModal 
        isOpen={isPinModalOpen} 
        onClose={() => setIsPinModalOpen(false)} 
        onSuccess={() => {setCurrentUserId(pendingUserId!); setIsPinModalOpen(false);}} 
        targetPin={(employees.find(e=>String(e.id)===String(pendingUserId)) || MOCK_EMPLOYEES.find(e=>String(e.id)===String(pendingUserId)))?.pinCode || ""} 
        targetUserName={(employees.find(e=>String(e.id)===String(pendingUserId)) || MOCK_EMPLOYEES.find(e=>String(e.id)===String(pendingUserId)))?.name || ""} 
      />
      
      <HelpSystem />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} version="2.1.0" />
      <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} currentUserRole={currentUser.role} />
    </div>
  );
};

export default App;
