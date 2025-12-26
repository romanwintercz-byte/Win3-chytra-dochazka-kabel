
import React, { useState } from 'react';
import { CalendarEvent, TimeEntry, WorkType } from '../types';
import { mapCalendarEventsToEntries } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';

// Define the missing props interface
interface CalendarIntegrationProps {
  existingEntries: TimeEntry[];
  onEntriesAdded: (entries: TimeEntry[]) => void;
  currentUserId: string;
}

const getRecentDates = () => {
    const today = new Date();
    return Array.from({ length: 5 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        return d.toISOString().split('T')[0];
    });
};

const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({ existingEntries, onEntriesAdded, currentUserId }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());

  const handleConnect = () => {
    const dates = getRecentDates();
    const mockEvents: CalendarEvent[] = [
        { id: '1', title: 'Porada: Rozpracování zakázek', start: `${dates[0]}T09:00:00`, end: `${dates[0]}T10:00:00`, isImported: false },
        { id: '2', title: 'Stavba: Kontrola sádrokartonů', start: `${dates[1]}T10:30:00`, end: `${dates[1]}T14:30:00`, isImported: false },
        { id: '3', title: 'Administrativa a fakturace', start: `${dates[2]}T08:00:00`, end: `${dates[2]}T12:00:00`, isImported: false },
    ];
    
    setTimeout(() => {
        setIsConnected(true);
        setEvents(mockEvents);
        setSelectedEventIds(new Set(mockEvents.map(e => e.id)));
    }, 800);
  };

  const toggleEventSelection = (id: string) => {
      const newSet = new Set(selectedEventIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedEventIds(newSet);
  };

  const handleSync = async () => {
      if (selectedEventIds.size === 0) return;
      setIsProcessing(true);
      try {
          const eventsToProcess = events.filter(e => selectedEventIds.has(e.id));
          const distinctProjects = Array.from(new Set(existingEntries.map(e => e.project))) as string[];
          const parsedEntries = await mapCalendarEventsToEntries(eventsToProcess, distinctProjects);
          
          const newEntries: TimeEntry[] = parsedEntries.map(item => ({
              id: uuidv4(),
              employeeId: currentUserId,
              date: item.date || new Date().toISOString().split('T')[0],
              project: item.project || 'Ostatní',
              description: item.description || 'Import z kalendáře',
              hours: item.hours || 0,
              type: item.type || WorkType.REGULAR
          }));

          onEntriesAdded(newEntries);
          setEvents(prev => prev.map(e => selectedEventIds.has(e.id) ? { ...e, isImported: true } : e));
          setSelectedEventIds(new Set());
      } catch (error) {
          console.error(error);
          alert("Chyba při synchronizaci.");
      } finally {
          setIsProcessing(false);
      }
  };

  if (!isConnected) {
      return (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center animate-fade-in">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Propojení s Kalendářem</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">Importujte události a nechte AI automaticky vytvořit váš denní výkaz.</p>
              <button onClick={handleConnect} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2 shadow-lg shadow-indigo-200">Propojit Google Calendar</button>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Události v kalendáři</h3>
                <button onClick={handleSync} disabled={selectedEventIds.size === 0 || isProcessing} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedEventIds.size === 0 || isProcessing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                    {isProcessing ? 'Zpracovávám...' : `Importovat vybrané (${selectedEventIds.size})`}
                </button>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                                <input type="checkbox" checked={selectedEventIds.size === events.filter(e => !e.isImported).length && events.length > 0} onChange={() => setSelectedEventIds(selectedEventIds.size > 0 ? new Set() : new Set(events.filter(e => !e.isImported).map(e => e.id)))} className="rounded text-indigo-600 focus:ring-indigo-500" />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Událost</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum / Čas</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {events.map(event => (
                            <tr key={event.id} className={event.isImported ? 'bg-gray-50 opacity-60' : 'hover:bg-indigo-50'}>
                                <td className="px-6 py-4">
                                    {!event.isImported && <input type="checkbox" checked={selectedEventIds.has(event.id)} onChange={() => toggleEventSelection(event.id)} className="rounded text-indigo-600 focus:ring-indigo-500" />}
                                </td>
                                <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{event.title}</div></td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(event.start).toLocaleDateString('cs-CZ')} | {new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default CalendarIntegration;
