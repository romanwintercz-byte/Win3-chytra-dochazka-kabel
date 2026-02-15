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
import PresentationMode from './components/PresentationMode';
import NotificationBell from './components/NotificationBell';
import PinPadModal from './components/PinPadModal'; 
import MonthNavigator from './components/MonthNavigator';
import { TimeEntry, MonthStatus, TimesheetStatus, Employee, Job, Notification } from './types';
import { validateMonth } from './services/validationService';
import { isSupabaseConfigured } from './credentials';
import { MOCK_EMPLOYEES, MOCK_JOBS, MOCK_ENTRIES } from './services/mockData';
import * as db from './services/supabase';

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'settings'>('overview');
  const [useDemoData, setUseDemoData] = useState(!isSupabaseConfigured());
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [entries, setEntries] = useState<TimeEntry[]>(MOCK_ENTRIES);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>(MOCK_EMPLOYEES[1].id);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [reviewingUserId, setReviewingUserId] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{success: boolean, message: string} | null>(null);

  // Načtení reálných dat pokud je Supabase k dispozici
  useEffect(() => {
    if (isSupabaseConfigured()) {
      const loadData = async () => {
        setIsLoading(true);
        const status = await db.checkConnection();
        setDbStatus(status);
        
        if (status.success) {
          try {
            const [empData, jobsData, entriesData] = await Promise.all([
              db.fetchEmployees(),
              db.fetchJobs(),
              db.fetchTimeEntries()
            ]);
            
            if (empData.length > 0) {
              setEmployees(empData);
              setUseDemoData(false);
              // Nastavíme prvního zaměstnance jako aktuálního pokud nejsme v demo módu
              if (currentUserId.includes('worker-')) {
                 setCurrentUserId(empData[0].id);
              }
            }
            if (jobsData.length > 0) setJobs(jobsData);
            if (entriesData.length > 0) setEntries(entriesData);
          } catch (err) {
            console.error("Chyba při stahování dat:", err);
          }
        }
        setIsLoading(false);
      };
      loadData();
    }
  }, []);

  const currentUser = employees.find(e => e.id === currentUserId) || employees[0];
  const targetUserId = reviewingUserId || currentUserId;
  const targetUser = employees.find(e => e.id === targetUserId) || currentUser;
  const isManagerMode = currentUser.role === 'Manager';

  const monthlyUserEntries = useMemo(() => 
    entries.filter(e => e.employeeId === targetUserId && e.date.startsWith(selectedMonth)), 
  [entries, targetUserId, selectedMonth]);

  const validationIssues = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    return validateMonth(monthlyUserEntries, year, month);
  }, [monthlyUserEntries, selectedMonth]);

  const handleRequestSwitchUser = (targetId: string) => {
      const targetEmp = employees.find(e => e.id === targetId);
      if (targetEmp?.pinCode) { 
          setPendingUserId(targetId); 
          setIsPinModalOpen(true); 
      } else {
          setCurrentUserId(targetId);
      }
  };

  const handleAddEntries = async (newEntries: TimeEntry[]) => {
      if (!useDemoData) {
        try {
          await db.addTimeEntriesBulk(newEntries);
        } catch (e) {
          alert("Nepodařilo se uložit do databáze.");
        }
      }
      setEntries(prev => [...prev, ...newEntries]);
  };

  const handleModalSubmit = async (date: string, submittedEntries: TimeEntry[]) => {
      if (!useDemoData) {
        try {
          if (date !== 'BULK_RANGE') {
            await db.deleteTimeEntriesForDate(targetUserId, date);
          }
          await db.addTimeEntriesBulk(submittedEntries);
        } catch (e) {
          alert("Chyba synchronizace s DB.");
        }
      }

      if (date === 'BULK_RANGE') {
          setEntries(prev => [...prev, ...submittedEntries]);
      } else {
          setEntries(prev => [
              ...prev.filter(e => !(e.employeeId === targetUserId && e.date === date)),
              ...submittedEntries
          ]);
      }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!useDemoData) {
      await db.deleteTimeEntry(id);
    }
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Diagnostický proužek - pouze pokud je snaha o připojení */}
      {isSupabaseConfigured() && dbStatus && (
        <div className={`fixed top-0 left-0 right-0 z-[100] text-[10px] py-1 px-4 flex justify-between items-center no-print ${dbStatus.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          <span>
            {dbStatus.success ? '✓ Propojeno se Supabase' : `✗ Chyba připojení: ${dbStatus.message}`}
            {useDemoData && ' (Zobrazují se Demo data)'}
          </span>
          <button onClick={() => setDbStatus(null)} className="opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        currentUser={currentUser} employees={employees.filter(e => e.isActive)}
        onRequestSwitchUser={handleRequestSwitchUser} 
        onShowAbout={() => setIsAboutOpen(true)}
        version="1.9.22"
      />

      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <h1 className="font-bold text-lg">Chytrá docházka</h1>
        <div className="flex items-center gap-3">
            <NotificationBell notifications={[]} onMarkAsRead={()=>{}} onMarkAllAsRead={()=>{}} />
            <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-indigo-400" alt="User" />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto no-print pt-6">
        {isLoading && (
          <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[90] flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bold text-slate-700">Načítám data...</p>
            </div>
          </div>
        )}

        {reviewingUserId && (
          <div className="bg-indigo-600 text-white px-6 py-3 sticky top-0 z-40 flex justify-between items-center shadow-md">
             <div className="font-bold text-sm">Kontrola: {targetUser.name}</div>
             <button onClick={() => setReviewingUserId(null)} className="bg-white text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-bold">ZAVŘÍT</button>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="p-4 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Přehled docházky</h2>
              <MonthNavigator selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
            </div>

            <ApprovalWorkflow status={{month: selectedMonth, status: TimesheetStatus.DRAFT}} onUpdateStatus={()=>{}} isManagerMode={isManagerMode} />
            
            {isManagerMode && !reviewingUserId && (
                <TeamOverview employees={employees} allEntries={entries} selectedMonth={selectedMonth} onInspect={setReviewingUserId} currentUserRole={currentUser.role} reports={[]} onMessage={()=>{}} />
            )}

            <SmartInput onEntriesAdded={handleAddEntries} currentUserId={targetUserId} onManualEntry={() => setIsEntryModalOpen(true)} onCopyLastDay={()=>{}} selectedMonth={selectedMonth} existingEntries={monthlyUserEntries} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2"><Dashboard entries={monthlyUserEntries} selectedMonth={selectedMonth} /></div>
                <div><ValidationStatus issues={validationIssues} /></div>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-4">Výkaz: {targetUser.name}</h3>
            <TimesheetTable entries={monthlyUserEntries} onDelete={handleDeleteEntry} onEdit={() => setIsEntryModalOpen(true)} />
          </div>
        )}

        {activeTab === 'report' && (
           <div className="p-4 md:p-8">
              <ReportingModule entries={entries} employees={employees} currentUserRole={currentUser.role} jobs={jobs} selectedEmployeeId={targetUserId} selectedMonth={selectedMonth} />
           </div>
        )}

        {activeTab === 'settings' && isManagerMode && (
           <div className="p-4 md:p-8"><AdminPanel employees={employees} onAddEmployee={()=>{}} onUpdateEmployee={()=>{}} onToggleEmployeeStatus={()=>{}} jobs={jobs} onAddJob={()=>{}} onToggleJobStatus={()=>{}} currentUser={currentUser} onStartPresentation={()=>{}} /></div>
        )}
      </main>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} onContactDeveloper={()=>{}} onServiceLogin={()=>{}} version="1.9.22" />
      <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} currentUserRole={currentUser.role} />
      <EntryFormModal isOpen={isEntryModalOpen} onClose={() => setIsEntryModalOpen(false)} onSubmit={handleModalSubmit} existingEntries={[]} currentUserId={targetUserId} jobs={jobs} />
      <HelpSystem />
      {isPinModalOpen && pendingUserId && (
          <PinPadModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} onSuccess={() => {setCurrentUserId(pendingUserId); setIsPinModalOpen(false);}} targetPin={employees.find(e=>e.id===pendingUserId)?.pinCode || ""} targetUserName={employees.find(e=>e.id===pendingUserId)?.name || ""} />
      )}
    </div>
  );
};

export default App;