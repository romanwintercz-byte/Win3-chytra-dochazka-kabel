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

// Pomocná funkce pro bezpečné datum bez UTC posunu
const getLocalMonthStr = (date: Date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const initialMonthStatus: MonthStatus = {
  month: getLocalMonthStr(),
  status: TimesheetStatus.DRAFT,
};

const VERSION = '1.9.27';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'settings'>('overview');
  const [useDemoData, setUseDemoData] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<{ok: boolean, msg?: string}>({ ok: true });
  
  const [monthlyReports, setMonthlyReports] = useState<MonthStatus[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [reviewingUserId, setReviewingUserId] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState<PresentationType | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const currentUser = useMemo(() => {
    return employees.find(e => e.id === currentUserId) || employees[0] || {
        id: 'temp', name: 'Načítání...', role: 'Zaměstnanec', email: '', avatar: '', isActive: true
    } as Employee;
  }, [employees, currentUserId]);

  const targetUserId = reviewingUserId || currentUserId;
  const targetUser = useMemo(() => {
    return employees.find(e => e.id === targetUserId) || currentUser;
  }, [employees, targetUserId, currentUser]);

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
      return employees.filter(e => e.isActive && e.id !== 'win3-support-id');
  }, [employees]);

  const activeJobs = useMemo(() => jobs.filter(j => j.isActive), [jobs]);

  const loadData = async (forceDemo: boolean = false) => {
      setIsLoading(true);
      setIsCloudSyncing(true);

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
          setDbStatus({ ok: true, msg: 'DEMO' });
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
          console.error("DB Error:", err);
          setDbStatus({ ok: false, msg: err.message || 'Chyba připojení' });
          
          if (employees.length === 0) {
            setEmployees(MOCK_EMPLOYEES);
            setUseDemoData(true);
          }
      } finally {
          setIsLoading(false);
          setIsCloudSyncing(false);
      }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
      if (currentUserId && !useDemoData) {
          try {
              const presenceChannel = subscribeToPresence(currentUserId, (ids) => setOnlineUserIds(new Set(ids)));
              const notificationChannel = subscribeToNotifications(currentUserId, (newNote) => setNotifications(prev => [newNote, ...prev]));
              fetchNotifications(currentUserId).then(setNotifications).catch(() => {});
              return () => {
                  presenceChannel.unsubscribe();
                  notificationChannel.unsubscribe();
              };
          } catch (e) {}
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
    setIsManagerMode(currentUser.role === 'Manager');
  }, [currentUserId, currentUser]);

  const monthlyUserEntries = useMemo(() => {
      if (!selectedMonth) return [];
      return entries.filter(e => e.employeeId === targetUserId && e.date && e.date.startsWith(selectedMonth));
  }, [entries, targetUserId, selectedMonth]);
  
  const entriesForEditingDate = useMemo(() => editingDate ? entries.filter(e => e.employeeId === targetUserId && e.date === editingDate) : [], [entries, targetUserId, editingDate]);
  
  const lastActiveDay = useMemo(() => {
    const userEntries = entries.filter(e => e.employeeId === targetUserId);
    if (userEntries.length === 0) return undefined;
    const sorted = [...userEntries].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0].date;
  }, [entries, targetUserId]);

  const validationIssues = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-');
    return validateMonth(monthlyUserEntries, year, month);
  }, [monthlyUserEntries, selectedMonth]);

  const handleRequestSwitchUser = (targetId: string) => {
      const targetEmp = employees.find(e => e.id === targetId);
      if (targetEmp?.pinCode) { setPendingUserId(targetId); setIsPinModalOpen(true); }
      else setCurrentUserId(targetId);
  };

  const handlePinSuccess = () => {
      if (pendingUserId) setCurrentUserId(pendingUserId);
      setIsPinModalOpen(false); setPendingUserId(null);
  };

  const handleAddEntries = async (newEntries: TimeEntry[]) => {
    if (!canEdit) return alert("Uzamčeno.");
    if (useDemoData) { setEntries(prev => [...prev, ...newEntries]); return; }
    try { 
        setIsCloudSyncing(true);
        await addTimeEntriesBulk(newEntries); 
        await loadData(); 
    } catch (e: any) { 
        alert(`Chyba při zápisu: ${e.message}`); 
    } finally { setIsCloudSyncing(false); }
  };

  const handleCopyLastDay = async () => {
    if (!canEdit || !lastActiveDay) return;
    const entriesToCopy = entries.filter(e => e.employeeId === targetUserId && e.date === lastActiveDay);
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const newEntries = entriesToCopy.map(e => ({
        id: uuidv4(), employeeId: targetUserId, date: today, project: e.project, description: e.description, hours: e.hours, type: e.type
    }));
    await handleAddEntries(newEntries);
  };

  const handleModalSubmit = async (date: string, submittedEntries: TimeEntry[]) => {
    if (!canEdit) return alert("Uzamčeno.");
    if (useDemoData) {
        if (date === 'BULK_RANGE') setEntries(prev => [...prev, ...submittedEntries]);
        else setEntries(prev => [...prev.filter(e => !(e.employeeId === targetUserId && e.date === date)), ...submittedEntries]);
        return;
    }
    try {
        setIsCloudSyncing(true);
        if (date !== 'BULK_RANGE') await deleteTimeEntriesForDate(targetUserId, date); 
        if (submittedEntries.length > 0) await addTimeEntriesBulk(submittedEntries); 
        await loadData();
    } catch (e: any) { alert(`Chyba: ${e.message}`); } finally { setIsCloudSyncing(false); }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!canEdit) return alert("Uzamčeno.");
    if (useDemoData) { setEntries(prev => prev.filter(e => e.id !== id)); return; }
    try { 
        setIsCloudSyncing(true);
        await deleteTimeEntry(id); 
        await loadData();
    } catch (e: any) { alert("Chyba při mazání."); } finally { setIsCloudSyncing(false); }
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
    } catch (e: any) { alert("Chyba při změně stavu."); } finally { setIsCloudSyncing(false); }
  };

  const handleMarkRead = async (id: string) => { if (!useDemoData) await markNotificationAsRead(id); setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n)); };
  const handleMarkAllRead = async () => { if (!useDemoData) await markAllNotificationsAsRead(currentUserId); setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))); };

  if (presentationMode) return <PresentationMode type={presentationMode} onClose={() => setPresentationMode(null)} />;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f3f4f6]">
      {isCloudSyncing && !useDemoData && (
          <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-indigo-600 animate-pulse"></div>
      )}

      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} installPrompt={installPrompt} onInstall={() => {}}
        currentUser={currentUser} employees={activeEmployees} onRequestSwitchUser={handleRequestSwitchUser} 
        onShowAbout={() => setIsAboutOpen(true)} onContactManager={() => alert("Mimo provoz")} onlineUserIds={onlineUserIds} 
        version={VERSION}
        notifications={notifications}
        onMarkAsRead={handleMarkRead}
        onMarkAllAsRead={handleMarkAllRead}
      />

      <div className="md:hidden bg-slate-900 text-white p-4 pt-[env(safe-area-inset-top,20px)] flex justify-between items-center sticky top-0 z-30 shadow-md">
        <button onClick={() => setIsAboutOpen(true)} className="flex items-center gap-2">
           <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white font-bold">W</div>
           <h1 className="font-bold text-lg">Docházka</h1>
        </button>
        <div className="flex items-center gap-2">
           <NotificationBell notifications={notifications} onMarkAsRead={handleMarkRead} onMarkAllAsRead={handleMarkAllRead} />
           <div className="flex items-center gap-2 bg-slate-800 rounded-full px-2 py-1 border border-slate-700">
              <img src={currentUser.avatar} className="w-6 h-6 rounded-full" alt="User" />
              <select value={currentUserId} onChange={(e) => handleRequestSwitchUser(e.target.value)} className="bg-transparent text-white text-xs border-none focus:ring-0 outline-none">
                {activeEmployees.map(emp => <option key={emp.id} value={emp.id} className="text-black">{emp.name}</option>)}
              </select>
           </div>
        </div>
      </div>

      <main className="flex-1 p-0 overflow-y-auto flex flex-col h-screen md:h-auto no-print">
        {!dbStatus.ok && (
          <div className="bg-red-600 text-white px-4 py-2 text-[11px] font-black uppercase text-center sticky top-0 md:relative z-[60]">
            ⚠️ CHYBA DATABÁZE: {dbStatus.msg}
          </div>
        )}
        
        {isLoading ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50/50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        ) : (
            <div className="p-4 md:p-8 pt-6">
                <div className="animate-fade-in">
                    {activeTab === 'overview' && (
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                                <h2 className="text-xl font-bold text-slate-900">Přehled docházky</h2>
                                <MonthNavigator selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
                            </div>
                            <ApprovalWorkflow status={monthStatus} onUpdateStatus={handleStatusUpdate} isManagerMode={isManagerMode} validationIssues={validationIssues} />
                            {isManagerMode && !reviewingUserId && <TeamOverview employees={activeEmployees} allEntries={entries} selectedMonth={selectedMonth} onInspect={setReviewingUserId} currentUserRole={currentUser.role} reports={monthlyReports} onMessage={() => {}} onlineUserIds={onlineUserIds} />}
                            {canEdit && <SmartInput onEntriesAdded={handleAddEntries} currentUserId={targetUserId} onManualEntry={() => setIsEntryModalOpen(true)} onCopyLastDay={handleCopyLastDay} lastActiveDay={lastActiveDay} selectedMonth={selectedMonth} existingEntries={monthlyUserEntries} />}
                            <div className="mb-8"><Dashboard entries={monthlyUserEntries} selectedMonth={selectedMonth} /></div>
                            <ValidationStatus issues={validationIssues} />
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">Záznamy - {targetUser.name}</h3>
                            <TimesheetTable entries={monthlyUserEntries} onDelete={handleDeleteEntry} onEdit={(d) => { setEditingDate(d); setIsEntryModalOpen(true); }} isLocked={isStatusLocked} canEdit={canEdit} />
                        </>
                    )}
                    {activeTab === 'report' && (
                        <ReportingModule 
                            entries={isManagerMode ? entries : entries.filter(e => e.employeeId === currentUserId)} 
                            employees={employees} 
                            currentUserRole={currentUser.role} 
                            jobs={jobs} 
                            selectedEmployeeId={targetUserId} 
                            selectedMonth={selectedMonth} 
                        />
                    )}
                    {activeTab === 'settings' && isManagerMode && (
                        <AdminPanel 
                            employees={employees} 
                            onAddEmployee={() => {}} 
                            onUpdateEmployee={() => {}} 
                            onToggleEmployeeStatus={() => {}} 
                            jobs={jobs} 
                            onAddJob={() => {}} 
                            onToggleJobStatus={() => {}} 
                            currentUser={currentUser} 
                            onStartPresentation={setPresentationMode} 
                        />
                    )}
                </div>
            </div>
        )}
      </main>
      
      <HelpSystem />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} onContactDeveloper={() => {}} onServiceLogin={() => {}} version={VERSION} />
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