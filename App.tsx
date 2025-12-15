
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
import MessageModal from './components/MessageModal'; 
import { TimeEntry, MonthStatus, TimesheetStatus, Employee, Job, Notification } from './types';
import { validateMonth } from './services/validationService';
import { v4 as uuidv4 } from 'uuid';
import { CREDENTIALS } from './credentials';
import { 
    fetchEmployees, addEmployee, updateEmployee, updateEmployeeStatus, 
    fetchJobs, addJob, updateJobStatus,
    fetchTimeEntries, addTimeEntriesBulk, deleteTimeEntriesForDate, deleteTimeEntry,
    fetchMonthlyReports, upsertMonthlyReport,
    fetchGlobalLock,
    fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, createNotification,
    subscribeToPresence, subscribeToNotifications
} from './services/supabase';

const getCurrentMonth = () => {
  return new Date().toISOString().slice(0, 7);
};

const initialMonthStatus: MonthStatus = {
  month: getCurrentMonth(),
  status: TimesheetStatus.DRAFT,
};

const SUPPORT_ID = 'win3-support-id';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'settings'>('overview');
  
  // Data State - Clean Initialization
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Reports State
  const [monthlyReports, setMonthlyReports] = useState<MonthStatus[]>([]);

  // User Session State
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Realtime Presence State
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Review Mode State
  const [reviewingUserId, setReviewingUserId] = useState<string | null>(null);

  // Presentation Mode State
  const [presentationMode, setPresentationMode] = useState<PresentationType | null>(null);

  // PIN Authentication State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Messaging State
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageRecipientId, setMessageRecipientId] = useState<string>('');
  const [messageRecipientName, setMessageRecipientName] = useState<string>('');

  // The actual logged-in user
  const currentUser = employees.find(e => e.id === currentUserId) || employees[0] || {
      id: 'temp', name: 'Načítání...', role: 'Zaměstnanec', email: '', avatar: '', isActive: true
  } as Employee;

  // The user whose data we are currently viewing/editing
  const targetUserId = reviewingUserId || currentUserId;
  const targetUser = employees.find(e => e.id === targetUserId) || currentUser;

  // Month Selection State
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [isGlobalLocked, setIsGlobalLocked] = useState(false);

  const [monthStatus, setMonthStatus] = useState<MonthStatus>(initialMonthStatus);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  // Manual Entry Modal State
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  // About Modal State
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Manager privileges
  const isManagerRole = currentUser.role === 'Manager';
  const [isManagerMode, setIsManagerMode] = useState(false);

  // Status-based lock (Visual)
  const isStatusLocked = useMemo(() => {
    return monthStatus.status === TimesheetStatus.SUBMITTED || monthStatus.status === TimesheetStatus.APPROVED;
  }, [monthStatus.status]);

  // Permission-based editability (Functional)
  const canEdit = useMemo(() => {
    if (isGlobalLocked) return false; 
    return !isStatusLocked || isManagerMode;
  }, [isStatusLocked, isManagerMode, isGlobalLocked]);

  const activeEmployees = useMemo(() => {
      return employees.filter(e => e.isActive && e.id !== SUPPORT_ID);
  }, [employees]);

  const activeJobs = useMemo(() => jobs.filter(j => j.isActive), [jobs]);

  // Load Data
  const loadData = async () => {
      try {
          setIsLoading(true);
          // Fetch data from Supabase
          let [emps, jbs, entrs] = await Promise.all([
              fetchEmployees(),
              fetchJobs(),
              fetchTimeEntries()
          ]);

          // Update state
          if (emps) setEmployees(emps);
          if (jbs) setJobs(jbs);
          if (entrs) setEntries(entrs);
          
          // Initialize User logic
          const savedId = localStorage.getItem('smartwork_current_user_id');
          // Use loaded employees for checking
          const availableEmps = (emps && emps.length > 0) ? emps : employees;
          
          if (savedId && availableEmps.some(e => e.id === savedId && e.isActive !== false)) {
              setCurrentUserId(savedId);
          } else {
              const firstActive = availableEmps.find(e => e.isActive !== false && e.id !== SUPPORT_ID);
              if (firstActive) setCurrentUserId(firstActive.id);
          }

      } catch (error) {
          console.error("Failed to load data:", error);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      loadData();
      
      // Force cleanup of any old credentials that might cause issues
      localStorage.removeItem('smartwork_supabase_url');
      localStorage.removeItem('smartwork_supabase_key');
  }, []);

  // --- REST OF APP LOGIC ---
  useEffect(() => {
    setReviewingUserId(null);
  }, [currentUserId]);

  useEffect(() => {
      if (currentUserId) {
          const presenceChannel = subscribeToPresence(currentUserId, (ids) => setOnlineUserIds(new Set(ids)));
          const notificationChannel = subscribeToNotifications(currentUserId, (newNote) => setNotifications(prev => [newNote, ...prev]));
          const loadNotifications = async () => {
              const notifs = await fetchNotifications(currentUserId);
              setNotifications(notifs);
          };
          loadNotifications();
          return () => {
              presenceChannel.unsubscribe();
              notificationChannel.unsubscribe();
          };
      }
  }, [currentUserId]);

  useEffect(() => {
    const loadReportsAndLocks = async () => {
        try {
            const reports = await fetchMonthlyReports(selectedMonth);
            setMonthlyReports(reports);
            const globalLock = await fetchGlobalLock(selectedMonth);
            setIsGlobalLocked(globalLock);
        } catch (e) {}
    };
    loadReportsAndLocks();
  }, [selectedMonth]);

  useEffect(() => {
      const userReport = monthlyReports.find(r => r.employeeId === targetUserId);
      setMonthStatus(userReport || { month: selectedMonth, status: TimesheetStatus.DRAFT, employeeId: targetUserId });
  }, [targetUserId, selectedMonth, monthlyReports]);

  useEffect(() => {
    if (currentUserId) localStorage.setItem('smartwork_current_user_id', currentUserId);
  }, [currentUserId]);

  const allUserEntries = useMemo(() => entries.filter(e => e.employeeId === targetUserId), [entries, targetUserId]);
  const monthlyUserEntries = useMemo(() => allUserEntries.filter(e => e.date.startsWith(selectedMonth)), [allUserEntries, selectedMonth]);
  const entriesForEditingDate = useMemo(() => editingDate ? allUserEntries.filter(e => e.date === editingDate) : [], [allUserEntries, editingDate]);
  const lastActiveDay = useMemo(() => {
    if (allUserEntries.length === 0) return undefined;
    const sorted = [...allUserEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0].date;
  }, [allUserEntries]);

  const validationIssues = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    return validateMonth(monthlyUserEntries, year, month);
  }, [monthlyUserEntries, selectedMonth]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => { setIsManagerMode(currentUser.role === 'Manager'); }, [currentUser]);
  useEffect(() => { if (activeTab === 'settings' && !isManagerMode) setActiveTab('overview'); }, [activeTab, isManagerMode]);

  // Handlers
  const handleRequestSwitchUser = (targetId: string) => {
      const targetEmp = employees.find(e => e.id === targetId);
      if (targetEmp?.pinCode) {
          setPendingUserId(targetId);
          setIsPinModalOpen(true);
      } else {
          setCurrentUserId(targetId);
      }
  };

  const handlePinSuccess = () => {
      if (pendingUserId) setCurrentUserId(pendingUserId);
      setIsPinModalOpen(false);
      setPendingUserId(null);
  };

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  };

  const handleAddEntries = async (newEntries: TimeEntry[]) => {
    if (!canEdit) return alert("Měsíc je uzamčen.");
    try { await addTimeEntriesBulk(newEntries); loadData(); } catch (e: any) { alert("Chyba: " + e.message); }
  };

  const handleCopyLastDay = async () => {
    if (!canEdit || !lastActiveDay) return;
    const entriesToCopy = allUserEntries.filter(e => e.date === lastActiveDay);
    if (entriesToCopy.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = allUserEntries.filter(e => e.date === today);
    if (todayEntries.length > 0) if (!window.confirm(`Přepsat dnešek (${today})?`)) return;
    if (todayEntries.length > 0) await deleteTimeEntriesForDate(targetUserId, today);
    
    const newEntries = entriesToCopy.map(e => ({
        id: uuidv4(), employeeId: targetUserId, date: today, project: e.project, description: e.description, hours: e.hours, type: e.type
    }));
    await handleAddEntries(newEntries);
  };

  const handleModalSubmit = async (date: string, submittedEntries: TimeEntry[]) => {
    if (!canEdit) return alert("Nelze upravovat záznamy.");
    try {
        if (date === 'BULK_RANGE') await addTimeEntriesBulk(submittedEntries);
        else {
            await deleteTimeEntriesForDate(targetUserId, date);
            if (submittedEntries.length > 0) await addTimeEntriesBulk(submittedEntries);
        }
        loadData();
    } catch (e: any) { alert("Chyba: " + e.message); }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!canEdit) return alert("Nelze mazat.");
    try { await deleteTimeEntry(id); setEntries(prev => prev.filter(e => e.id !== id)); } catch (e: any) { alert("Chyba: " + e.message); }
  };

  const handleEditDay = (date: string) => {
    if (!canEdit) return alert("Nelze upravovat.");
    setEditingDate(date); setIsEntryModalOpen(true);
  };

  const handleOpenManualEntry = () => {
    if (!canEdit) return alert("Nelze přidávat.");
    setEditingDate(new Date().toISOString().split('T')[0]); setIsEntryModalOpen(true);
  };

  const handleStatusUpdate = async (newStatus: TimesheetStatus, comment?: string) => {
    const updatedReport: MonthStatus = { employeeId: targetUserId, month: selectedMonth, status: newStatus, managerComment: comment };
    setMonthStatus(prev => ({ ...prev, ...updatedReport }));
    setMonthlyReports(prev => {
        const idx = prev.findIndex(r => r.employeeId === targetUserId);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...copy[idx], ...updatedReport }; return copy; }
        else return [...prev, updatedReport];
    });
    try { await upsertMonthlyReport(updatedReport); } catch (e: any) { alert("Chyba: " + e.message); }
  };

  const handleMarkRead = async (id: string) => {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllRead = async () => {
      await markAllNotificationsAsRead(currentUserId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleOpenMessage = (recipientId: string, recipientName: string) => {
      setMessageRecipientId(recipientId); setMessageRecipientName(recipientName); setIsMessageModalOpen(true);
  };

  const handleContactManager = () => {
      const manager = employees.find(e => e.role === 'Manager' && e.id !== SUPPORT_ID);
      if (manager) handleOpenMessage(manager.id, manager.name);
      else alert('V systému není nastaven žádný manažer.');
  };

  const handleContactSupport = () => { handleOpenMessage(SUPPORT_ID, 'Win3 Support'); setIsAboutOpen(false); };
  
  const handleServiceLogin = () => {
      const supportUser = employees.find(e => e.id === SUPPORT_ID);
      if (supportUser) { handleRequestSwitchUser(SUPPORT_ID); setIsAboutOpen(false); }
      else alert('Servisní účet nenalezen.');
  };

  const handleSendMessage = async (text: string) => {
      try {
          const formattedMessage = `Zpráva od ${currentUser.name}: ${text}`;
          await createNotification(messageRecipientId, formattedMessage, 'info', currentUser.id);
          alert('Zpráva odeslána.');
      } catch (e) { alert('Chyba při odesílání.'); }
  };

  // Admin Handlers
  const handleAddEmployee = async (emp: Employee) => { try { await addEmployee(emp); loadData(); } catch (e: any) { alert("Chyba: " + e.message); } };
  const handleUpdateEmployee = async (emp: Employee) => { try { await updateEmployee(emp); loadData(); } catch (e: any) { alert("Chyba: " + e.message); } };
  const handleToggleEmployeeStatus = async (id: string, isActive: boolean) => { try { await updateEmployeeStatus(id, isActive); loadData(); } catch (e: any) { alert("Chyba: " + e.message); } };
  const handleAddJob = async (job: Job) => { try { await addJob(job); loadData(); } catch (e: any) { alert("Chyba: " + e.message); } };
  const handleToggleJobStatus = async (id: string, isActive: boolean) => { try { await updateJobStatus(id, isActive); loadData(); } catch (e: any) { alert("Chyba: " + e.message); } };
  const handleStartPresentation = (type: PresentationType) => setPresentationMode(type);

  if (presentationMode) return <PresentationMode type={presentationMode} onClose={() => setPresentationMode(null)} />;

  if (isLoading && employees.length === 0) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-[#f3f4f6]">
              <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  <p className="text-gray-500 font-medium animate-pulse">Načítám docházku...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f3f4f6]">
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} installPrompt={installPrompt} onInstall={handleInstallClick}
        currentUser={currentUser} employees={activeEmployees} onRequestSwitchUser={handleRequestSwitchUser} 
        onShowAbout={() => setIsAboutOpen(true)} onContactManager={handleContactManager} onlineUserIds={onlineUserIds} 
      />

      {/* Mobile Header with User Switcher */}
      <div className="md:hidden bg-slate-900 text-white p-4 pt-[env(safe-area-inset-top,20px)] flex justify-between items-center sticky top-0 z-30 shadow-md">
        <button onClick={() => setIsAboutOpen(true)} className="flex items-center gap-2">
           <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 30 L40 75 L60 30 L80 75 L100 30" stroke="white" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
           </div>
           <div className="flex flex-col">
             <div className="flex items-baseline gap-1">
                <h1 className="font-bold text-lg leading-none">Chytrá</h1>
                <span className="text-[9px] text-slate-400">v1.5.6</span>
             </div>
             <span className="text-[10px] text-indigo-300 font-bold leading-none">DOCHÁZKA</span>
           </div>
        </button>
        <div className="flex items-center gap-2">
           <NotificationBell notifications={notifications} onMarkAsRead={handleMarkRead} onMarkAllAsRead={handleMarkAllRead} />
           <div className="flex items-center gap-2 bg-slate-800 rounded-full pl-1 pr-3 py-1 border border-slate-700 relative">
              <div className="relative">
                  <img src={currentUser.avatar} className="w-6 h-6 rounded-full" alt="User" />
                  {onlineUserIds.has(currentUser.id) && <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-slate-800"></div>}
              </div>
              <select value={currentUserId} onChange={(e) => handleRequestSwitchUser(e.target.value)} className="bg-transparent text-white text-xs font-medium border-none focus:ring-0 p-0 max-w-[100px] truncate cursor-pointer outline-none">
                {activeEmployees.map(emp => (
                  <option key={emp.id} value={emp.id} className="text-black">{emp.name}</option>
                ))}
              </select>
           </div>
        </div>
      </div>

      <main className="flex-1 p-0 overflow-y-auto flex flex-col h-screen md:h-auto">
        
        {/* REVIEW MODE BANNER */}
        {reviewingUserId && (
          <div className="bg-indigo-600 text-white px-6 py-3 sticky top-0 md:top-0 z-40 flex justify-between items-center shadow-md">
             <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </div>
                <div>
                    <div className="text-xs uppercase font-bold text-indigo-200">Režim kontroly</div>
                    <div className="font-bold text-sm flex items-center gap-2">
                        Právě kontrolujete: {targetUser.name}
                        {onlineUserIds.has(targetUser.id) && <span className="bg-green-500 w-2 h-2 rounded-full" title="Online"></span>}
                    </div>
                </div>
             </div>
             <button onClick={() => setReviewingUserId(null)} className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-50 transition-colors">Ukončit náhled</button>
          </div>
        )}

        {/* GLOBAL LOCK BANNER */}
        {isGlobalLocked && (
            <div className="bg-red-600 text-white px-6 py-3 sticky top-0 md:top-0 z-40 flex justify-center items-center shadow-md animate-pulse-slow">
                <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Uzavřeno pro mzdy - Editace zakázána
                </div>
            </div>
        )}

        {activeTab === 'overview' && (
            <>
              {isManagerMode && !reviewingUserId && (
                <TeamOverview 
                  employees={activeEmployees} allEntries={entries} selectedMonth={selectedMonth} onInspect={setReviewingUserId}
                  currentUserRole={currentUser.role} reports={monthlyReports} onMessage={handleOpenMessage} onlineUserIds={onlineUserIds}
                />
              )}

              {canEdit && (
                 <SmartInput 
                    onEntriesAdded={handleAddEntries} currentUserId={targetUserId} onManualEntry={handleOpenManualEntry}
                    onCopyLastDay={handleCopyLastDay} lastActiveDay={lastActiveDay} selectedMonth={selectedMonth} existingEntries={monthlyUserEntries}
                 />
              )}

              {isStatusLocked && !canEdit && !isGlobalLocked && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                   <span className="font-medium text-sm">Měsíc je uzamčen. Editace není povolena.</span>
                </div>
              )}
              
              <div className="mb-8"><Dashboard entries={monthlyUserEntries} selectedMonth={selectedMonth} /></div>
              <ValidationStatus issues={validationIssues} />
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Záznamy ({selectedMonth}) - {targetUser.name}</h3>
              <TimesheetTable entries={monthlyUserEntries} onDelete={handleDeleteEntry} onEdit={handleEditDay} isLocked={isStatusLocked} canEdit={canEdit} />
            </>
          )}

          {activeTab === 'report' && (
             <div className="space-y-8">
                <ReportingModule entries={isManagerMode ? entries : allUserEntries} employees={employees} currentUserRole={currentUser.role} jobs={jobs} />
             </div>
          )}

          {activeTab === 'settings' && isManagerMode && (
            <div className="space-y-6">
               <AdminPanel 
                  employees={employees} onAddEmployee={handleAddEmployee} onUpdateEmployee={handleUpdateEmployee} onToggleEmployeeStatus={handleToggleEmployeeStatus}
                  jobs={jobs} onAddJob={handleAddJob} onToggleJobStatus={handleToggleJobStatus} currentUser={currentUser} onStartPresentation={handleStartPresentation}
               />
            </div>
          )}

      </main>
      
      <HelpSystem />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} onContactDeveloper={handleContactSupport} onServiceLogin={handleServiceLogin} />
      <UpdatePrompt /> 
      <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} currentUserRole={currentUser.role} />

      <EntryFormModal
        isOpen={isEntryModalOpen} onClose={() => setIsEntryModalOpen(false)} onSubmit={handleModalSubmit} initialDate={editingDate || undefined}
        existingEntries={entriesForEditingDate} currentUserId={targetUserId} jobs={activeJobs} allMonthEntries={monthlyUserEntries}
      />

      <MessageModal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} onSend={handleSendMessage} recipientName={messageRecipientName} isRecipientOnline={onlineUserIds.has(messageRecipientId)} />

      {pendingUserId && (
          <PinPadModal
            isOpen={isPinModalOpen} onClose={() => { setIsPinModalOpen(false); setPendingUserId(null); }} onSuccess={handlePinSuccess}
            targetPin={employees.find(e => e.id === pendingUserId)?.pinCode || ''} targetUserName={employees.find(e => e.id === pendingUserId)?.name || 'Uživatel'}
          />
      )}
    </div>
  );
};

export default App;
