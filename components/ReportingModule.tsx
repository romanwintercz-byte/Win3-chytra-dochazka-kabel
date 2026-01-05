import React, { useState, useMemo, useEffect } from 'react';
import { TimeEntry, WorkType, Employee, Job } from '../types';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportingModuleProps {
  entries: TimeEntry[];
  employees: Employee[];
  currentUserRole: string;
  jobs: Job[];
  selectedEmployeeId?: string;
  selectedMonth?: string;
}

const ReportingModule: React.FC<ReportingModuleProps> = ({ 
  entries, employees, currentUserRole, jobs, 
  selectedEmployeeId, selectedMonth 
}) => {
  const [activeView, setActiveView] = useState<'stats' | 'documents'>('stats');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>(selectedEmployeeId || 'all');
  const [monthFilter, setMonthFilter] = useState<string>(selectedMonth || new Date().toISOString().substring(0, 7));
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => { if (selectedEmployeeId) setEmployeeFilter(selectedEmployeeId); }, [selectedEmployeeId]);
  useEffect(() => { if (selectedMonth) setMonthFilter(selectedMonth); }, [selectedMonth]);

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Neznámý';
  const isProductiveWork = (type: WorkType) => [WorkType.REGULAR, WorkType.OVERTIME, WorkType.BUSINESS_TRIP].includes(type);

  const projectOptions = useMemo(() => {
    const fromJobs = jobs.filter(j => j.isActive).map(j => j.name);
    const fromEntries = Array.from(new Set(entries.map(e => e.project).filter(p => p)));
    return Array.from(new Set([...fromJobs, ...fromEntries])).sort();
  }, [entries, jobs]);

  const employeeOptions = useMemo(() => employees.filter(e => e.isActive && e.id !== 'win3-support-id').sort((a, b) => a.name.localeCompare(b.name)), [employees]);

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
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, projectFilter, employeeFilter, monthFilter]);

  const entriesWithDocs = useMemo(() => filteredEntries.filter(e => e.attachmentUrl), [filteredEntries]);

  const aggregatedData = useMemo(() => {
      const byProject: Record<string, number> = {};
      let regular = 0, overtime = 0, trips = 0, absence = 0, total = 0;

      filteredEntries.forEach(e => {
          const h = Number(e.hours) || 0;
          if (isProductiveWork(e.type)) {
              const pName = e.project || 'Ostatní';
              byProject[pName] = (byProject[pName] || 0) + h;
              if (e.type === WorkType.OVERTIME) overtime += h;
              else if (e.type === WorkType.BUSINESS_TRIP) trips += h;
              else regular += h;
          } else {
              absence += h;
          }
          total += h;
      });

      return { byProject, regular, overtime, trips, absence, total };
  }, [filteredEntries]);

  const generatePDF = async () => {
    if (filteredEntries.length === 0) return alert("Nejsou k dispozici žádná data pro export.");
    setIsGeneratingPdf(true);
    
    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        let currentFont = 'helvetica';

        const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        };

        // Pokus o fonty (Roboto pro CZ znaky)
        try {
            const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
            const boldUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf';

            const [fontRes, boldRes] = await Promise.all([
                fetch(fontUrl, { cache: 'force-cache' }),
                fetch(boldUrl, { cache: 'force-cache' })
            ]);

            if (fontRes.ok && boldRes.ok) {
                const [fontBytes, boldBytes] = await Promise.all([
                    fontRes.arrayBuffer(),
                    boldRes.arrayBuffer()
                ]);

                doc.addFileToVFS('Roboto-Regular.ttf', arrayBufferToBase64(fontBytes));
                doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
                doc.addFileToVFS('Roboto-Bold.ttf', arrayBufferToBase64(boldBytes));
                doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
                currentFont = 'Roboto';
            }
        } catch (fErr) {
            console.warn("Fallback to Helvetica due to font load error", fErr);
        }

        doc.setFont(currentFont, 'normal');
        const period = monthFilter === 'all' ? 'Celá historie' : monthFilter;
        const empName = employeeFilter !== 'all' ? getEmployeeName(employeeFilter) : 'Všichni zaměstnanci';

        // HEADER
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont(currentFont, 'bold');
        doc.text("MĚSÍČNÍ VÝKAZ PRÁCE", 14, 13);
        doc.setFontSize(8);
        doc.setFont(currentFont, 'normal');
        doc.text("v1.9.12 | Chytrá docházka Win3", 196, 13, { align: 'right' });

        // INFO
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(9);
        doc.text(`Zaměstnanec:`, 14, 28);
        doc.setFont(currentFont, 'bold');
        doc.text(empName, 40, 28);
        doc.setFont(currentFont, 'normal');
        doc.text(`Období:`, 14, 33);
        doc.setFont(currentFont, 'bold');
        doc.text(period, 40, 33);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Vygenerováno: ${new Date().toLocaleString('cs-CZ')}`, 196, 28, { align: 'right' });

        // SOUHRN MĚSÍCE
        autoTable(doc, {
            startY: 38,
            head: [['SOUHRN MĚSÍCE', 'HODINY']],
            body: [
                ['Běžná práce', aggregatedData.regular.toFixed(1)],
                ['Přesčasy', aggregatedData.overtime.toFixed(1)],
                ['Služební cesty', aggregatedData.trips.toFixed(1)],
                ['Absence (dovolená, nemoc...)', aggregatedData.absence.toFixed(1)],
                [{ content: 'CELKEM K VÝPLATĚ', styles: { fontStyle: 'bold' } }, { content: aggregatedData.total.toFixed(1), styles: { fontStyle: 'bold' } }]
            ],
            theme: 'grid',
            styles: { font: currentFont, fontSize: 7, cellPadding: 1.5 },
            headStyles: { fillColor: [79, 70, 229], textColor: 255 },
            columnStyles: { 1: { cellWidth: 15, halign: 'right' } },
            margin: { left: 14, right: 14 }
        });

        // PROJEKTY
        const projectRows = Object.entries(aggregatedData.byProject).map(([name, hours]) => [name.substring(0, 70), Number(hours).toFixed(1)]);
        if (projectRows.length > 0) {
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.cursor.y + 5,
                head: [['ROZPIS PODLE PROJEKTŮ / ZAKÁZEK', 'HODINY']],
                body: projectRows,
                theme: 'grid',
                styles: { font: currentFont, fontSize: 7, cellPadding: 1.5 },
                headStyles: { fillColor: [51, 65, 85], textColor: 255 },
                columnStyles: { 1: { cellWidth: 15, halign: 'right' } },
                margin: { left: 14, right: 14 }
            });
        }

        // DENNÍ VÝPIS
        const dailyData: Record<string, { projects: string[], hours: number }> = {};
        filteredEntries.forEach(e => {
            if (!dailyData[e.date]) dailyData[e.date] = { projects: [], hours: 0 };
            const desc = e.project || e.type;
            if (!dailyData[e.date].projects.includes(desc)) dailyData[e.date].projects.push(desc);
            dailyData[e.date].hours += Number(e.hours);
        });

        const logRows = Object.entries(dailyData).sort().map(([date, data]) => {
            const parts = date.split('-');
            return [`${parts[2]}.${parts[1]}.`, data.projects.join(', ').substring(0, 80), data.hours.toFixed(1)];
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.cursor.y + 5,
            head: [['DATUM', 'ČINNOST / PROJEKT', 'HOD']],
            body: logRows,
            theme: 'striped',
            styles: { font: currentFont, fontSize: 6.5, cellPadding: 1.2 },
            headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 15 }, 2: { cellWidth: 10, halign: 'right' } },
            margin: { left: 14, right: 14, bottom: 25 },
            didDrawPage: (data) => {
                const ph = doc.internal.pageSize.height;
                doc.setDrawColor(220);
                doc.line(14, ph - 18, 70, ph - 18);
                doc.line(140, ph - 18, 196, ph - 18);
                doc.setFontSize(6);
                doc.setTextColor(160);
                doc.text("Podpis zaměstnance", 14, ph - 14);
                doc.text("Podpis nadřízeného", 140, ph - 14);
                doc.text(`Strana ${data.pageNumber}`, 105, ph - 8, { align: 'center' });
            }
        });

        doc.save(`Vykaz_${empName.replace(/\s+/g, '_')}_${period}.pdf`);
    } catch (e) {
        console.error("Fatal PDF Error:", e);
        alert("Generování PDF selhalo. Pravděpodobně chybí knihovna jspdf v import mapě. Zkuste tlačítko Opravit v úvodním loaderu.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Filtry a export</h3>
                <button 
                  onClick={generatePDF} 
                  disabled={isGeneratingPdf}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                    {isGeneratingPdf ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    )}
                    Exportovat do PDF
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Období</label>
                    <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-slate-900 bg-white">
                        <option value="all">Celá historie</option>
                        {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Projekt</label>
                    <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-slate-900 bg-white">
                        <option value="all">Všechny projekty</option>
                        {projectOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Zaměstnanec</label>
                    <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-slate-900 bg-white">
                        <option value="all">Všichni zaměstnanci</option>
                        {employeeOptions.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                </div>
            </div>
        </div>

        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button onClick={() => setActiveView('stats')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeView === 'stats' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Statistiky</button>
            <button onClick={() => setActiveView('documents')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeView === 'documents' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Doklady <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{entriesWithDocs.length}</span></button>
        </div>

        {activeView === 'stats' && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Práce</p>
                    <p className="text-2xl font-bold text-indigo-600">{aggregatedData.regular.toFixed(1)} h</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Přesčas</p>
                    <p className={`text-2xl font-bold ${aggregatedData.overtime > 0 ? 'text-orange-600' : 'text-slate-900'}`}>{aggregatedData.overtime.toFixed(1)} h</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Absence</p>
                    <p className="text-2xl font-bold text-slate-400">{aggregatedData.absence.toFixed(1)} h</p>
                </div>
                <div className="bg-indigo-600 p-4 rounded-xl shadow-lg border border-indigo-700 text-white">
                    <p className="text-xs text-indigo-100 uppercase font-bold mb-1">Celkem fond</p>
                    <p className="text-2xl font-bold">{aggregatedData.total.toFixed(1)} h</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-gray-500 font-bold uppercase tracking-wider text-[10px]">Datum</th>
                            <th className="px-4 py-2 text-left text-gray-500 font-bold uppercase tracking-wider text-[10px]">Projekt / Činnost</th>
                            <th className="px-4 py-2 text-right text-gray-500 font-bold uppercase tracking-wider text-[10px]">Hodiny</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredEntries.length === 0 ? (
                            <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">Žádné záznamy pro tento filtr.</td></tr>
                        ) : filteredEntries.map(e => (
                            <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{new Date(e.date).toLocaleDateString('cs-CZ')}</td>
                                <td className="px-4 py-2 font-medium text-slate-900">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${isProductiveWork(e.type) ? 'bg-indigo-500' : 'bg-slate-300'}`}></span>
                                        {e.project || e.type}
                                    </div>
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">{Number(e.hours).toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        )}

        {activeView === 'documents' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {entriesWithDocs.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                        Nenalezeny žádné přílohy.
                    </div>
                ) : entriesWithDocs.map(e => (
                    <a key={e.id} href={e.attachmentUrl} target="_blank" rel="noopener noreferrer" className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="aspect-[3/4] bg-slate-100 rounded-lg mb-3 overflow-hidden border border-slate-200 relative">
                             <img src={e.attachmentUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Doklad" />
                             <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                 <span className="bg-white text-slate-900 px-3 py-1.5 rounded-full font-bold text-xs">Zobrazit detail</span>
                             </div>
                        </div>
                        <div className="text-xs text-slate-500 font-bold uppercase">{new Date(e.date).toLocaleDateString('cs-CZ')}</div>
                        <div className="text-sm font-bold text-slate-900 mt-1">{e.type}</div>
                        <div className="text-xs text-slate-400 mt-1 truncate">{e.description || 'Bez popisu'}</div>
                    </a>
                ))}
            </div>
        )}
    </div>
  );
};

export default ReportingModule;