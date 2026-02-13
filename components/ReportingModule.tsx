
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

// Interface for aggregated stats to resolve TypeScript inference issues
interface AggregatedStats {
  byProject: Record<string, number>;
  regular: number;
  overtime: number;
  trips: number;
  vacation: number;
  holiday: number;
  absence: number;
  total: number;
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

  // Use explicit AggregatedStats type for the useMemo result to prevent TypeScript 'unknown' errors
  const aggregatedData = useMemo<AggregatedStats>(() => {
      const byProject: Record<string, number> = {};
      let regular = 0, overtime = 0, trips = 0, vacation = 0, holiday = 0, absence = 0, total = 0;

      filteredEntries.forEach(e => {
          const h = Number(e.hours) || 0;
          if (isProductiveWork(e.type)) {
              const pName = e.project || 'Ostatní';
              byProject[pName] = (byProject[pName] || 0) + h;
              if (e.type === WorkType.OVERTIME) overtime += h;
              else if (e.type === WorkType.BUSINESS_TRIP) trips += h;
              else regular += h;
          } else if (e.type === WorkType.VACATION) {
              vacation += h;
          } else if (e.type === WorkType.HOLIDAY) {
              holiday += h;
          } else {
              absence += h;
          }
          total += h;
      });

      return { byProject, regular, overtime, trips, vacation, holiday, absence, total };
  }, [filteredEntries]);

