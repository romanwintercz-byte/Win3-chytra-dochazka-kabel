import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import SupabaseConfigModal from './components/SupabaseConfigModal';
import { TimeEntry, MonthStatus, TimesheetStatus, Employee, Job, Notification } from './types';
import { validateMonth } from './services/validationService';
import { isSupabaseConfigured, getConfigurationStatus } from './credentials';
import { MOCK_EMPLOYEES, MOCK_JOBS, MOCK_ENTRIES } from './services/mockData';
import * as db from './services/supabase';

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);
const APP_VERSION = "2.2.0";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'settings'>('overview');
  const [useDemoData, setUseDemoData] = useState(!isSupabaseConfigured());
  const [employees, setEmployees] = useState<Employee[]>(isSupabaseConfigured() ? [] : MOCK_EMPLOYEES);
  const [jobs, setJobs] = useState<Job[]>(isSupabaseConfigured() ? [] : MOCK_JOBS);
  const [entries, setEntries] = useState<TimeEntry[]>(isSupabaseConfigured() ? [] : MOCK_ENTRIES);
  const [monthStatuses, setMonthStatuses] = useState<MonthStatus[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  
  // Modály
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [reviewingUserId, setReviewingUserId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [editingEntries, setEditingEntries] = useState<TimeEntry[]>([]);

  // Načtení dat z databáze nebo lokálních dat pro Kabel
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      setUseDemoData(true);
      setIsConnected(false);
      const savedUserId = localStorage.getItem('kabel_last_user_id');
      const found = MOCK_EMPLOYEES.find(e => String(e.id) === String(savedUserId));
      setCurrentUserId(found ? String(found.id) : MOCK_EMPLOYEES[0].id);
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

        const savedUserId = localStorage.getItem('kabel_last_user_id');
        if (empData.length > 0) {
          const userExists = empData.find(e => String(e.id) === String(savedUserId));
          const newId = String(userExists ? savedUserId : empData[0].id);
          setCurrentUserId(newId);
        }
      } else {
        setIsConnected(false);
        setLoadError(`Spojení se Supabase Kabel: ${conn.message}`);
      }
    } catch (err: any) {
      setIsConnected(false);
      setLoadError(err.message || "Nepodařilo se načíst data z databáze Kabel.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem('kabel_last_user_id', currentUserId);
    }
  }, [currentUserId]);

  const activeEmployeeList = useMemo(() => {
    return (useDemoData ? MOCK_EMPLOYEES : employees).filter(e => e.isActive);
  }, [useDemoData, employees]);

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
        alert("Chyba při ukládání stavu v databázi: " + e.message);
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
    db.saveLocalTimeMeta(submittedEntries);

    if (!useDemoData) {
      try {
        if (targetDate) {
          await db.deleteTimeEntriesForDate(String(targetUserId), targetDate);
        }
        await db.addTimeEntriesBulk(submittedEntries);
      } catch (e: any) {
        alert(`Chyba při ukládání do databáze: ${e.message}`);
        return;
      }
    }

    setEntries(prev => {
      let filtered = prev;
      if (targetDate) {
        filtered = prev.filter(e => !(String(e.employeeId) === String(targetUserId) && e.date.split('T')[0] === targetDate.split('T')[0]));
      }
      return [...filtered, ...submittedEntries];
    });
    
    setEditingEntries([]);
  };

  const handleDeleteEntry = async (id: string) => {
    if (isLocked) return;
    if (!useDemoData) {
      try { 
        await db.deleteTimeEntry(id); 
      } catch (e: any) { 
        alert('Chyba při mazání: ' + e.message);
        return; 
      }
    }
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleEditEntry = (entry: TimeEntry) => {
    if (isLocked) return;
    const dayEntries = monthlyUserEntries.filter(e => e.date.split('T')[0] === entry.date.split('T')[0]);
    setEditingEntries(dayEntries);
    setIsEntryModalOpen(true);
  };

  const handleAddEmployee = async (emp: Employee) => {
    if (!useDemoData) {
      try { 
        await db.addEmployee(emp); 
      } catch (e: any) { 
        alert(e.message); 
        return; 
      }
    }
    setEmployees(prev => [...prev, emp]);
  };

  const handleUpdateEmployee = async (emp: Employee) => {
    if (!useDemoData) {
      try { 
        await db.updateEmployee(emp); 
      } catch (e: any) { 
        alert(e.message); 
        return; 
      }
    }
    setEmployees(prev => prev.map(e => String(e.id) === String(emp.id) ? emp : e));
  };

  const handleToggleEmployeeStatus = async (id: string, isActive: boolean) => {
    if (!useDemoData) {
      try { 
        await db.updateEmployeeStatus(id, isActive); 
      } catch (e: any) { 
        alert(e.message); 
        return; 
      }
    }
    setEmployees(prev => prev.map(e => String(e.id) === String(id) ? { ...e, isActive } : e));
  };

  const handleAddJob = async (job: Job) => {
    if (!useDemoData) {
      try { 
        await db.addJob(job); 
      } catch (e: any) { 
        alert(e.message); 
        return; 
      }
    }
    setJobs(prev => [...prev, job]);
  };

  const handleUpdateJob = async (job: Job) => {
    if (!useDemoData) {
      try { 
        await db.updateJob(job); 
      } catch (e: any) { 
        alert(e.message); 
        return; 
      }
    }
    setJobs(prev => prev.map(j => String(j.id) === String(job.id) ? job : j));
  };

  const handleToggleJobStatus = async (id: string, isActive: boolean) => {
    if (!useDemoData) {
      try { 
        await db.updateJobStatus(id, isActive); 
      } catch (e: any) { 
        alert(e.message); 
        return; 
      }
    }
    setJobs(prev => prev.map(j => String(j.id) === String(id) ? { ...j, isActive } : j));
  };

  const handleRequestSwitchUser = (id: string) => {
    const list = useDemoData ? MOCK_EMPLOYEES : employees;
    const targetEmp = list.find(e => String(e.id) === String(id));
    if (targetEmp?.pinCode) { 
      setPendingUserId(id); 
      setIsPinModalOpen(true); 
    } else {
      setCurrentUserId(id);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 print:block print:bg-white print:min-h-0 text-slate-800">
      {/* Postranní panel pro desktop */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        employees={activeEmployeeList}
        onRequestSwitchUser={handleRequestSwitchUser} 
        onShowAbout={() => setIsAboutOpen(true)}
        version={APP_VERSION}
        isConnected={isConnected}
        onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)}
      />

      <main className={`flex-1 overflow-y-auto print:overflow-visible print:block print:h-auto pb-16 md:pb-0 print:pb-0 print:p-0 print:m-0 ${activeTab !== 'report' ? 'print:hidden' : ''}`}>
        {/* Mobilní hlavička */}
        <div className="md:hidden bg-slate-900 text-white p-3.5 sticky top-0 z-30 flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-2.5">
            <button 
              type="button"
              onClick={() => setIsAboutOpen(true)} 
              className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm"
            >
              K
            </button>
            <div className="flex flex-col">
              <h1 className="font-black text-white text-sm leading-tight">Kabel</h1>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium">v{APP_VERSION}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-[9px] text-slate-400">{isConnected ? 'Online' : 'Demo'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <NotificationBell 
              notifications={notifications} 
              onMarkAsRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))}
              onMarkAllAsRead={() => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}
            />

            {/* Profil na mobilu s přepínačem */}
            <div className="relative active:scale-95 transition-transform cursor-pointer">
              <img 
                src={currentUser.avatar} 
                className="w-9 h-9 rounded-full border-2 border-indigo-500 bg-slate-800 object-cover shadow-xs" 
                alt={currentUser.name} 
              />
              <select 
                value={currentUser.id} 
                onChange={(e) => handleRequestSwitchUser(e.target.value)} 
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer appearance-none"
              >
                {activeEmployeeList.map(e => (
                  <option key={e.id} value={e.id}>{e.name} {e.pinCode ? '🔒' : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Informační proužek o Demo režimu pro firmu Kabel */}
        {!isConnected && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-sm">ℹ️</span>
              <span><strong>Aplikace Kabel běží v lokálním / ukázkovém režimu.</strong> Původní projekt K+P byl odpojen.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSupabaseModalOpen(true)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs"
            >
              Připojit novou Supabase pro Kabel
            </button>
          </div>
        )}

        {/* Indikace načítání */}
        {isLoading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[90] flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="font-bold text-slate-800 text-sm">Načítám data z databáze Kabel...</p>
            </div>
          </div>
        )}

        {/* Chybový proužek */}
        {loadError && (
          <div className="bg-rose-50 text-rose-700 p-4 border-b border-rose-200 flex justify-between items-center text-xs font-semibold print:hidden">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{loadError}</span>
            </div>
            <button 
              type="button"
              onClick={() => loadData()} 
              className="underline font-bold hover:text-rose-900 ml-4"
            >
              Zkusit znovu
            </button>
          </div>
        )}

        {/* Kontrola docházky manažerem (banner) */}
        {reviewingUserId && (
          <div className="bg-indigo-600 text-white px-6 py-3.5 sticky top-0 z-40 flex justify-between items-center shadow-md print:hidden">
            <div className="font-bold text-sm flex items-center gap-2">
              <span className="bg-white/20 p-1 rounded-lg">👁️</span> 
              <span>Režim kontroly docházky: <strong>{targetUser.name}</strong></span>
            </div>
            <button 
              type="button"
              onClick={() => setReviewingUserId(null)} 
              className="bg-white hover:bg-slate-100 text-indigo-700 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
            >
              Ukončit kontrolu
            </button>
          </div>
        )}

        {/* ZÁLOŽKA 1: PŘEHLED DOCHÁZKY */}
        {activeTab === 'overview' && (
          <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Přehled docházky</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Firma Kabel • Profil: <strong className="text-slate-800">{targetUser.name}</strong>
                </p>
              </div>
              <MonthNavigator selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
            </div>

            {/* Schvalovací proces */}
            <ApprovalWorkflow 
              status={currentMonthStatus} 
              onUpdateStatus={handleUpdateStatus} 
              isManagerMode={isManagerMode} 
              isReviewing={!!reviewingUserId}
            />
            
            {/* Týmový přehled pro manažera (Lucie) */}
            {isManagerMode && !reviewingUserId && (
              <TeamOverview 
                employees={employees.length > 0 ? employees : MOCK_EMPLOYEES} 
                allEntries={entries} 
                selectedMonth={selectedMonth} 
                onInspect={setReviewingUserId} 
                currentUserRole={currentUser.role}
                statuses={monthStatuses}
              />
            )}

            {/* Rychlé akce / Odemčený zápis */}
            {!isLocked ? (
              <SmartInput 
                onEntriesAdded={(newE) => {
                  if (!useDemoData) db.addTimeEntriesBulk(newE);
                  setEntries(prev => [...prev, ...newE]);
                }} 
                currentUserId={String(targetUserId)} 
                onManualEntry={() => {
                  setEditingEntries([]); 
                  setIsEntryModalOpen(true);
                }} 
                existingEntries={entries.filter(e => String(e.employeeId) === String(targetUserId))}
                targetUser={targetUser}
                jobs={jobs}
              />
            ) : (
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-center gap-4 shadow-2xs">
                <div className="text-3xl">🔒</div>
                <div>
                  <h3 className="font-extrabold text-amber-900 text-sm">Měsíční docházka je uzamčena</h3>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Záznamy jsou ve stavu <strong>{currentMonthStatus.status}</strong>. Pro změny po uzavření kontaktujte mzdovou účetní Lucii.
                  </p>
                </div>
              </div>
            )}
            
            {/* Statistiky a validace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Dashboard entries={monthlyUserEntries} selectedMonth={selectedMonth} />
              </div>
              <div>
                <ValidationStatus issues={validationIssues} />
              </div>
            </div>

            {/* Seznam zapsaných směn */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Výkaz směn:</span>
                  <span className="text-indigo-600">{targetUser.name}</span>
                  {isLocked && (
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md uppercase font-black">
                      Pouze pro čtení
                    </span>
                  )}
                </h3>
              </div>

              <TimesheetTable 
                entries={monthlyUserEntries} 
                onDelete={handleDeleteEntry} 
                onEdit={handleEditEntry} 
                isLocked={isLocked}
                jobs={jobs}
              />
            </div>
          </div>
        )}

        {/* ZÁLOŽKA 2: MZDOVÉ REPORTY A4 */}
        {activeTab === 'report' && (
          <div className="p-4 md:p-8 print:p-0 print:m-0">
            <ReportingModule 
              entries={entries} 
              employees={useDemoData ? MOCK_EMPLOYEES : employees} 
              currentUserRole={currentUser.role} 
              jobs={jobs} 
              selectedEmployeeId={String(targetUserId)} 
              selectedMonth={selectedMonth} 
              monthStatus={currentMonthStatus}
            />
          </div>
        )}

        {/* ZÁLOŽKA 3: SPRÁVA A NASTAVENÍ (PRO MANAŽERY) */}
        {activeTab === 'settings' && isManagerMode && (
          <div className="p-4 md:p-8">
            <AdminPanel 
              employees={employees.length > 0 ? employees : MOCK_EMPLOYEES} 
              jobs={jobs.length > 0 ? jobs : MOCK_JOBS} 
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onToggleEmployeeStatus={handleToggleEmployeeStatus}
              onAddJob={handleAddJob}
              onUpdateJob={handleUpdateJob}
              onToggleJobStatus={handleToggleJobStatus}
              onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Komplexní denní modál (Multi-line entry) */}
      <EntryFormModal 
        isOpen={isEntryModalOpen} 
        onClose={() => {
          setIsEntryModalOpen(false); 
          setEditingEntries([]);
        }} 
        onSubmit={handleModalSubmit} 
        currentUserId={String(targetUserId)} 
        jobs={jobs} 
        initialEntries={editingEntries} 
        targetUser={targetUser}
      />
      
      {/* PIN Modál */}
      <PinPadModal 
        isOpen={isPinModalOpen} 
        onClose={() => setIsPinModalOpen(false)} 
        onSuccess={() => {
          if (pendingUserId) {
            setCurrentUserId(pendingUserId);
          }
          setIsPinModalOpen(false);
        }} 
        targetPin={(employees.find(e => String(e.id) === String(pendingUserId)) || MOCK_EMPLOYEES.find(e => String(e.id) === String(pendingUserId)))?.pinCode || ""} 
        targetUserName={(employees.find(e => String(e.id) === String(pendingUserId)) || MOCK_EMPLOYEES.find(e => String(e.id) === String(pendingUserId)))?.name || ""} 
      />
      
      {/* Konfigurační dialog pro novou Supabase Kabel */}
      <SupabaseConfigModal 
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigSaved={() => {
          loadData();
        }}
      />

      {/* Systém nápovědy a O aplikaci */}
      <HelpSystem />
      <AboutModal 
        isOpen={isAboutOpen} 
        onClose={() => setIsAboutOpen(false)} 
        version={APP_VERSION} 
        onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)}
      />
      
      {/* Spodní navigace pro mobily */}
      <MobileNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUserRole={currentUser.role} 
      />
    </div>
  );
};

export default App;
