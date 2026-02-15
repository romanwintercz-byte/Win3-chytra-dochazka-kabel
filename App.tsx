
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
import { isSupabaseConfigured, getConfigurationStatus } from './credentials';
import { MOCK_EMPLOYEES, MOCK_JOBS, MOCK_ENTRIES } from './services/mockData';
import * as db from './services/supabase';

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'settings'>('overview');
  const [useDemoData, setUseDemoData] = useState(!isSupabaseConfigured());
  const [employees, setEmployees] = useState<Employee[]>(isSupabaseConfigured() ? [] : MOCK_EMPLOYEES);
  const [jobs, setJobs] = useState<Job[]>(isSupabaseConfigured() ? [] : MOCK_JOBS);
  const [entries, setEntries] = useState<TimeEntry[]>(isSupabaseConfigured() ? [] : MOCK_ENTRIES);
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
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      if (MOCK_EMPLOYEES.length > 1) setCurrentUserId(MOCK_EMPLOYEES[1].id);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);
      const conn = await db.checkConnection();
      
      if (conn.success) {
        setUseDemoData(false);
        setIsConnected(true);
        try {
          const [empData, jobsData, entriesData] = await Promise.all([
            db.fetchEmployees(),
            db.fetchJobs(),
            db.fetchTimeEntries()
          ]);
          
          setEmployees(empData);
          setJobs(jobsData);
          setEntries(entriesData);

          if (empData.length > 0) {
             const savedUserId = localStorage.getItem('lastUserId');
             const userExists = empData.find(e => e.id === savedUserId);
             setCurrentUserId(userExists ? (savedUserId as string) : empData[0].id);
          }
        } catch (err: any) {
          console.error("Data load failed", err);
          setLoadError(err.message || "Nepodařilo se načíst data z tabulek.");
        }
      } else {
        setLoadError(`Připojení selhalo: ${conn.message}`);
      }
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  useEffect(() => {
    if (currentUserId) localStorage.setItem('lastUserId', currentUserId);
  }, [currentUserId]);

  const currentUser = useMemo(() => {
    const list = useDemoData ? MOCK_EMPLOYEES : employees;
    const found = list.find(e => e.id === currentUserId);
    if (found) return found;
    return list[0] || MOCK_EMPLOYEES[0];
  }, [useDemoData, employees, currentUserId]);

  const targetUserId = reviewingUserId || currentUserId;
  const targetUser = (useDemoData ? MOCK_EMPLOYEES : employees).find(e => e.id === targetUserId) || currentUser;
  const isManagerMode = currentUser.role === 'Manager';

  const monthlyUserEntries = useMemo(() => 
    entries.filter(e => e.employeeId === targetUserId && e.date.startsWith(selectedMonth)), 
  [entries, targetUserId, selectedMonth]);

  const validationIssues = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    return validateMonth(monthlyUserEntries, year, month);
  }, [monthlyUserEntries, selectedMonth]);

  const handleRequestSwitchUser = (targetId: string) => {
      const list = useDemoData ? MOCK_EMPLOYEES : employees;
      const targetEmp = list.find(e => e.id === targetId);
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
        } catch (e: any) {
          alert(`Nepodařilo se uložit do databáze: ${e.message}`);
          return;
        }
      }
      setEntries(prev => [...prev, ...newEntries]);
  };

  const handleModalSubmit = async (date: string, submittedEntries: TimeEntry[]) => {
      if (!useDemoData) {
        try {
          if (editingEntry) {
              await db.deleteTimeEntry(editingEntry.id);
          } else if (date !== 'BULK_RANGE') {
              await db.deleteTimeEntriesForDate(targetUserId, date);
          }
          await db.addTimeEntriesBulk(submittedEntries);
        } catch (e: any) {
          alert(`Chyba synchronizace s DB: ${e.message}`);
          return;
        }
      }

      if (date === 'BULK_RANGE') {
          setEntries(prev => [...prev, ...submittedEntries]);
      } else {
          setEntries(prev => [
              ...prev.filter(e => !(e.employeeId === targetUserId && (editingEntry ? e.id === editingEntry.id : e.date === date))),
              ...submittedEntries
          ]);
      }
      setEditingEntry(undefined);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!useDemoData) {
      try {
        await db.deleteTimeEntry(id);
      } catch (e: any) {
        alert(`Chyba při mazání: ${e.message}`);
        return;
      }
    }
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setIsEntryModalOpen(true);
  };

  const handleOpenManualEntry = () => {
    setEditingEntry(undefined);
    setIsEntryModalOpen(true);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        employees={useDemoData ? MOCK_EMPLOYEES : employees.filter(e => e.isActive)}
        onRequestSwitchUser={handleRequestSwitchUser} 
        onShowAbout={() => setIsAboutOpen(true)}
        version="1.9.26"
        isConnected={isConnected}
      />

      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <h1 className="font-bold text-lg">Chytrá docházka</h1>
        <div className="flex items-center gap-3">
            <NotificationBell notifications={[]} onMarkAsRead={()=>{}} onMarkAllAsRead={()=>{}} />
            <div className="relative group active:scale-95 transition-transform">
                <img src={currentUser.avatar} className="w-9 h-9 rounded-full border-2 border-indigo-500 shadow-lg" alt="User" />
                <select 
                  value={currentUser.id} 
                  onChange={(e) => handleRequestSwitchUser(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer appearance-none"
                >
                  {(useDemoData ? MOCK_EMPLOYEES : employees).filter(e => e.isActive).map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
            </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto no-print">
        {isLoading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[90] flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bold text-slate-700">Synchronizace s databází...</p>
            </div>
          </div>
        )}

        {loadError && (
          <div className="m-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded shadow-sm">
            <p className="font-bold">Chyba načítání dat</p>
            <p className="text-sm">{loadError}</p>
            <button onClick={() => window.location.reload()} className="mt-2 text-xs font-bold underline">Zkusit znovu</button>
          </div>
        )}

        {!useDemoData && employees.length === 0 && !isLoading && !loadError && (
          <div className="p-8 m-8 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
            <p className="text-slate-500 font-medium">Databáze je prázdná nebo nebyla nalezena data.</p>
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
            
            {isManagerMode && !reviewingUserId && employees.length > 0 && (
                <TeamOverview employees={employees} allEntries={entries} selectedMonth={selectedMonth} onInspect={setReviewingUserId} currentUserRole={currentUser.role} reports={[]} onMessage={()=>{}} />
            )}

            <SmartInput onEntriesAdded={handleAddEntries} currentUserId={targetUserId} onManualEntry={handleOpenManualEntry} selectedMonth={selectedMonth} existingEntries={monthlyUserEntries} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2"><Dashboard entries={monthlyUserEntries} selectedMonth={selectedMonth} /></div>
                <div><ValidationStatus issues={validationIssues} /></div>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-4">Výkaz: {targetUser.name}</h3>
            <TimesheetTable entries={monthlyUserEntries} onDelete={handleDeleteEntry} onEdit={handleEditEntry} />
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

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} version="1.9.26" />
      <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} currentUserRole={currentUser.role} />
      <EntryFormModal isOpen={isEntryModalOpen} onClose={() => {setIsEntryModalOpen(false); setEditingEntry(undefined);}} onSubmit={handleModalSubmit} currentUserId={targetUserId} jobs={jobs} initialEntry={editingEntry} />
      <HelpSystem />
      {isPinModalOpen && pendingUserId && (
          <PinPadModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} onSuccess={() => {setCurrentUserId(pendingUserId); setIsPinModalOpen(false);}} targetPin={(employees.find(e=>e.id===pendingUserId) || MOCK_EMPLOYEES.find(e=>e.id===pendingUserId))?.pinCode || ""} targetUserName={(employees.find(e=>e.id===pendingUserId) || MOCK_EMPLOYEES.find(e=>e.id===pendingUserId))?.name || ""} />
      )}
    </div>
  );
};

export default App;