  // --- TISK (A4) ---
  const handlePrint = () => {
    const printMount = document.getElementById('print-mount');
    if (!printMount) return;

    const empName = employeeFilter !== 'all' ? getEmployeeName(employeeFilter) : 'Všichni zaměstnanci';
    const period = monthFilter === 'all' ? 'Všechna období' : monthFilter;

    // Seskupení záznamů podle data pro vícesloupcový denní rozpis (1 řádek = 1 den)
    const dailyAggregation = filteredEntries.reduce((acc, e) => {
        if (!acc[e.date]) {
          acc[e.date] = { work: 0, vacation: 0, holiday: 0, other: 0, total: 0, text: [] };
        }
        const h = Number(e.hours);
        acc[e.date].total += h;
        
        if (e.type === WorkType.VACATION) acc[e.date].vacation += h;
        else if (e.type === WorkType.HOLIDAY) acc[e.date].holiday += h;
        else if (isProductiveWork(e.type)) acc[e.date].work += h;
        else acc[e.date].other += h;

        const activity = `${e.project || e.type}${e.description ? ': ' + e.description : ''}`;
        if (!acc[e.date].text.includes(activity)) acc[e.date].text.push(activity);
        
        return acc;
    }, {} as Record<string, { work: number, vacation: number, holiday: number, other: number, total: number, text: string[] }>);

    const sortedDates = Object.keys(dailyAggregation).sort();

    // Seskupení podle projektů pro účetní
    const projectSummary = filteredEntries.reduce((acc, e) => {
        if (isProductiveWork(e.type)) {
          const pName = e.project || 'Ostatní / Režie';
          acc[pName] = (acc[pName] || 0) + Number(e.hours);
        }
        return acc;
    }, {} as Record<string, number>);

    // Generování HTML pro tisk
    printMount.innerHTML = `
      <div class="print-report">
        <div class="header">
          <div>
            <h1 style="margin:0; font-size:16pt; color:black">MĚSÍČNÍ VÝKAZ PRÁCE</h1>
            <p style="margin:1px 0; font-size:9pt; color:gray">Chytrá docházka Win3</p>
          </div>
          <div style="text-align:right; color:black; font-size:10pt">
            <p style="margin:0"><b>Období:</b> ${period}</p>
            <p style="margin:0"><b>Zaměstnanec:</b> ${empName}</p>
          </div>
        </div>

        <div style="display: flex; gap: 15px; margin-bottom: 5px;">
          <div style="flex: 2;">
            <h2>Podklady pro účetní (Rozpis na zakázky)</h2>
            <table>
              <thead>
                <tr><th>Název zakázky / Kód</th><th class="text-right" style="width:80px">Hodin celkem</th></tr>
              </thead>
              <tbody>
                ${Object.entries(projectSummary).length === 0 ? '<tr><td colspan="2" class="text-center italic">Žádná práce na zakázkách</td></tr>' : 
                  Object.entries(projectSummary).map(([name, hours]) => `
                  <tr>
                    <td>${name}</td>
                    <td class="text-right font-bold">${hours.toFixed(1)}</td>
                  </tr>
                `).join('')}
                <tr style="background:#f0f0f0">
                  <td class="font-bold">ODPRACAVÁNO CELKEM (Výkon)</td>
                  <td class="text-right font-bold">${(aggregatedData.regular + aggregatedData.overtime + aggregatedData.trips).toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="flex: 1;">
            <h2>Souhrnná statistika</h2>
            <table>
              <tbody>
                <tr><td>Běžná práce</td><td class="text-right">${aggregatedData.regular.toFixed(1)} h</td></tr>
                <tr><td>Přesčasy</td><td class="text-right">${aggregatedData.overtime.toFixed(1)} h</td></tr>
                <tr><td>Služební cesty</td><td class="text-right">${aggregatedData.trips.toFixed(1)} h</td></tr>
                <tr><td>Dovolená</td><td class="text-right">${aggregatedData.vacation.toFixed(1)} h</td></tr>
                <tr><td>Svátek</td><td class="text-right">${aggregatedData.holiday.toFixed(1)} h</td></tr>
                <tr><td>Ostatní (Nemoc...)</td><td class="text-right">${aggregatedData.absence.toFixed(1)} h</td></tr>
                <tr class="font-bold" style="background:#eee"><td>FOND CELKEM</td><td class="text-right">${aggregatedData.total.toFixed(1)} h</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <h2>Denní rozpis docházky</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 70px">Datum</th>
              <th>Projekty a popis činnosti</th>
              <th class="col-hours">Práce</th>
              <th class="col-hours">Dov.</th>
              <th class="col-hours">Svátek</th>
              <th class="col-hours">Ost.</th>
              <th class="col-hours" style="background:#e5e7eb">Celkem</th>
            </tr>
          </thead>
          <tbody>
            ${sortedDates.map(date => {
              const d = dailyAggregation[date];
              return `
              <tr>
                <td class="font-bold">${new Date(date).toLocaleDateString('cs-CZ', {day:'2-digit', month:'2-digit', weekday:'short'})}</td>
                <td style="color: #333; font-size: 7pt">${d.text.join('; ')}</td>
                <td class="text-right">${d.work > 0 ? d.work.toFixed(1) : '-'}</td>
                <td class="text-right">${d.vacation > 0 ? d.vacation.toFixed(1) : '-'}</td>
                <td class="text-right">${d.holiday > 0 ? d.holiday.toFixed(1) : '-'}</td>
                <td class="text-right">${d.other > 0 ? d.other.toFixed(1) : '-'}</td>
                <td class="text-right font-bold" style="background:#f3f4f6">${d.total.toFixed(1)}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">Podpis zaměstnance (stvrzuji správnost dat)</div>
          <div class="sig-box">Schválil (za firmu / nadřízený)</div>
        </div>
        <div style="text-align:center; font-size:6pt; color:gray; margin-top:5px;">Vygenerováno systémem Chytrá docházka v1.9.21</div>
      </div>
    `;

    window.print();
  };

  const exportToCSV = () => {
    if (filteredEntries.length === 0) return alert("Nejsou data k exportu.");
    const empName = employeeFilter !== 'all' ? getEmployeeName(employeeFilter) : 'Všichni';
    const period = monthFilter === 'all' ? 'Historie' : monthFilter;
    const BOM = "\uFEFF";
    const headers = ["Datum", "Zaměstnanec", "Projekt", "Činnost", "Hodiny", "Typ"].join(";");
    const rows = filteredEntries.map(e => [
        new Date(e.date).toLocaleDateString('cs-CZ'),
        getEmployeeName(e.employeeId),
        e.project || "",
        e.description || "",
        e.hours.toString().replace('.', ','),
        e.type
    ].join(";"));
    const csvContent = BOM + headers + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Vykaz_${empName.replace(/\s/g, '_')}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in no-print">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Export a tisk reportu</h3>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button 
                      onClick={handlePrint}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Tisk na A4
                    </button>
                    <button 
                      onClick={exportToCSV}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all shadow-lg active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        CSV / Excel
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Období</label>
                    <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-slate-900 bg-white">
                        <option value="all">Celá historie</option>
                        {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Projekt</label>
                    <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-slate-900 bg-white">
                        <option value="all">Všechny projekty</option>
                        {projectOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Zaměstnanec</label>
                    <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-slate-900 bg-white">
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
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-slate-900">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Práce</p>
                    <p className="text-2xl font-bold text-indigo-600">{(aggregatedData.regular + aggregatedData.overtime).toFixed(1)} h</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-slate-900">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Přesčas</p>
                    <p className={`text-2xl font-bold ${aggregatedData.overtime > 0 ? 'text-orange-600' : 'text-slate-900'}`}>{aggregatedData.overtime.toFixed(1)} h</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-slate-900">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Absence</p>
                    <p className="text-2xl font-bold text-slate-400">{aggregatedData.absence.toFixed(1)} h</p>
                </div>
                <div className="bg-indigo-600 p-4 rounded-xl shadow-lg border border-indigo-700 text-white">
                    <p className="text-xs text-indigo-100 uppercase font-bold mb-1">Fond celkem</p>
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
