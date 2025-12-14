
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
    saveCredentialsManually, fetchMonthlyReports, upsertMonthlyReport,
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
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  
  // Reports State (Statuses for all employees)
  const [monthlyReports, setMonthlyReports] = useState<MonthStatus[]>([]);

  // User Session State
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Realtime Presence State
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Review Mode State (When Manager checks another user)
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

  // The actual logged-in user (e.g., Lucie)
  const currentUser = employees.find(e => e.id === currentUserId) || {
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

  // Config Modal State
  const [manualSupabaseUrl, setManualSupabaseUrl] = useState('');
  const [manualSupabaseKey, setManualSupabaseKey] = useState('');

  // Manager privileges depend on who is LOGGED IN, not who is viewed
  const isManagerRole = currentUser.role === 'Manager';
  const [isManagerMode, setIsManagerMode] = useState(false);

  // Reset review mode when switching logged in user
  useEffect(() => {
    setReviewingUserId(null);
  }, [currentUserId]);

  // Status-based lock (Visual)
  const isStatusLocked = useMemo(() => {
    return monthStatus.status === TimesheetStatus.SUBMITTED || monthStatus.status === TimesheetStatus.APPROVED;
  }, [monthStatus.status]);

  // Permission-based editability (Functional)
  const canEdit = useMemo(() => {
    if (isGlobalLocked) return false; // Hard lock for everyone
    return !isStatusLocked || isManagerMode;
  }, [isStatusLocked, isManagerMode, isGlobalLocked]);

  // Derived state for Active items (for UI) - HIDE SUPPORT ACCOUNT FROM LISTS
  const activeEmployees = useMemo(() => {
      return employees.filter(e => e.isActive && e.id !== SUPPORT_ID);
  }, [employees]);

  const activeJobs = useMemo(() => jobs.filter(j => j.isActive), [jobs]);

  // Load Data from Supabase
  const loadData = async (isBackground = false) => {
      try {
          if (!isBackground) setIsLoading(true);
          const [emps, jbs, entrs] = await Promise.all([
              fetchEmployees(),
              fetchJobs(),
              fetchTimeEntries()
          ]);
          setEmployees(emps);
          setJobs(jbs);
          setEntries(entrs);
          
          // Initialize User
          const savedId = localStorage.getItem('smartwork_current_user_id');
          // Check if saved user exists and is active
          if (savedId && emps.some(e => e.id === savedId && e.isActive !== false)) {
              setCurrentUserId(savedId);
          } else {
              // Fallback to first active user
              const firstActive = emps.find(e => e.isActive !== false && e.id !== SUPPORT_ID);
              if (firstActive) setCurrentUserId(firstActive.id);
          }

      } catch (error) {
          console.error("Failed to load data from Supabase:", error);
      } finally {
          if (!isBackground) setIsLoading(false);
      }
  };

  useEffect(() => {
      loadData();
  }, []);

  // --- REALTIME LOGIC ---
  useEffect(() => {
      if (currentUserId) {
          // 1. Subscribe to Presence (Who is online)
          const presenceChannel = subscribeToPresence(currentUserId, (ids) => {
              setOnlineUserIds(new Set(ids));
          });

          // 2. Subscribe to Notifications (Instant messages)
          const notificationChannel = subscribeToNotifications(currentUserId, (newNote) => {
              setNotifications(prev => [newNote, ...prev]);
              // Optional: Sound alert or native notification here
          });

          // 3. Initial Load of Notifications
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

  // Fetch Month Statuses and Global Lock when selectedMonth changes
  useEffect(() => {
    const loadReportsAndLocks = async () => {
        try {
            const reports = await fetchMonthlyReports(selectedMonth);
            setMonthlyReports(reports);
            
            const globalLock = await fetchGlobalLock(selectedMonth);
            setIsGlobalLocked(globalLock);
        } catch (e) {
            console.error("Failed to load reports/locks:", e);
        }
    };
    loadReportsAndLocks();
  }, [selectedMonth]);

  // Sync monthStatus state for the current TARGET user
  useEffect(() => {
      const userReport = monthlyReports.find(r => r.employeeId === targetUserId);
      if (userReport) {
          setMonthStatus(userReport);
      } else {
          setMonthStatus({
              month: selectedMonth,
              status: TimesheetStatus.DRAFT,
              employeeId: targetUserId
          });
      }
  }, [targetUserId, selectedMonth, monthlyReports]);


  // Persist user selection
  useEffect(() => {
    if (currentUserId) {
        localStorage.setItem('smartwork_current_user_id', currentUserId);
    }
  }, [currentUserId]);

  // Get entries for the TARGET user
  const allUserEntries = useMemo(() => {
    return entries.filter(e => e.employeeId === targetUserId);
  }, [entries, targetUserId]);

  const monthlyUserEntries = useMemo(() => {
    return allUserEntries.filter(e => e.date.startsWith(selectedMonth));
  }, [allUserEntries, selectedMonth]);

  const entriesForEditingDate = useMemo(() => {
    if (!editingDate) return [];
    return allUserEntries.filter(e => e.date === editingDate);
  }, [allUserEntries, editingDate]);

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
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    setIsManagerMode(currentUser.role === 'Manager');
  }, [currentUser]);

  // Security Redirect: If on settings tab but not a manager, redirect to overview
  useEffect(() => {
      if (activeTab === 'settings' && !isManagerMode) {
          setActiveTab('overview');
      }
  }, [activeTab, isManagerMode]);

  // --- USER SWITCHING LOGIC WITH PIN ---
  const handleRequestSwitchUser = (targetId: string) => {
      const targetEmp = employees.find(e => e.id === targetId);
      if (targetEmp?.pinCode && !CREDENTIALS.IS_DEMO_MODE) {
          // User has PIN, open modal (skip for Demo)
          setPendingUserId(targetId);
          setIsPinModalOpen(true);
      } else {
          // No PIN, switch immediately
          setCurrentUserId(targetId);
      }
  };

  const handlePinSuccess = () => {
      if (pendingUserId) {
          setCurrentUserId(pendingUserId);
      }
      setIsPinModalOpen(false);
      setPendingUserId(null);
  };

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      setInstallPrompt(null);
    });
  };

  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const handleAddEntries = async (newEntries: TimeEntry[]) => {
    if (!canEdit) {
      alert("Nelze přidávat záznamy. Měsíc je uzamčen.");
      return;
    }
    try {
        await addTimeEntriesBulk(newEntries);
        loadData(true);
    } catch (e: any) {
        console.error(e);
        alert("Chyba při ukládání: " + (e.message || "Neznámá chyba"));
    }
  };

  const handleCopyLastDay = async () => {
    if (!canEdit) {
       alert("Nelze upravovat uzamčený měsíc.");
       return;
    }
    if (!lastActiveDay) {
        alert("Nemám co zkopírovat (žádná historie).");
        return;
    }

    const entriesToCopy = allUserEntries.filter(e => e.date === lastActiveDay);
    if (entriesToCopy.length === 0) return;

    const today = new Date().toISOString().split('T')[0];

    const todayEntries = allUserEntries.filter(e => e.date === today);
    if (todayEntries.length > 0) {
        const confirmOverwrite = window.confirm(`Pro dnešek (${today}) už existují záznamy. Chcete je přepsat?`);
        if (confirmOverwrite) {
            await deleteTimeEntriesForDate(targetUserId, today);
        } else {
            return;
        }
    }

    const newEntries = entriesToCopy.map(e => ({
        id: uuidv4(),
        employeeId: targetUserId,
        date: today,
        project: e.project,
        description: e.description,
        hours: e.hours,
        type: e.type
    }));

    await handleAddEntries(newEntries);
  };

  const handleModalSubmit = async (date: string, submittedEntries: TimeEntry[]) => {
    if (!canEdit) {
      alert("Nelze upravovat záznamy v uzamčeném výkazu.");
      return;
    }
    try {
        if (date === 'BULK_RANGE') {
            await addTimeEntriesBulk(submittedEntries);
        } else {
            await deleteTimeEntriesForDate(targetUserId, date);
            if (submittedEntries.length > 0) {
                await addTimeEntriesBulk(submittedEntries);
            }
        }
        loadData(true);
    } catch (e: any) {
        console.error(e);
        alert("Chyba při ukládání: " + (e.message || "Neznámá chyba. Pokud se jedná o 'attachment_url', spusťte SQL příkaz v Supabase."));
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!canEdit) {
      alert("Nelze mazat záznamy v uzamčeném výkazu.");
      return;
    }
    try {
        await deleteTimeEntry(id);
        setEntries(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
        alert("Chyba při mazání: " + e.message);
    }
  };

  const handleEditDay = (date: string) => {
    if (!canEdit) {
      alert("Nelze upravovat záznamy v uzamčeném výkazu.");
      return;
    }
    setEditingDate(date);
    setIsEntryModalOpen(true);
  };

  const handleOpenManualEntry = () => {
    if (!canEdit) {
      alert("Nelze přidávat záznamy do uzamčeného výkazu.");
      return;
    }
    setEditingDate(new Date().toISOString().split('T')[0]);
    setIsEntryModalOpen(true);
  };

  const handleStatusUpdate = async (newStatus: TimesheetStatus, comment?: string) => {
    const updatedReport: MonthStatus = {
        employeeId: targetUserId,
        month: selectedMonth,
        status: newStatus,
        managerComment: comment
    };
    
    setMonthStatus(prev => ({ ...prev, ...updatedReport }));
    
    setMonthlyReports(prev => {
        const idx = prev.findIndex(r => r.employeeId === targetUserId);
        if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...updatedReport };
            return copy;
        } else {
            return [...prev, updatedReport];
        }
    });

    try {
        await upsertMonthlyReport(updatedReport);
        
        if (newStatus === TimesheetStatus.REJECTED) {
            await createNotification(targetUserId, `Váš výkaz za ${selectedMonth} byl vrácen k opravě. Důvod: ${comment}`, 'error', currentUser.id);
        } else if (newStatus === TimesheetStatus.APPROVED) {
            await createNotification(targetUserId, `Váš výkaz za ${selectedMonth} byl schválen.`, 'success', currentUser.id);
        }

        if (newStatus === TimesheetStatus.REJECTED && targetUser.email) {
            const subject = `Vrácení výkazu k opravě - ${selectedMonth}`;
            const body = `Dobrý den,\n\nVáš výkaz práce za období ${selectedMonth} byl vrácen k přepracování.\n\nDůvod vrácení:\n${comment || 'Bez komentáře'}\n\nProsím o úpravu a opětovné odeslání.\n\nS pozdravem,\n${currentUser.name}`;
            window.location.href = `mailto:${targetUser.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }

    } catch (e: any) {
        console.error("Failed to save report status:", e);
        alert("Chyba při ukládání stavu výkazu: " + e.message);
    }
  };

  const handleMarkRead = async (id: string) => {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllRead = async () => {
      await markAllNotificationsAsRead(currentUserId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // --- MESSAGING LOGIC ---
  const handleOpenMessage = (recipientId: string, recipientName: string) => {
      setMessageRecipientId(recipientId);
      setMessageRecipientName(recipientName);
      setIsMessageModalOpen(true);
  };

  const handleContactManager = () => {
      const manager = employees.find(e => e.role === 'Manager' && e.id !== SUPPORT_ID);
      if (manager) {
          handleOpenMessage(manager.id, manager.name);
      } else {
          alert('V systému není nastaven žádný manažer.');
      }
  };

  const handleContactSupport = () => {
      handleOpenMessage(SUPPORT_ID, 'Win3 Support');
      setIsAboutOpen(false);
  };

  const handleServiceLogin = () => {
      // Trigger PIN modal for support ID
      const supportUser = employees.find(e => e.id === SUPPORT_ID);
      if (supportUser) {
          handleRequestSwitchUser(SUPPORT_ID);
          setIsAboutOpen(false);
      } else {
          alert('Servisní účet nenalezen. Restartujte aplikaci.');
      }
  };

  const handleSendMessage = async (text: string) => {
      try {
          const formattedMessage = `Zpráva od ${currentUser.name}: ${text}`;
          await createNotification(messageRecipientId, formattedMessage, 'info', currentUser.id);
          alert('Zpráva odeslána.');
      } catch (e) {
          alert('Chyba při odesílání.');
      }
  };

  // Admin Handlers
  const handleAddEmployee = async (emp: Employee) => {
      try { await addEmployee(emp); loadData(true); } catch (e: any) { alert("Chyba: " + e.message); }
  };
  const handleUpdateEmployee = async (emp: Employee) => {
      try { await updateEmployee(emp); loadData(true); } catch (e: any) { alert("Chyba: " + e.message); }
  };
  const handleToggleEmployeeStatus = async (id: string, isActive: boolean) => {
      try { await updateEmployeeStatus(id, isActive); loadData(true); } catch (e: any) { alert("Chyba: " + e.message); }
  };
  const handleAddJob = async (job: Job) => {
      try { await addJob(job); loadData(true); } catch (e: any) { alert("Chyba: " + e.message); }
  };
  const handleToggleJobStatus = async (id: string, isActive: boolean) => {
      try { await updateJobStatus(id, isActive); loadData(true); } catch (e: any) { alert("Chyba: " + e.message); }
  };
  const handleSaveCredentials = () => {
      if (!manualSupabaseUrl || !manualSupabaseKey) { alert("Vyplňte prosím obě pole."); return; }
      saveCredentialsManually(manualSupabaseUrl, manualSupabaseKey);
  };
  const handleStartPresentation = (type: PresentationType) => {
      setPresentationMode(type);
  };

  if (presentationMode) {
      return <PresentationMode type={presentationMode} onClose={() => setPresentationMode(null)} />;
  }

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6]">
              <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h2 className="text-gray-700 font-semibold">Načítám data...</h2>
              </div>
          </div>
      );
  }

  // Modified Error / Config screen for non-Demo mode failure
  if (!isLoading && employees.length === 0 && !CREDENTIALS.IS_DEMO_MODE) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f3f4f6] p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Chyba připojení</h2>
            <p className="text-gray-600 mb-6">Nepodařilo se načíst data. Zkontrolujte připojení k internetu.</p>
            <div className="flex gap-4">
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Zkusit znovu</button>
                <button onClick={() => setIsAboutOpen(true)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg">O Aplikaci</button>
            </div>
            
            <div className="mt-8 pt-8 border-t border-gray-300 w-full max-w-md">
                <h3 className="font-bold mb-4">Ruční konfigurace připojení</h3>
                <input 
                    className="w-full p-2 border rounded mb-2" 
                    placeholder="Supabase URL" 
                    value={manualSupabaseUrl} 
                    onChange={e => setManualSupabaseUrl(e.target.value)}
                />
                <input 
                    className="w-full p-2 border rounded mb-4" 
                    placeholder="Supabase Anon Key" 
                    value={manualSupabaseKey} 
                    onChange={e => setManualSupabaseKey(e.target.value)}
                />
                <button onClick={handleSaveCredentials} className="w-full py-2 bg-gray-700 text-white rounded">Uložit konfiguraci</button>
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f3f4f6]">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        installPrompt={installPrompt}
        onInstall={handleInstallClick}
        currentUser={currentUser} 
        employees={activeEmployees} 
        onRequestSwitchUser={handleRequestSwitchUser} 
        onShowAbout={() => setIsAboutOpen(true)}
        onContactManager={handleContactManager}
        onlineUserIds={onlineUserIds} // Pass online users
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
                <span className="text-[9px] text-slate-400">v1.4.0</span>
             </div>
             <span className="text-[10px] text-indigo-300 font-bold leading-none">DOCHÁZKA</span>
           </div>
        </button>
        <div className="flex items-center gap-2">
           <NotificationBell 
                notifications={notifications} 
                onMarkAsRead={handleMarkRead} 
                onMarkAllAsRead={handleMarkAllRead} 
           />
           <div className="flex items-center gap-2 bg-slate-800 rounded-full pl-1 pr-3 py-1 border border-slate-700 relative">
              <div className="relative">
                  <img src={currentUser.avatar} className="w-6 h-6 rounded-full" alt="User" />
                  {onlineUserIds.has(currentUser.id) && <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-slate-800"></div>}
              </div>
              <select 
                value={currentUserId}
                onChange={(e) => handleRequestSwitchUser(e.target.value)} 
                className="bg-transparent text-white text-xs font-medium border-none focus:ring-0 p-0 max-w-[100px] truncate cursor-pointer outline-none"
              >
                {activeEmployees.map(emp => (
                  <option key={emp.id} value={emp.id} className="text-black">{emp.name}</option>
                ))}
              </select>
           </div>
        </div>
      </div>

      <main className="flex-1 p-0 overflow-y-auto flex flex-col h-screen md:h-auto">
        
        {/* DEMO MODE BANNER */}
        {CREDENTIALS.IS_DEMO_MODE && (
            <div className="bg-orange-500 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                ZKUŠEBNÍ REŽIM - DATA SE NEUKLÁDAJÍ
            </div>
        )}

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
             <button 
                onClick={() => setReviewingUserId(null)}
                className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-50 transition-colors"
             >
                Ukončit náhled
             </button>
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
          <ApprovalWorkflow 
            status={monthStatus} 
            onUpdateStatus={handleStatusUpdate}
            isManagerMode={isManagerMode} 
            validationIssues={validationIssues}
          />
        )}

        <div className="max-w-6xl mx-auto w-full px-4 md:px-8 pb-24 md:pb-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 mt-4 md:mt-0">
            <div className="w-full sm:w-auto">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === 'overview' && `Denní přehled: ${targetUser.name}`}
                {activeTab === 'report' && 'Reporty & Export'}
                {activeTab === 'settings' && 'Admin & Nastavení'}
              </h2>
              
              {activeTab === 'overview' && (
                <div className="flex items-center gap-2 mt-3 bg-white p-1 rounded-lg border border-gray-300 shadow-sm w-fit">
                   <button 
                      onClick={() => changeMonth(-1)}
                      className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
                   >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                   </button>
                   
                   <input 
                      type="month" 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="border-none focus:ring-0 text-sm font-semibold text-gray-800 bg-transparent outline-none cursor-pointer py-1"
                   />
                   
                   <button 
                      onClick={() => changeMonth(1)}
                      className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
                   >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                   </button>
                </div>
              )}
            </div>
            
            {/* Desktop Notification Bell & Manager Badge */}
            <div className="hidden md:flex items-center gap-4">
                <NotificationBell 
                    notifications={notifications} 
                    onMarkAsRead={handleMarkRead} 
                    onMarkAllAsRead={handleMarkAllRead} 
                />
                
                {activeTab === 'overview' && isManagerMode && !reviewingUserId && (
                <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-md text-xs font-bold border border-purple-200 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    MANAŽERSKÝ PŘÍSTUP
                </div>
                )}
            </div>
          </div>

          {activeTab === 'overview' && (
            <>
              {isManagerMode && !reviewingUserId && (
                <TeamOverview 
                  employees={activeEmployees}
                  allEntries={entries}
                  selectedMonth={selectedMonth}
                  onInspect={setReviewingUserId}
                  currentUserRole={currentUser.role}
                  reports={monthlyReports}
                  onMessage={handleOpenMessage}
                  onlineUserIds={onlineUserIds} // Pass online state
                />
              )}

              {canEdit && (
                 <SmartInput 
                    onEntriesAdded={handleAddEntries} 
                    currentUserId={targetUserId}
                    onManualEntry={handleOpenManualEntry}
                    onCopyLastDay={handleCopyLastDay}
                    lastActiveDay={lastActiveDay}
                    selectedMonth={selectedMonth}
                    existingEntries={monthlyUserEntries}
                 />
              )}

              {isStatusLocked && !canEdit && !isGlobalLocked && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                   <span className="font-medium text-sm">Měsíc je uzamčen. Editace není povolena.</span>
                </div>
              )}
              
              <div className="mb-8">
                <Dashboard entries={monthlyUserEntries} selectedMonth={selectedMonth} />
              </div>

              <ValidationStatus issues={validationIssues} />

              <h3 className="text-lg font-semibold text-gray-800 mb-4">Záznamy ({selectedMonth}) - {targetUser.name}</h3>
              <TimesheetTable 
                entries={monthlyUserEntries} 
                onDelete={handleDeleteEntry} 
                onEdit={handleEditDay}
                isLocked={isStatusLocked}
                canEdit={canEdit}
              />
            </>
          )}

          {activeTab === 'report' && (
             <div className="space-y-8">
                <ReportingModule 
                  entries={isManagerMode ? entries : allUserEntries} 
                  employees={employees}
                  currentUserRole={currentUser.role}
                  jobs={jobs}
                />
             </div>
          )}

          {activeTab === 'settings' && isManagerMode && (
            <div className="space-y-6">
               <AdminPanel 
                  employees={employees}
                  onAddEmployee={handleAddEmployee}
                  onUpdateEmployee={handleUpdateEmployee}
                  onToggleEmployeeStatus={handleToggleEmployeeStatus}
                  jobs={jobs}
                  onAddJob={handleAddJob}
                  onToggleJobStatus={handleToggleJobStatus}
                  currentUser={currentUser}
                  onStartPresentation={handleStartPresentation}
               />
            </div>
          )}

        </div>
      </main>
      
      <HelpSystem />
      <AboutModal 
        isOpen={isAboutOpen} 
        onClose={() => setIsAboutOpen(false)} 
        onContactDeveloper={handleContactSupport}
        onServiceLogin={handleServiceLogin}
      />
      <UpdatePrompt /> 
      <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} currentUserRole={currentUser.role} />

      <EntryFormModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialDate={editingDate || undefined}
        existingEntries={entriesForEditingDate}
        currentUserId={targetUserId}
        jobs={activeJobs}
        allMonthEntries={monthlyUserEntries}
      />

      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        onSend={handleSendMessage}
        recipientName={messageRecipientName}
        isRecipientOnline={onlineUserIds.has(messageRecipientId)}
      />

      {/* PIN Pad Modal */}
      {pendingUserId && (
          <PinPadModal
            isOpen={isPinModalOpen}
            onClose={() => { setIsPinModalOpen(false); setPendingUserId(null); }}
            onSuccess={handlePinSuccess}
            targetPin={employees.find(e => e.id === pendingUserId)?.pinCode || ''}
            targetUserName={employees.find(e => e.id === pendingUserId)?.name || 'Uživatel'}
          />
      )}
    </div>
  );
};

export default App;
