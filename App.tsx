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
import PresentationMode, { PresentationType } from './components/PresentationMode';
import NotificationBell from './components/NotificationBell';
import PinPadModal from './components/PinPadModal'; 
import UpdatePrompt from './components/UpdatePrompt';
import MonthNavigator from './components/MonthNavigator';
import { TimeEntry, MonthStatus, TimesheetStatus, Employee, Job, Notification } from './types';
import { validateMonth } from './services/validationService';
import { v4 as uuidv4 } from 'uuid';
import { isSupabaseConfigured } from './credentials';
import { MOCK_EMPLOYEES, MOCK_JOBS, MOCK_ENTRIES } from './services/mockData';
import { 
    fetchEmployees, addEmployee, updateEmployee, updateEmployeeStatus, 
    fetchJobs, addJob, updateJobStatus,
    fetchTimeEntries, addTimeEntriesBulk, deleteTimeEntriesForDate, deleteTimeEntry,
    fetchMonthlyReports, upsertMonthlyReport,
    fetchGlobalLock,
    fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, createNotification,
    subscribeToPresence, subscribeToNotifications
} from './services/supabase';

// Bezpečná funkce pro získání lokálního YYYY-MM bez UTC posunu
const getLocalMonthStr = (date: Date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const initialMonthStatus: MonthStatus = {
  month: getLocalMonthStr(),
  status: TimesheetStatus.DRAFT,
};

const VERSION = '1.9.24';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'settings'>('overview');
  const [useDemoData, setUseDemoData] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ok: boolean, msg?: string}>({ ok: true });
  
  const [monthlyReports, setMonthlyReports] = useState<MonthStatus[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [reviewingUserId, setReviewingUserId] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState<PresentationType | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const currentUser = employees.find(e => e.id === currentUserId) || employees[0] || {
      id: 'temp', name: 'Načítání...', role: 'Zaměstnanec', email: '', avatar: '', isActive: true
  } as Employee;

  const targetUserId = reviewingUserId || currentUserId;
  const targetUser = employees.find(e => e.id === targetUserId) || currentUser;

  const [selectedMonth, setSelectedMonth] = useState<string>(getLocalMonthStr());
  const [isGlobalLocked, setIsGlobalLocked] = useState(false);
  const [monthStatus, setMonthStatus] = useState<MonthStatus>(initialMonthStatus);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isManagerMode, setIsManagerMode] = useState(false);

  const isStatusLocked = useMemo(() => {
    return monthStatus.status === TimesheetStatus.SUBMITTED || monthStatus.status === TimesheetStatus.APPROVED;
  }, [monthStatus.status]);

  const canEdit = useMemo(() => {
    if (isGlobalLocked) return false; 
    return !isStatusLocked || isManagerMode;
  }, [isStatusLocked, isManagerMode, isGlobalLocked]);

  const activeEmployees = useMemo(() => {
      return employees.filter(e => e.isActive);
  }, [employees]);

  const activeJobs = useMemo(() => jobs.filter(j => j.isActive), [jobs]);

  const loadData = async (forceDemo: boolean = false) => {
      setIsLoading(true);
      setIsCloudSyncing(true);
      setError(null);

      const configured = isSupabaseConfigured();
      
      if (forceDemo || !configured) {
          setEmployees(MOCK_EMPLOYEES);
          setJobs(MOCK_JOBS);
          setEntries(MOCK_ENTRIES);
          setUseDemoData(true);
          const savedId = localStorage.getItem('smartwork_current_user_id');
          if (savedId && MOCK_EMPLOYEES.some(e => e.id === savedId)) setCurrentUserId(savedId);
          else setCurrentUserId(MOCK_EMPLOYEES[1].id);
          setIsLoading(false);
          setIsCloudSyncing(false);
          setDbStatus({ ok: false, msg: 'Konfigurace chybí - DEMO' });
          return;
      }

      try {
          const [emps, jbs, entrs] = await Promise.all([
              fetchEmployees(),
              fetchJobs(),
              fetchTimeEntries()
          ]);
          
          setEmployees(emps);
          setJobs(jbs);
          setEntries(entrs);
          setUseDemoData(false);
          setDbStatus({ ok: true });

          const savedId = localStorage.getItem('smartwork_current_user_id');
          if (savedId && emps?.some(e => e.id === savedId && e.isActive !== false)) {
              setCurrentUserId(savedId);
          } else if (emps?.[0]) {
              setCurrentUserId(emps[0].id);
          }
      } catch (err: any) {
          console.error("Chyba databáze:", err);
          const errorMsg = err.message || 'Neznámá chyba';
          setError(`CHYBA DATABÁZE (Status: ${err.status || '?'})`);
          setDbStatus({ ok: false, msg: errorMsg });
          
          // Pokud Supabase vrátí 406, je projekt pravděpodobně "Paused"
          if (err.status === 406) {
              alert("POZOR: Vaše databáze Supabase je pravděpodobně pozastavena. Přihlaste se do Supabase Dashboardu a obnovte ji (Restore project).");
          }

          if (employees.length === 0) setUseDemoData(true);
      } finally {
          setIsLoading(false);
          setIsCloudSyncing(false);
      }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => { setReviewingUserId(null); }, [currentUserId]);

  useEffect(() => {
      if (currentUserId && !useDemoData) {
          const presenceChannel = subscribeToPresence(currentUserId, (ids) => setOnlineUserIds(new Set(ids)));
          const notificationChannel = subscribeToNotifications(currentUserId, (newNote) => setNotifications(prev => [newNote, ...prev]));
          const loadNotifications = async () => {
              try {
                  const notifs = await fetchNotifications(currentUserId);
                  setNotifications(notifs);
              } catch (e) {}
          };
          loadNotifications();
          return () => {
              presenceChannel.unsubscribe();
              notificationChannel.unsubscribe();
          };
      }
  }, [currentUserId, useDemoData]);

  useEffect(() => {
    if (!useDemoData && currentUserId) {
        const loadReportsAndLocks = async () => {
            try {
                const reports = await fetchMonthlyReports(selectedMonth);
                setMonthlyReports(reports);
                const globalLock = await fetchGlobalLock(selectedMonth);
                setIsGlobalLocked(globalLock);
            } catch (e) {}
        };
        loadReportsAndLocks();
    }
  }, [selectedMonth, useDemoData, currentUserId]);

  useEffect(() => {
      const userReport = monthlyReports.find(r => r.employeeId === targetUserId);
      setMonthStatus(userReport || { month: selectedMonth, status: TimesheetStatus.DRAFT, employeeId: targetUserId });
  }, [targetUserId, selectedMonth, monthlyReports]);

  useEffect(() => {
    if (currentUserId) localStorage.setItem('smartwork_current_user_id', currentUserId);
  }, [currentUserId]);

  const allUserEntries = useMemo(() => entries.filter(e => e.employeeId === targetUserId), [entries, targetUserId]);
  
  // FIX: Robustnější filtr měsíce
  const monthlyUserEntries = useMemo(() => {
      if (!selectedMonth) return [];
      return allUserEntries.filter(e => e.date && e.date.startsWith(selectedMonth));
  }, [allUserEntries, selectedMonth]);
  
  const entriesForEditingDate = useMemo(() => editingDate ? allUserEntries.filter(e => e.date === editingDate) : [], [allUserEntries, editingDate]);
  
  const lastActiveDay = useMemo(() => {
    if (allUserEntries.length === 0) return undefined;
    const sorted = [...allUserEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0].date;
  }, [allUserEntries]);

  const validationIssues = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-');
    return validateMonth(monthlyUserEntries, year, month);
  }, [monthlyUserEntries, selectedMonth]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => { setIsManagerMode(currentUser.role === 'Manager'); }, [currentUser]);

  const handleRequestSwitchUser = (targetId: string) => {
      const targetEmp = employees.find(e => e.id === targetId);
      if (targetEmp?.pinCode) { setPendingUserId(targetId); setIsPinModalOpen(true); }
      else setCurrentUserId(targetId);
  };

  const handlePinSuccess = () => {
      if (pendingUserId) setCurrentUserId(pendingUserId);
      setIsPinModalOpen(false); setPendingUserId(null);
  };

  const handleInstallClick = () => { if (installPrompt) { installPrompt.prompt(); setInstallPrompt(null); } };

  const handleAddEntries = async (newEntries: TimeEntry[]) => {
    if (!canEdit) return alert("Měsíc je uzamčen.");
    if (useDemoData) { 
        setEntries(prev => [...prev, ...newEntries]); 
        return; 
    }
    try { 
        setIsCloudSyncing(true);
        await addTimeEntriesBulk(newEntries); 
        await loadData(); 
    } catch (e: any) { 
        console.error("Zápis selhal:", e);
        alert(`CHYBA PŘI ZÁPISU: ${e.message}. (Status: ${e.status})`); 
    } finally {
        setIsCloudSyncing(false);
    }
  };

  const handleCopyLastDay = async () => {
    if (!canEdit || !lastActiveDay) return;
    const entriesToCopy = allUserEntries.filter(e => e.date === lastActiveDay);
    if (entriesToCopy.length === 0) return;
    
    // Lokální dnešek
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    const newEntries = entriesToCopy.map(e => ({
        id: uuidv4(), employeeId: targetUserId, date: today, project: e.project, description: e.description, hours: e.hours, type: e.type
    }));
    await handleAddEntries(newEntries);
  };

  const handleModalSubmit = async (date: string, submittedEntries: TimeEntry[]) => {
    if (!canEdit) return alert("Měsíc je uzamčen.");
    if (useDemoData) {
        if (date === 'BULK_RANGE') setEntries(prev => [...prev, ...submittedEntries]);
        else setEntries(prev => [...prev.filter(e => !(e.employeeId === targetUserId && e.date === date)), ...submittedEntries]);
        return;
    }
    try {
        setIsCloudSyncing(true);
        if (date === 'BULK_RANGE') {
            await addTimeEntriesBulk(submittedEntries);
        } else { 
            await deleteTimeEntriesForDate(targetUserId, date); 
            if (submittedEntries.length > 0) await addTimeEntriesBulk(submittedEntries); 
        }
        await loadData();
    } catch (e: any) { 
        alert(`CHYBA: ${e.message}`); 
    } finally {
        setIsCloudSyncing(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!canEdit) return alert("Měsíc je uzamčen.");
    if (useDemoData) { setEntries(prev => prev.filter(e => e.id !== id)); return; }
    try { 
        setIsCloudSyncing(true);
        await deleteTimeEntry(id); 
        setEntries(prev => prev.filter(e => e.id !== id)); 
    } catch (e: any) { 
        alert("Chyba při mazání."); 
    } finally {
        setIsCloudSyncing(false);
    }
  };

  const handleStatusUpdate = async (newStatus: TimesheetStatus, comment?: string) => {
    const updatedReport: MonthStatus = { employeeId: targetUserId, month: selectedMonth, status: newStatus, managerComment: comment };
    if (useDemoData) {
        setMonthlyReports(prev => [...prev.filter(r => !(r.employeeId === targetUserId && r.month === selectedMonth)), updatedReport]);
        return;
    }
    try { 
        setIsCloudSyncing(true);
        await upsertMonthlyReport(updatedReport); 
        await loadData(); 
    } catch (e: any) { 
        alert("Chyba při změně stavu."); 
    } finally {
        setIsCloudSyncing(false);
    }
  };

  const handleMarkRead = async (id: string) => { if (!useDemoData) await markNotificationAsRead(id); setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n)); };
  const handleMarkAllRead = async () => { if (!useDemoData) await markAllNotificationsAsRead(currentUserId); setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))); };
  
  const handleSendMessagePlaceholder = () => {
    alert("Funkce zasílání zpráv je dočasně mimo provoz kvůli údržbě stability.");
  };

  const handleAddEmployee = async (emp: Employee) => { if (useDemoData) setEmployees(prev => [...prev, emp]); else { await addEmployee(emp); loadData(); } };
  const handleUpdateEmployee = async (emp: Employee) => { if (useDemoData) setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e)); else { await updateEmployee(emp); loadData(); } };
  const handleToggleEmployeeStatus = async (id: string, isActive: boolean) => { if (useDemoData) setEmployees(prev => prev.map(e => e.id === id ? { ...e, isActive } : e)); else { await updateEmployeeStatus(id, isActive); loadData(); } };
  
  const handleAddJob = async (job: Job) => { if (useDemoData) setJobs(prev => [...prev, job]); else { await addJob(job); loadData(); } };
  const handleToggleJobStatus = async (id: string, isActive: boolean) => { if (useDemoData) setJobs(prev => prev.map(j => j.id === id ? { ...j, isActive } : j)); else { await updateJobStatus(id, isActive); loadData(); } };

  if (presentationMode) return <PresentationMode type={presentationMode} onClose={() => setPresentationMode(null)} />;

  if (isLoading && employees.length === 0) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-[#0f172a] text-white">
              <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                  <p className="text-sm font-medium">Načítání docházky...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f3f4f6]">
      {isCloudSyncing && !useDemoData && (
          <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-indigo-600 animate-pulse"></div>
      )}

      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} installPrompt={installPrompt} onInstall={handleInstallClick}
        currentUser={currentUser} employees={activeEmployees} onRequestSwitchUser={handleRequestSwitchUser} 
        onShowAbout={() => setIsAboutOpen(true)} onContactManager={handleSendMessagePlaceholder} onlineUserIds={onlineUserIds} 
        version={VERSION}
        notifications={notifications}
        onMarkAsRead={handleMarkRead}
        onMarkAllAsRead={handleMarkAllRead}
      />

      <div className="md:hidden bg-slate-900 text-white p-4 pt-[env(safe-area-inset-top,20px)] flex justify-between items-center sticky top-0 z-30 shadow-md">
        <button onClick={() => setIsAboutOpen(true)} className="flex items-center gap-2">
           <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 30 L40 75 L60 30 L80 75 L100 30" stroke="white" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
           </div>
           <div className="flex flex-col text-left">
             <div className="flex items-baseline gap-1">
                <h1 className="font-bold text-lg leading-none">Chytrá</h1>
                <span className="text-[9px] text-slate-400">v{VERSION}</span>
             </div>
             <span className="text-[10px] text-indigo-400 font-bold leading-none uppercase">Docházka</span>
           </div>
        </button>
        <div className="flex items-center gap-2">
           <NotificationBell notifications={notifications} onMarkAsRead={handleMarkRead} onMarkAllAsRead={handleMarkAllRead} />
           <div className="flex items-center gap-2 bg-slate-800 rounded-full pl-1 pr-3 py-1 border border-slate-700 relative">
              <img src={currentUser.avatar} className="w-6 h-6 rounded-full" alt="User" />
              <select value={currentUserId} onChange={(e) => handleRequestSwitchUser(e.target.value)} className="bg-transparent text-white text-xs font-medium border-none focus:ring-0 p-0 max-w-[100px] truncate cursor-pointer outline-none">
                {activeEmployees.map(emp => <option key={emp.id} value={emp.id} className="text-black">{emp.name}</option>)}
              </select>
           </div>
        </div>
      </div>

      <main className="flex-1 p-0 overflow-y-auto flex flex-col h-screen md:h-auto no-print">
        {!dbStatus.ok && (
          <div className="bg-red-600 text-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-center sticky top-0 md:relative z-[60] border-b border-red-700 animate-pulse">
            ⚠️ CHYBA PŘIPOJENÍ K DATABÁZI: {dbStatus.msg}
          </div>
        )}
        
        {useDemoData && dbStatus.ok && (
          <div className="bg-amber-100 text-amber-800 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-center sticky top-0 md:relative z-[60] border-b border-amber-200">
            ⚠️ DEMO REŽIM - DATA SE NEUKLÁDAJÍ
          </div>
        )}

        {reviewingUserId && (
          <div className="bg-indigo-600 text-white px-6 py-3 sticky top-0 md:top-0 z-40 flex justify-between items-center shadow-md animate-fade-in">
             <div className="font-bold text-sm">Kontrola: {targetUser.name}</div>
             <button onClick={() => setReviewingUserId(null)} className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold">Zavřít</button>
          </div>
        )}

        {activeTab === 'overview' && (
            <div className="p-4 md:p-8 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <h2 className="text-xl font-bold text-slate-900">Přehled docházky</h2>
                <MonthNavigator selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
              </div>

              <ApprovalWorkflow status={monthStatus} onUpdateStatus={handleStatusUpdate} isManagerMode={isManagerMode} validationIssues={validationIssues} />
              
              {isManagerMode && !reviewingUserId && <TeamOverview employees={activeEmployees} allEntries={entries} selectedMonth={selectedMonth} onInspect={setReviewingUserId} currentUserRole={currentUser.role} reports={monthlyReports} onMessage={handleSendMessagePlaceholder} onlineUserIds={onlineUserIds} />}
              
              {canEdit && <SmartInput onEntriesAdded={handleAddEntries} currentUserId={targetUserId} onManualEntry={() => setIsEntryModalOpen(true)} onCopyLastDay={handleCopyLastDay} lastActiveDay={lastActiveDay} selectedMonth={selectedMonth} existingEntries={monthlyUserEntries} />}
              
              <div className="mb-8"><Dashboard entries={monthlyUserEntries} selectedMonth={selectedMonth} /></div>
              
              <ValidationStatus issues={validationIssues} />
              
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Záznamy ({selectedMonth}) - {targetUser.name}</h3>
                  {isCloudSyncing && <span className="text-xs text-indigo-600 animate-pulse">Synchronizace...</span>}
              </div>
              <TimesheetTable entries={monthlyUserEntries} onDelete={handleDeleteEntry} onEdit={(d) => { setEditingDate(d); setIsEntryModalOpen(true); }} isLocked={isStatusLocked} canEdit={canEdit} />
            </div>
          )}

          {activeTab === 'report' && (
             <div className="p-4 md:p-8 pt-6 space-y-8">
               <ReportingModule 
                  entries={isManagerMode ? entries : allUserEntries} 
                  employees={employees} 
                  currentUserRole={currentUser.role} 
                  jobs={jobs} 
                  selectedEmployeeId={targetUserId}
                  selectedMonth={selectedMonth}
               />
             </div>
          )}

          {activeTab === 'settings' && isManagerMode && (
            <div className="p-4 md:p-8 pt-6 space-y-6"><AdminPanel employees={employees} onAddEmployee={handleAddEmployee} onUpdateEmployee={handleUpdateEmployee} onToggleEmployeeStatus={handleToggleEmployeeStatus} jobs={jobs} onAddJob={handleAddJob} onToggleJobStatus={handleToggleJobStatus} currentUser={currentUser} onStartPresentation={setPresentationMode} /></div>
          )}
      </main>
      
      <HelpSystem />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} onContactDeveloper={handleSendMessagePlaceholder} onServiceLogin={handleSendMessagePlaceholder} version={VERSION} />
      <UpdatePrompt /> 
      <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} currentUserRole={currentUser.role} />
      <EntryFormModal isOpen={isEntryModalOpen} onClose={() => setIsEntryModalOpen(false)} onSubmit={handleModalSubmit} initialDate={editingDate || undefined} existingEntries={entriesForEditingDate} currentUserId={targetUserId} jobs={activeJobs} allMonthEntries={monthlyUserEntries} />
      {pendingUserId && (
          <PinPadModal isOpen={isPinModalOpen} onClose={() => { setIsPinModalOpen(false); setPendingUserId(null); }} onSuccess={handlePinSuccess} targetPin={employees.find(e => e.id === pendingUserId)?.pinCode || ''} targetUserName={employees.find(e => e.id === pendingUserId)?.name || 'Uživatel'} />
      )}
    </div>
  );
};

export default App;