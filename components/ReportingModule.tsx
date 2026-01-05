import React, { useState, useMemo, useEffect } from 'react';
import { TimeEntry, WorkType, Employee, Job } from '../types';
import { validateMonth } from '../services/validationService';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportingModuleProps {
  entries: TimeEntry[];
  employees: Employee[];
  currentUserRole: string;
  jobs: Job[];
  selectedEmployeeId?: string; // Globálně vybraný zaměstnanec (z App.tsx)
  selectedMonth?: string;      // Globálně vybraný měsíc (z App.tsx)
}

const ReportingModule: React.FC<ReportingModuleProps> = ({ 
  entries, employees, currentUserRole, jobs, 
  selectedEmployeeId, selectedMonth 
}) => {
  const [activeView, setActiveView] = useState<'stats' | 'documents'>('stats');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>(selectedEmployeeId || 'all');
  const [monthFilter, setMonthFilter] = useState<string>(selectedMonth || new Date().toISOString().substring(0, 7));
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<{url: string, title: string} | null>(null);

  // Synchronizace filtrů s globálním výběrem
  useEffect(() => {
    if (selectedEmployeeId) {
      setEmployeeFilter(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (selectedMonth) {
      setMonthFilter(selectedMonth);
    }
  }, [selectedMonth]);

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name : 'Neznámý';
  };

  const isProductiveWork = (type: WorkType) => {
    return [
      WorkType.REGULAR, 
      WorkType.OVERTIME, 
      WorkType.BUSINESS_TRIP
    ].includes(type);
  };

  const projectOptions = useMemo(() => {
    const fromJobs = jobs.filter(j => j.isActive).map(j => j.name);
    const fromEntries = Array.from(new Set(entries.map(e => e.project).filter(p => p)));
    return Array.from(new Set([...fromJobs, ...fromEntries])).sort();
  }, [entries, jobs]);

  const employeeOptions = useMemo(() => {
    return employees.filter(e => e.isActive && e.id !== 'win3-support-id').sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const availableMonths = useMemo(() => {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const months = new Set(entries.map(e => e.date.substring(0, 7)));
      months.add(currentMonth);
      if (selectedMonth) months.add(selectedMonth);
      return Array.from(months).sort().reverse();
  }, [entries, selectedMonth]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter(entry => {
        const matchesProject = projectFilter === 'all' || entry.project === projectFilter;
        const matchesEmployee = employeeFilter === 'all' || entry.employeeId === employeeFilter;
        const matchesMonth = monthFilter === 'all' || entry.date.startsWith(monthFilter);
        return matchesProject && matchesEmployee && matchesMonth;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, projectFilter, employeeFilter, monthFilter]);

  const entriesWithDocs = useMemo(() => {
      return filteredEntries.filter(e => e.attachmentUrl);
  }, [filteredEntries]);

  const aggregatedData = useMemo(() => {
      const byProject: Record<string, { total: number; regular: number; overtime: number }> = {};
      const byUser: Record<string, number> = {};
      const byType: Record<string, number> = {};
      
      let totalWorked = 0;
      let totalRegularProductive = 0;
      let totalOvertime = 0;
      let totalAbsence = 0;
      let total = 0;

      filteredEntries.forEach(e => {
          const productive = isProductiveWork(e.type);

          if (productive) {
            const pName = e.project || 'Ostatní / Režie';
            if (!byProject[pName]) {
                byProject[pName] = { total: 0, regular: 0, overtime: 0 };
            }
            
            byProject[pName].total += e.hours;
            
            if (e.type === WorkType.OVERTIME) {
                byProject[pName].overtime += e.hours;
                totalOvertime += e.hours;
            } else {
                byProject[pName].regular += e.hours;
                totalRegularProductive += e.hours;
            }

            totalWorked += e.hours;
          } else {
            totalAbsence += e.hours;
          }

          byType[e.type] = (byType[e.type] || 0) + e.hours;
          const empName = getEmployeeName(e.employeeId);
          byUser[empName] = (byUser[empName] || 0) + e.hours;
          total += e.hours;
      });

      return { byProject, byUser, byType, totalWorked, totalRegularProductive, totalOvertime, totalAbsence, total };
  }, [filteredEntries, employees]);

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
        const doc = new jsPDF();
        const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
        const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
        const filename = 'Roboto-Regular.ttf';
        const base64Font = btoa(new Uint8Array(fontBytes).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        doc.addFileToVFS(filename, base64Font);
        doc.addFont(filename, 'Roboto', 'normal');
        doc.setFont('Roboto');

        const period = monthFilter === 'all' ? 'Celá historie' : monthFilter;
        const empName = employeeFilter !== 'all' ? getEmployeeName(employeeFilter) : 'Všichni zaměstnanci';

        doc.setFontSize(14);
        doc.text(`Výkaz práce: ${period}`, 14, 15);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Zaměstnanec: ${empName}`, 14, 20);
        doc.setTextColor(0);

        const summaryData = [
            ['Běžná práce', aggregatedData.totalRegularProductive.toFixed(1)],
            ['Přesčasy', aggregatedData.totalOvertime.toFixed(1)],
            ['Absence', aggregatedData.totalAbsence.toFixed(1)],
            ['CELKEM', aggregatedData.total.toFixed(1)]
        ];

        autoTable(doc, {
            startY: 28,
            head: [['Souhrn', 'Hod']],
            body: summaryData,
            theme: 'plain',
            headStyles: { fontSize: 8, fontStyle: 'bold' },
            styles: { font: 'Roboto', fontSize: 8, cellPadding: 1 },
            columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 20, fontStyle: 'bold', halign: 'right' } },
            margin: { left: 14 }
        });

        doc.save(`vykaz_prace_${empName}_${period}.pdf`);
    } catch (e) {
        alert("Chyba při generování PDF.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  const handlePreSend = async () => {
      await generatePDF();
      setIsEmailModalOpen(true);
  };

  return (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Filtry Reportu</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Období</label>
                    <select 
                      value={monthFilter} 
                      onChange={(e) => setMonthFilter(e.target.value)} 
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 text-slate-900 bg-white"
                    >
                        <option value="all" className="text-slate-900">Celá historie</option>
                        {availableMonths.map(m => <option key={m} value={m} className="text-slate-900">{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Projekt</label>
                    <select 
                      value={projectFilter} 
                      onChange={(e) => setProjectFilter(e.target.value)} 
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 text-slate-900 bg-white"
                    >
                        <option value="all" className="text-slate-900">Všechny projekty</option>
                        {projectOptions.map(p => <option key={p} value={p} className="text-slate-900">{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Zaměstnanec</label>
                    <select 
                      value={employeeFilter} 
                      onChange={(e) => setEmployeeFilter(e.target.value)} 
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 text-slate-900 bg-white"
                    >
                        <option value="all" className="text-slate-900">Všichni zaměstnanci</option>
                        {employeeOptions.map(emp => <option key={emp.id} value={emp.id} className="text-slate-900">{emp.name}</option>)}
                    </select>
                </div>
                <div>
                    <button onClick={() => { setProjectFilter('all'); setEmployeeFilter('all'); setMonthFilter('all'); }} className="w-full px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-bold">Vymazat</button>
                </div>
            </div>
        </div>

        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button onClick={() => setActiveView('stats')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeView === 'stats' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Statistiky</button>
            <button onClick={() => setActiveView('documents')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeView === 'documents' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Doklady <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{entriesWithDocs.length}</span></button>
        </div>

        {activeView === 'stats' && (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Běžně odpracováno</p>
                    <p className="text-2xl font-bold text-indigo-600">{aggregatedData.totalRegularProductive.toFixed(1)} h</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Přesčasy</p>
                    <p className={`text-2xl font-bold ${aggregatedData.totalOvertime > 0 ? 'text-orange-600' : 'text-slate-900'}`}>{aggregatedData.totalOvertime.toFixed(1)} h</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Celkem (fond)</p>
                    <p className="text-2xl font-bold text-slate-900">{aggregatedData.total.toFixed(1)} h</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-gray-500">Datum</th>
                            <th className="px-4 py-2 text-left text-gray-500">Projekt</th>
                            <th className="px-4 py-2 text-left text-gray-500">Typ</th>
                            <th className="px-4 py-2 text-right text-gray-500">Hodiny</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredEntries.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Žádné záznamy pro tento filtr.</td></tr>
                        ) : filteredEntries.map(e => (
                            <tr key={e.id}>
                                <td className="px-4 py-2 text-slate-900">{e.date}</td>
                                <td className="px-4 py-2 font-medium text-slate-800">{e.project || '-'}</td>
                                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.type === WorkType.OVERTIME ? 'text-orange-800 bg-orange-200' : 'text-gray-700 bg-gray-100'}`}>{e.type}</span></td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">{Number(e.hours).toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
        )}
    </div>
  );
};

export default ReportingModule;