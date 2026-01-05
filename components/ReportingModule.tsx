import React, { useState, useMemo } from 'react';
import { TimeEntry, WorkType, Employee, Job } from '../types';
import { validateMonth } from '../services/validationService';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportingModuleProps {
  entries: TimeEntry[];
  employees: Employee[];
  currentUserRole: string;
  jobs: Job[];
}

const ReportingModule: React.FC<ReportingModuleProps> = ({ entries, employees, currentUserRole, jobs }) => {
  const [activeView, setActiveView] = useState<'stats' | 'documents'>('stats');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().substring(0, 7));
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<{url: string, title: string} | null>(null);

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

  // Filtry: Projekty bereme primárně z číselníku Jobs, pokud je dostupný
  const projectOptions = useMemo(() => {
    const fromJobs = jobs.filter(j => j.isActive).map(j => j.name);
    const fromEntries = Array.from(new Set(entries.map(e => e.project).filter(p => p)));
    return Array.from(new Set([...fromJobs, ...fromEntries])).sort();
  }, [entries, jobs]);

  // Filtry: Zaměstnanci bereme ze seznamu employees
  const employeeOptions = useMemo(() => {
    return employees.filter(e => e.isActive && e.id !== 'win3-support-id').sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  // Filtry: Období - bereme ze záznamů + přidáme aktuální měsíc
  const availableMonths = useMemo(() => {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const months = new Set(entries.map(e => e.date.substring(0, 7)));
      months.add(currentMonth);
      return Array.from(months).sort().reverse();
  }, [entries]);

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

  const currentValidationIssues = useMemo(() => {
      if (monthFilter !== 'all') {
          const [year, month] = monthFilter.split('-');
          return validateMonth(filteredEntries, year, month);
      }
      return [];
  }, [filteredEntries, monthFilter]);

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
        doc.text(`Vygenerováno: ${new Date().toLocaleDateString('cs-CZ')}`, 14, 24);
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

        const projectRows = Object.entries(aggregatedData.byProject).map(([name, s]) => {
            const stats = s as { regular: number; overtime: number; total: number };
            const jobCode = jobs.find(j => j.name === name)?.code || '-';
            return [jobCode, name, stats.regular.toFixed(1), stats.overtime.toFixed(1), stats.total.toFixed(1)];
        });
        
        projectRows.push(['', 'CELKEM', aggregatedData.totalRegularProductive.toFixed(1), aggregatedData.totalOvertime.toFixed(1), (aggregatedData.totalRegularProductive + aggregatedData.totalOvertime).toFixed(1)]);

        // @ts-ignore
        let currentY = doc.lastAutoTable.finalY + 5;
        doc.setFontSize(9);
        doc.text("Soupis zakázek", 14, currentY);

        autoTable(doc, {
            startY: currentY + 2,
            head: [['Kód', 'Zakázka', 'Běžná', 'Přes.', 'Celk.']],
            body: projectRows,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: 50, fontSize: 7, fontStyle: 'bold' },
            styles: { font: 'Roboto', fontSize: 7, cellPadding: 1 },
            columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 35, overflow: 'ellipsize' }, 2: { cellWidth: 15, halign: 'right' }, 3: { cellWidth: 15, halign: 'right' }, 4: { cellWidth: 15, halign: 'right', fontStyle: 'bold' } },
            margin: { left: 14 },
            tableWidth: 95
        });

        const absenceRows = Object.entries(aggregatedData.byType)
            .filter(([type]) => !isProductiveWork(type as WorkType))
            .map(([type, hours]) => [type, (hours as number).toFixed(1)]);
        
        if (absenceRows.length > 0) absenceRows.push(['CELKEM', aggregatedData.totalAbsence.toFixed(1)]);

        doc.text("Soupis absencí", 115, currentY);
        autoTable(doc, {
            startY: currentY + 2,
            head: [['Druh absence', 'Hodiny']],
            body: absenceRows.length > 0 ? absenceRows : [['Žádné absence', '-']],
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: 50, fontSize: 7, fontStyle: 'bold' },
            styles: { font: 'Roboto', fontSize: 7, cellPadding: 1 },
            columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 20, halign: 'right', fontStyle: 'bold' } },
            margin: { left: 115 },
            tableWidth: 80
        });

        // @ts-ignore
        const detailStartY = Math.max(doc.lastAutoTable.finalY, doc.lastAutoTable.finalY) + 8;
        doc.setFontSize(9);
        doc.text("Detailní denní záznamy", 14, detailStartY);

        const dailyGroups = new Map<string, {date: string; projects: Set<string>; descriptions: Set<string>; types: Set<string>; totalHours: number; }>();
        filteredEntries.forEach(e => {
            if (!dailyGroups.has(e.date)) dailyGroups.set(e.date, { date: e.date, projects: new Set(), descriptions: new Set(), types: new Set(), totalHours: 0 });
            const g = dailyGroups.get(e.date)!;
            if (e.project) g.projects.add(e.project);
            if (e.description) g.descriptions.add(e.description);
            g.types.add(e.type);
            g.totalHours += Number(e.hours);
        });

        const tableBody = Array.from(dailyGroups.values())
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(g => [new Date(g.date).toLocaleDateString('cs-CZ'), Array.from(g.projects).join(', ') || '-', Array.from(g.descriptions).join(', '), Array.from(g.types).join(', '), g.totalHours.toFixed(1)]);

        autoTable(doc, {
            startY: detailStartY + 2,
            head: [['Datum', 'Zakázka', 'Popis', 'Typ', 'Hod']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [70, 70, 70], fontSize: 7, cellPadding: 1 },
            styles: { font: 'Roboto', fontSize: 7, cellPadding: 0.8, overflow: 'linebreak' }, 
            columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 60, overflow: 'ellipsize' }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 35 }, 4: { cellWidth: 12, halign: 'right', fontStyle: 'bold' } }
        });

        doc.save(`vykaz_prace_${empName}_${period}.pdf`);
    } catch (e) {
        alert("Chyba při generování PDF.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  const handleExportSummaryCSV = () => {
    const projectLines = Object.entries(aggregatedData.byProject).map(([project, s]) => {
      const stats = s as { regular: number; overtime: number; total: number };
      return `PROJEKT,${project},${stats.regular},${stats.overtime},${stats.total}`;
    });
    const absenceLines = Object.entries(aggregatedData.byType).filter(([type]) => !isProductiveWork(type as WorkType)).map(([type, hours]) => `ABSENCE,${type},,,-,${hours}`);
    const csvContent = ['KATEGORIE,NÁZEV,BĚŽNÉ HODINY,PŘESČAS HODINY,CELKEM HODINY', ...projectLines, '', 'KATEGORIE,TYP ABSENCE,,,HODINY', ...absenceLines, '', `CELKEM,ODPRACOVÁNO,,${aggregatedData.totalRegularProductive},`, `CELKEM,PŘESČASY,,,${aggregatedData.totalOvertime}`, `CELKEM,ABSENCE,,,${aggregatedData.totalAbsence}`, `CELKEM,VŠE,,,${aggregatedData.total}`].join('\n');
    downloadFile(csvContent, 'vykaz_prace_souhrn.csv', 'text/csv;charset=utf-8;');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
      const blob = new Blob([content], { type: type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handlePreSend = async () => {
      await generatePDF();
      handleExportSummaryCSV();
      setIsEmailModalOpen(true);
  };

  return (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Filtry Reportu</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Období</label>
                    <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500">
                        <option value="all">Celá historie</option>
                        {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Projekt</label>
                    <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500">
                        <option value="all">Všechny projekty</option>
                        {projectOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zaměstnanec</label>
                    <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500">
                        <option value="all">Všichni zaměstnanci</option>
                        {employeeOptions.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                </div>
                <div>
                    <button onClick={() => { setProjectFilter('all'); setEmployeeFilter('all'); setMonthFilter('all'); }} className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Vymazat filtry</button>
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
                    <p className={`text-2xl font-bold ${aggregatedData.totalOvertime > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{aggregatedData.totalOvertime.toFixed(1)} h</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Celkem (fond)</p>
                    <p className="text-2xl font-bold text-gray-900">{aggregatedData.total.toFixed(1)} h</p>
                </div>
            </div>

            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                  <h3 className="text-lg font-bold text-indigo-900">Odeslání podkladů</h3>
                  <p className="text-sm text-indigo-700">Vygeneruje PDF a CSV podklady pro účetní.</p>
              </div>
              <button onClick={handlePreSend} disabled={isGeneratingPdf} className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-indigo-700 transition-all font-medium flex items-center gap-2">{isGeneratingPdf ? 'Generuji...' : 'Vygenerovat & Odeslat'}</button>
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
                                <td className="px-4 py-2 text-gray-900">{e.date}</td>
                                <td className="px-4 py-2 font-medium text-gray-800">{e.project || '-'}</td>
                                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.type === WorkType.OVERTIME ? 'text-orange-800 bg-orange-200' : 'text-gray-700 bg-gray-100'}`}>{e.type}</span></td>
                                <td className="px-4 py-2 text-right font-mono font-bold">{Number(e.hours).toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
        )}
        
        {selectedImage && (
            <div className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedImage(null)}>
                <div className="max-w-4xl max-h-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                    <img src={selectedImage.url} alt="Full view" className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl" />
                    <div className="text-white mt-4 font-medium text-lg bg-black/50 px-4 py-2 rounded-full">{selectedImage.title}</div>
                </div>
            </div>
        )}

        {isEmailModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full animate-fade-in text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Podklady staženy</h3>
              <p className="text-sm text-gray-500 mb-6">Soubory byly uloženy do vašeho zařízení. Nyní je zašlete na lucie.winterova@kpusti.cz.</p>
              <button onClick={() => setIsEmailModalOpen(false)} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold">Zavřít</button>
            </div>
          </div>
        )}
    </div>
  );
};

export default ReportingModule;