
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
  const [useDemoData, setUseDemoData] = useState(true);
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

  const currentUser = employees.find(e => e.id === currentUserId) || MOCK_EMPLOYEES[0];
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

  const handleAddEntries = (newEntries: TimeEntry[]) => {
      setEntries(prev => [...prev, ...newEntries]);
  };

  const handleModalSubmit = (date: string, submittedEntries: TimeEntry[]) => {
      if (date === 'BULK_RANGE') {
          setEntries(prev => [...prev, ...submittedEntries]);
      } else {
          setEntries(prev => [
              ...prev.filter(e => !(e.employeeId === targetUserId && e.date === date)),
              ...submittedEntries
          ]);
      }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <Sidebar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        currentUser={currentUser} employees={employees.filter(e => e.isActive)}
        onRequestSwitchUser={handleRequestSwitchUser} 
        onShowAbout={() => setIsAboutOpen(true)}
        version="1.9.21"
      />

      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <h1 className="font-bold text-lg">Chytrá docházka</h1>
        <div className="flex items-center gap-3">
            <NotificationBell notifications={[]} onMarkAsRead={()=>{}} onMarkAllAsRead={()=>{}} />
            <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-indigo-400" alt="User" />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto no-print">
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
            <TimesheetTable entries={monthlyUserEntries} onDelete={(id)=>setEntries(prev=>prev.filter(e=>e.id!==id))} onEdit={() => setIsEntryModalOpen(true)} />
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

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} onContactDeveloper={()=>{}} onServiceLogin={()=>{}} version="1.9.21" />
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
