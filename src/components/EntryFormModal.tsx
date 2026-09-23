import React, { useState, useEffect, useMemo } from 'react';
import { TimeEntry, Job, WorkType, Employee } from '../types';
import { v4 as uuidv4 } from 'uuid';
import DatePickerWithWeekends, { isDateWeekend } from './DatePickerWithWeekends';

interface EntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (date: string, entries: TimeEntry[]) => void;
  currentUserId: string;
  jobs: Job[];
  initialEntries?: TimeEntry[];
  targetUser?: Employee;
}

interface EntryRow {
  id: string;
  project: string;
  type: WorkType;
  startTime: string;
  endTime: string;
  hours: string;
  description: string;
}

type EntryMode = 'single' | 'range';

// Pomocná funkce pro posun času o X minut
const adjustTime = (timeStr: string, deltaMinutes: number): string => {
  if (!timeStr) return '06:30';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '06:30';
  let totalMinutes = h * 60 + m + deltaMinutes;
  if (totalMinutes < 0) totalMinutes = 0;
  if (totalMinutes >= 24 * 60) totalMinutes = 23 * 60 + 59;
  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

// Výpočet čistých hodin řádku s odečtem překryvu s obědovou pauzou
const calculateRowNetHours = (
  start: string, 
  end: string, 
  hasLunch: boolean, 
  lunchStart: string = '11:00', 
  lunchEnd: string = '11:30'
): number => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  
  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  let diff = endMinutes - startMinutes;

  if (hasLunch && lunchStart && lunchEnd) {
    const [lsh, lsm] = lunchStart.split(':').map(Number);
    const [leh, lem] = lunchEnd.split(':').map(Number);
    if (!isNaN(lsh) && !isNaN(lsm) && !isNaN(leh) && !isNaN(lem)) {
      const lStartM = lsh * 60 + lsm;
      const lEndM = leh * 60 + lem;
      const overlapStart = Math.max(startMinutes, lStartM);
      const overlapEnd = Math.min(endMinutes, lEndM);
      if (overlapEnd > overlapStart) {
        diff -= (overlapEnd - overlapStart);
      }
    }
  }

  return Math.max(0, Math.round((diff / 60) * 10) / 10);
};

const getTimeWhenHoursReached = (
  start: string,
  targetHours: number,
  hasLunch: boolean,
  lunchStart: string = '11:00',
  lunchEnd: string = '11:30'
): string => {
  if (!start || targetHours <= 0) return start || '06:30';
  const [sh, sm] = start.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm)) return '06:30';

  const startMinutes = sh * 60 + sm;
  const targetMinutes = Math.round(targetHours * 60);

  if (!hasLunch || !lunchStart || !lunchEnd) {
    const endMinutes = Math.min(23 * 60 + 59, startMinutes + targetMinutes);
    const eh = Math.floor(endMinutes / 60);
    const em = endMinutes % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  }

  const [lsh, lsm] = lunchStart.split(':').map(Number);
  const [leh, lem] = lunchEnd.split(':').map(Number);
  const lStartM = lsh * 60 + lsm;
  const lEndM = leh * 60 + lem;

  let endMinutes = startMinutes;

  if (startMinutes >= lEndM) {
    endMinutes = startMinutes + targetMinutes;
  } else if (startMinutes >= lStartM) {
    endMinutes = lEndM + targetMinutes;
  } else {
    const beforeLunch = lStartM - startMinutes;
    if (beforeLunch >= targetMinutes) {
      endMinutes = startMinutes + targetMinutes;
    } else {
      const remainingMinutes = targetMinutes - beforeLunch;
      endMinutes = lEndM + remainingMinutes;
    }
  }

  endMinutes = Math.min(23 * 60 + 59, Math.max(0, endMinutes));
  const eh = Math.floor(endMinutes / 60);
  const em = endMinutes % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
};

const EntryFormModal: React.FC<EntryFormModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  currentUserId, 
  jobs, 
  initialEntries, 
  targetUser 
}) => {
  const [mode, setMode] = useState<EntryMode>('single');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [skipWeekends, setSkipWeekends] = useState(true);
  
  const [hasWorkHours, setHasWorkHours] = useState(true);
  const [lunchBreak, setLunchBreak] = useState(true);
  const [lunchStart, setLunchStart] = useState('11:00');
  const [lunchEnd, setLunchEnd] = useState('11:30');

  const [rows, setRows] = useState<EntryRow[]>([]);

  const getDefaultJobId = () => {
    if (targetUser?.department) {
      const match = jobs.find(j => j.code === targetUser.department);
      if (match) return match.id;
    }
    return jobs.find(j => j.isActive)?.id || '';
  };

  useEffect(() => {
    if (isOpen) {
      if (initialEntries && initialEntries.length > 0) {
        setMode('single');
        setDate(initialEntries[0].date ? initialEntries[0].date.split('T')[0] : new Date().toISOString().split('T')[0]);

        const firstWithTime = initialEntries.find(e => e.startTime);
        if (firstWithTime?.startTime && firstWithTime?.endTime) {
          setHasWorkHours(true);
          setLunchBreak((firstWithTime.breakMinutes ?? 30) > 0);
          if (firstWithTime.lunchTime && firstWithTime.lunchTime.includes('–')) {
            const [ls, le] = firstWithTime.lunchTime.split('–').map(s => s.trim());
            if (ls && le) {
              setLunchStart(ls);
              setLunchEnd(le);
            }
          }
        } else {
          const isAbsence = initialEntries.every(e => 
            e.type !== WorkType.REGULAR && e.type !== WorkType.OVERTIME
          );
          setHasWorkHours(!isAbsence);
        }

        setRows(initialEntries.map(e => {
          const matchedJob = jobs.find(j => String(j.id) === String(e.project) || j.name === e.project);
          return {
            id: e.id,
            project: matchedJob ? matchedJob.id : e.project,
            type: e.type,
            startTime: e.startTime || '06:30',
            endTime: e.endTime || '15:00',
            hours: String(e.hours),
            description: e.description || ''
          };
        }));
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        const isTodayWk = isDateWeekend(todayStr);
        setMode('single');
        setDate(todayStr);
        setHasWorkHours(true);
        setLunchBreak(true);
        setLunchStart('11:00');
        setLunchEnd('11:30');
        setRows([{
          id: uuidv4(),
          project: getDefaultJobId(),
          type: isTodayWk ? WorkType.OVERTIME : WorkType.REGULAR,
          startTime: '06:30',
          endTime: '15:00',
          hours: '8',
          description: isTodayWk ? 'Víkendová směna (přesčas)' : ''
        }]);
      }
    }
  }, [isOpen, initialEntries, jobs, targetUser]);

  const isWeekendDay = useMemo(() => isDateWeekend(date), [date]);

  const totalHours = useMemo(() => {
    return rows.reduce((sum, row) => sum + (parseFloat(row.hours) || 0), 0);
  }, [rows]);

  const analyzedRows = useMemo(() => {
    let accumulatedRegular = 0;
    const DAILY_LIMIT = isWeekendDay ? 0 : 8;

    return rows.map((r) => {
      const hours = parseFloat(r.hours) || 0;

      if (r.type !== WorkType.REGULAR && r.type !== WorkType.OVERTIME) {
        accumulatedRegular += hours;
        return {
          row: r,
          netHours: hours,
          regHours: hours,
          otHours: 0,
          hasOvertimeSplit: false,
          isPureOvertime: false
        };
      }

      if (r.type === WorkType.OVERTIME) {
        return {
          row: r,
          netHours: hours,
          regHours: 0,
          otHours: hours,
          hasOvertimeSplit: false,
          isPureOvertime: true
        };
      }

      if (hasWorkHours && r.startTime && r.endTime) {
        const net = calculateRowNetHours(r.startTime, r.endTime, lunchBreak, lunchStart, lunchEnd);
        const remainingNeeded = Math.max(0, Math.round((DAILY_LIMIT - accumulatedRegular) * 10) / 10);

        if (remainingNeeded <= 0) {
          return {
            row: r,
            netHours: net,
            regHours: 0,
            otHours: net,
            hasOvertimeSplit: false,
            isPureOvertime: true
          };
        }

        if (net > remainingNeeded) {
          const splitTime = getTimeWhenHoursReached(r.startTime, remainingNeeded, lunchBreak, lunchStart, lunchEnd);
          const regPart = remainingNeeded;
          const otPart = Math.round((net - remainingNeeded) * 10) / 10;
          accumulatedRegular += regPart;

          return {
            row: r,
            netHours: net,
            regHours: regPart,
            otHours: otPart,
            splitTime,
            hasOvertimeSplit: true,
            isPureOvertime: false
          };
        }

        accumulatedRegular += net;
        return {
          row: r,
          netHours: net,
          regHours: net,
          otHours: 0,
          hasOvertimeSplit: false,
          isPureOvertime: false
        };
      } else {
        const remainingNeeded = Math.max(0, Math.round((DAILY_LIMIT - accumulatedRegular) * 10) / 10);
        if (remainingNeeded <= 0) {
          return {
            row: r,
            netHours: hours,
            regHours: 0,
            otHours: hours,
            hasOvertimeSplit: false,
            isPureOvertime: true
          };
        }
        if (hours > remainingNeeded) {
          const regPart = remainingNeeded;
          const otPart = Math.round((hours - remainingNeeded) * 10) / 10;
          accumulatedRegular += regPart;
          return {
            row: r,
            netHours: hours,
            regHours: regPart,
            otHours: otPart,
            hasOvertimeSplit: true,
            isPureOvertime: false
          };
        }

        accumulatedRegular += hours;
        return {
          row: r,
          netHours: hours,
          regHours: hours,
          otHours: 0,
          hasOvertimeSplit: false,
          isPureOvertime: false
        };
      }
    });
  }, [rows, hasWorkHours, lunchBreak, lunchStart, lunchEnd, isWeekendDay]);

  const breakdown = useMemo(() => {
    let regular = 0;
    let overtime = 0;
    let absence = 0;

    for (const a of analyzedRows) {
      if (a.row.type !== WorkType.REGULAR && a.row.type !== WorkType.OVERTIME) {
        absence += a.netHours;
      } else {
        regular += a.regHours;
        overtime += a.otHours;
      }
    }

    return {
      regular: Math.round(regular * 10) / 10,
      overtime: Math.round(overtime * 10) / 10,
      absence: Math.round(absence * 10) / 10,
      total: Math.round((regular + overtime + absence) * 10) / 10
    };
  }, [analyzedRows]);

  if (!isOpen) return null;

  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    let nextStart = '06:30';
    let nextEnd = '15:00';

    if (lastRow?.endTime) {
      if (lunchBreak && lastRow.endTime === lunchStart) {
        nextStart = lunchEnd;
      } else {
        nextStart = lastRow.endTime;
      }
    }

    const currentRegular = analyzedRows.reduce((sum, a) => sum + a.regHours, 0);
    const DAILY_LIMIT = isWeekendDay ? 0 : 8;
    const remainingRegular = Math.max(0, Math.round((DAILY_LIMIT - currentRegular) * 10) / 10);

    if (remainingRegular > 0) {
      nextEnd = getTimeWhenHoursReached(nextStart, Math.min(3, remainingRegular), lunchBreak, lunchStart, lunchEnd);
    } else {
      nextEnd = adjustTime(nextStart, 60);
    }

    const calcHours = calculateRowNetHours(nextStart, nextEnd, lunchBreak, lunchStart, lunchEnd);
    const rowType = remainingRegular <= 0 ? WorkType.OVERTIME : WorkType.REGULAR;

    setRows([...rows, {
      id: uuidv4(),
      project: getDefaultJobId(),
      type: rowType,
      startTime: nextStart,
      endTime: nextEnd,
      hours: String(calcHours || 0),
      description: ''
    }]);
  };

  const updateRow = (id: string, field: keyof EntryRow, value: string) => {
    setRows(rows.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      
      if (field === 'startTime' || field === 'endTime') {
        const s = field === 'startTime' ? value : r.startTime;
        const e = field === 'endTime' ? value : r.endTime;
        const net = calculateRowNetHours(s, e, lunchBreak, lunchStart, lunchEnd);
        updated.hours = String(net);
      }
      return updated;
    }));
  };

  const adjustRowTime = (id: string, field: 'startTime' | 'endTime', delta: number) => {
    setRows(rows.map(r => {
      if (r.id !== id) return r;
      const newTime = adjustTime(r[field], delta);
      const s = field === 'startTime' ? newTime : r.startTime;
      const e = field === 'endTime' ? newTime : r.endTime;
      const net = calculateRowNetHours(s, e, lunchBreak, lunchStart, lunchEnd);
      return {
        ...r,
        [field]: newTime,
        hours: String(net)
      };
    }));
  };

  const stepRowHours = (id: string, delta: number) => {
    setRows(rows.map(r => {
      if (r.id !== id) return r;
      const current = parseFloat(r.hours) || 0;
      const next = Math.max(0, Math.min(24, Math.round((current + delta) * 10) / 10));
      const updated = { ...r, hours: String(next) };
      if (hasWorkHours && r.startTime && r.endTime) {
        updated.endTime = adjustTime(r.endTime, Math.round(delta * 60));
      }
      return updated;
    }));
  };

  const splitRowAtOvertime = (id: string) => {
    setRows(prevRows => {
      const targetIndex = prevRows.findIndex(r => r.id === id);
      if (targetIndex === -1) return prevRows;
      const targetRow = prevRows[targetIndex];

      const analysis = analyzedRows.find(a => a.row.id === id);
      if (!analysis || !analysis.hasOvertimeSplit || !analysis.splitTime) return prevRows;

      const row1: EntryRow = {
        ...targetRow,
        endTime: analysis.splitTime,
        hours: String(analysis.regHours),
        type: WorkType.REGULAR
      };

      const row2: EntryRow = {
        ...targetRow,
        id: uuidv4(),
        startTime: analysis.splitTime,
        endTime: targetRow.endTime,
        hours: String(analysis.otHours),
        type: WorkType.OVERTIME
      };

      const newRows = [...prevRows];
      newRows.splice(targetIndex, 1, row1, row2);
      return newRows;
    });
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const handleLunchChange = (checked: boolean, lStart = lunchStart, lEnd = lunchEnd) => {
    setLunchBreak(checked);
    setLunchStart(lStart);
    setLunchEnd(lEnd);
    setRows(rows.map(r => ({
      ...r,
      hours: String(calculateRowNetHours(r.startTime, r.endTime, checked, lStart, lEnd))
    })));
  };

  const handleSetFullDayAbsence = (type: WorkType, defaultDesc: string) => {
    setHasWorkHours(false);
    setRows([{
      id: uuidv4(),
      project: '',
      type,
      startTime: '',
      endTime: '',
      hours: '8',
      description: defaultDesc
    }]);
  };

  const handleResetStandardShift = () => {
    setHasWorkHours(true);
    setLunchBreak(true);
    setLunchStart('11:00');
    setLunchEnd('11:30');
    setRows([{
      id: uuidv4(),
      project: getDefaultJobId(),
      type: isWeekendDay ? WorkType.OVERTIME : WorkType.REGULAR,
      startTime: '06:30',
      endTime: '15:00',
      hours: '8',
      description: isWeekendDay ? 'Víkendová směna (přesčas)' : ''
    }]);
  };

  const handleAddMissingHours = (type: WorkType, defaultDesc: string) => {
    const currentTotal = rows.reduce((sum, row) => sum + (parseFloat(row.hours) || 0), 0);
    const missing = Math.max(0, 8 - currentTotal);
    if (missing <= 0) return;
    
    const lastRow = rows[rows.length - 1];
    let sTime = lastRow?.endTime || '11:00';
    let eTime = adjustTime(sTime, Math.round(missing * 60));

    setRows([...rows, {
      id: uuidv4(),
      project: '',
      type,
      startTime: sTime,
      endTime: eTime,
      hours: String(missing),
      description: defaultDesc
    }]);
  };

  const isWeekendCheck = (dateObj: Date) => {
    const day = dateObj.getDay();
    return day === 0 || day === 6; 
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validRows = rows.filter(r => (parseFloat(r.hours) || 0) > 0);
    if (validRows.length === 0) {
      alert("Zadejte alespoň jednu činnost s nenulovým počtem hodin.");
      return;
    }

    const processedRows: EntryRow[] = [];

    for (const row of validRows) {
      const analysis = analyzedRows.find(a => a.row.id === row.id);

      if (analysis?.hasOvertimeSplit && hasWorkHours && row.startTime && row.endTime && analysis.splitTime) {
        if (analysis.regHours > 0) {
          processedRows.push({
            ...row,
            endTime: analysis.splitTime,
            hours: String(analysis.regHours),
            type: WorkType.REGULAR
          });
        }
        if (analysis.otHours > 0) {
          processedRows.push({
            ...row,
            id: uuidv4(),
            startTime: analysis.splitTime,
            endTime: row.endTime,
            hours: String(analysis.otHours),
            type: WorkType.OVERTIME
          });
        }
      } else if (analysis?.hasOvertimeSplit && (!hasWorkHours || !analysis.splitTime)) {
        if (analysis.regHours > 0) {
          processedRows.push({
            ...row,
            hours: String(analysis.regHours),
            type: WorkType.REGULAR
          });
        }
        if (analysis.otHours > 0) {
          processedRows.push({
            ...row,
            id: uuidv4(),
            hours: String(analysis.otHours),
            type: WorkType.OVERTIME
          });
        }
      } else if (analysis?.isPureOvertime && row.type === WorkType.REGULAR) {
        processedRows.push({
          ...row,
          id: uuidv4(),
          type: WorkType.OVERTIME,
          hours: String(analysis.otHours || row.hours)
        });
      } else {
        processedRows.push(row);
      }
    }

    const lunchPeriod = hasWorkHours && lunchBreak ? `${lunchStart} – ${lunchEnd}` : undefined;
    const breakMins = hasWorkHours && lunchBreak ? 30 : 0;

    const rowHasLunch = (rowStart?: string, rowEnd?: string) => {
      if (!hasWorkHours || !lunchBreak || !rowStart || !rowEnd || !lunchStart || !lunchEnd) return false;
      const [sh, sm] = rowStart.split(':').map(Number);
      const [eh, em] = rowEnd.split(':').map(Number);
      const [lsh, lsm] = lunchStart.split(':').map(Number);
      const [leh, lem] = lunchEnd.split(':').map(Number);
      if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em) || isNaN(lsh) || isNaN(lsm) || isNaN(leh) || isNaN(lem)) return false;
      const startM = sh * 60 + sm;
      const endM = eh * 60 + em;
      const lStartM = lsh * 60 + lsm;
      const lEndM = leh * 60 + lem;
      return Math.min(endM, lEndM) > Math.max(startM, lStartM);
    };

    if (mode === 'single') {
      const finalEntries: TimeEntry[] = processedRows.map(r => {
        const hasLunch = rowHasLunch(r.startTime, r.endTime);
        return {
          id: r.id,
          employeeId: currentUserId,
          date,
          project: r.project,
          description: r.description,
          hours: parseFloat(r.hours),
          type: r.type,
          startTime: hasWorkHours && r.startTime ? r.startTime : undefined,
          endTime: hasWorkHours && r.endTime ? r.endTime : undefined,
          breakMinutes: hasLunch ? breakMins : 0,
          lunchTime: hasLunch ? lunchPeriod : undefined
        };
      });
      onSubmit(date, finalEntries);
    } else {
      const start = new Date(date);
      const end = new Date(dateTo);
      const bulkEntries: TimeEntry[] = [];
      
      let current = new Date(start);
      while (current <= end) {
        if (!skipWeekends || !isWeekendCheck(current)) {
          const currentStr = current.toISOString().split('T')[0];
          const isCurrWeekend = isWeekendCheck(current);
          
          processedRows.forEach(r => {
            const hasLunch = rowHasLunch(r.startTime, r.endTime);
            const finalType = (isCurrWeekend && r.type === WorkType.REGULAR) 
              ? WorkType.OVERTIME 
              : r.type;

            bulkEntries.push({
              id: uuidv4(),
              employeeId: currentUserId,
              date: currentStr,
              project: r.project,
              description: r.description,
              hours: parseFloat(r.hours),
              type: finalType,
              startTime: hasWorkHours && r.startTime ? r.startTime : undefined,
              endTime: hasWorkHours && r.endTime ? r.endTime : undefined,
              breakMinutes: hasLunch ? breakMins : 0,
              lunchTime: hasLunch ? lunchPeriod : undefined
            });
          });
        }
        current.setDate(current.getDate() + 1);
      }
      
      if (bulkEntries.length > 0) {
        onSubmit('BULK_RANGE', bulkEntries);
      } else {
        alert("V zadaném rozmezí nebyly nalezeny žádné pracovní dny.");
        return;
      }
    }
    
    onClose();
  };

  const missingHours = isWeekendDay ? 0 : Math.max(0, 8 - totalHours);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 sm:p-4 backdrop-blur-sm">
      <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
        
        {/* Hlavička */}
        <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 bg-white shrink-0">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <span>{initialEntries && initialEntries.length > 0 ? '✏️' : '⏱️'}</span>
              <span>{initialEntries && initialEntries.length > 0 ? 'Upravit denní výkaz' : 'Zápis hodin a zakázek'}</span>
            </h3>
            {targetUser && (
              <p className="text-xs text-slate-500 font-medium">
                Zaměstnanec: <strong className="text-slate-800">{targetUser.name}</strong> • Kabel s.r.o.
              </p>
            )}
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-lg"
            aria-label="Zavřít"
          >
            ✕
          </button>
        </div>

        {/* Formulář */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
            
            {/* Výběr režimu Jeden den / Rozmezí */}
            {!initialEntries?.length && (
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setMode('single')}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${mode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Jeden den (více zakázek)
                </button>
                <button 
                  type="button"
                  onClick={() => setMode('range')}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${mode === 'range' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Rozmezí dnů (duplikace)
                </button>
              </div>
            )}

            {/* Výběr data */}
            <div className={`grid gap-3 ${mode === 'range' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <DatePickerWithWeekends
                  id="entry-date"
                  label={mode === 'single' ? 'Datum směny' : 'Od data'}
                  value={date}
                  onChange={setDate}
                  required
                />
              </div>
              {mode === 'range' && (
                <div>
                  <DatePickerWithWeekends
                    id="entry-date-to"
                    label="Do data"
                    value={dateTo}
                    onChange={setDateTo}
                    required
                  />
                </div>
              )}
            </div>

            {mode === 'range' && (
              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <input type="checkbox" id="skipWeekends" checked={skipWeekends} onChange={e => setSkipWeekends(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
                <label htmlFor="skipWeekends" className="text-sm font-bold text-indigo-700 cursor-pointer">Vynechat víkendy</label>
              </div>
            )}

            {/* Sekce: Evidence pracovní doby Od–Do a obědové přestávky */}
            <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚖️</span>
                  <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide">
                    Evidence pracovní doby a oběda (Zákoník práce)
                  </span>
                </div>
                {hasWorkHours ? (
                  <button
                    type="button"
                    onClick={() => setHasWorkHours(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold underline py-1"
                  >
                    Neevidovat časy (pouze hodiny)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetStandardShift}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200"
                  >
                    + Zapnout evidenci časů od–do
                  </button>
                )}
              </div>

              {hasWorkHours ? (
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-700 select-none">
                      <input 
                        type="checkbox" 
                        checked={lunchBreak} 
                        onChange={e => handleLunchChange(e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded"
                      />
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        Zákonná přestávka na oběd (30 min)
                      </span>
                    </label>

                    {lunchBreak && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-semibold">Čas:</span>
                        <input 
                          type="time" 
                          value={lunchStart}
                          onChange={e => handleLunchChange(true, e.target.value, adjustTime(e.target.value, 30))}
                          className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 outline-none"
                        />
                        <span className="text-xs text-slate-400">–</span>
                        <input 
                          type="time" 
                          value={lunchEnd}
                          onChange={e => handleLunchChange(true, lunchStart, e.target.value)}
                          className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 self-center mr-1">Rychlá volba:</span>
                    <button
                      type="button"
                      onClick={handleResetStandardShift}
                      className="text-xs font-bold px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors"
                    >
                      {isWeekendDay ? 'Víkendová směna 6:30 – 15:00' : 'Směna 6:30 – 15:00'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetFullDayAbsence(WorkType.DOCTOR, 'Celodenní vyšetření u lékaře')}
                      className="text-xs font-bold px-2.5 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg text-indigo-700 transition-colors"
                    >
                      Lékař (8h)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetFullDayAbsence(WorkType.VACATION, 'Dovolená')}
                      className="text-xs font-bold px-2.5 py-1.5 bg-white hover:bg-green-50 border border-slate-200 rounded-lg text-green-700 transition-colors"
                    >
                      Dovolená (8h)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetFullDayAbsence(WorkType.SICK_DAY, 'Nemoc')}
                      className="text-xs font-bold px-2.5 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 rounded-lg text-rose-700 transition-colors"
                    >
                      Nemoc (8h)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-1">
                  Evidence časů od–do je vypnuta.
                </div>
              )}
            </div>

            {/* SEZNAM ČINNOSTÍ V TENTO DEN */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-black uppercase text-slate-800 tracking-wider">
                  Zakázky a činnosti dne (lze kombinovat libovolně)
                </h4>
              </div>

              {isWeekendDay && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs">
                  <span className="text-lg">🏖️</span>
                  <div>
                    <strong className="block">Práce o víkendu:</strong>
                    Hodiny se v reportu automaticky započítávají jako přesčas.
                  </div>
                </div>
              )}

              {rows.map((row, idx) => {
                const rowAnalysis = analyzedRows[idx];
                return (
                  <div 
                    key={row.id} 
                    className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-xs space-y-3 relative animate-fade-in"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        <span>Činnost #{idx + 1}</span>
                      </span>
                      {rows.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeRow(row.id)}
                          className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
                          title="Odstranit tuto činnost"
                        >
                          <span>✕</span>
                          <span>Odstranit</span>
                        </button>
                      )}
                    </div>

                    {/* Zakázka */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Zakázka / Projekt firmy Kabel
                      </label>
                      <select 
                        value={row.project} 
                        onChange={e => updateRow(row.id, 'project', e.target.value)} 
                        className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                      >
                        <option value="">-- Bez zakázky (např. lékař, nemoc, dovolená) --</option>
                        {jobs
                          .filter(j => j.isActive || String(j.id) === String(row.project) || j.name === row.project)
                          .map(j => <option key={j.id} value={j.id}>{j.code} - {j.name}</option>)}
                      </select>
                    </div>

                    {/* Čas Od - Do */}
                    {hasWorkHours && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] font-bold uppercase text-slate-500">Čas OD</label>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => adjustRowTime(row.id, 'startTime', -15)}
                                className="h-6 px-1.5 text-[11px] font-bold bg-white hover:bg-slate-200 rounded text-slate-700 border border-slate-200"
                              >
                                -15m
                              </button>
                              <button
                                type="button"
                                onClick={() => adjustRowTime(row.id, 'startTime', 15)}
                                className="h-6 px-1.5 text-[11px] font-bold bg-white hover:bg-slate-200 rounded text-slate-700 border border-slate-200"
                              >
                                +15m
                              </button>
                            </div>
                          </div>
                          <input 
                            type="time" 
                            value={row.startTime} 
                            onChange={e => updateRow(row.id, 'startTime', e.target.value)} 
                            className="w-full h-10 px-3 text-base font-black text-slate-800 bg-white border border-slate-300 rounded-lg outline-none"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] font-bold uppercase text-slate-500">Čas DO</label>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => adjustRowTime(row.id, 'endTime', -30)}
                                className="h-6 px-1.5 text-[11px] font-bold bg-white hover:bg-slate-200 rounded text-slate-700 border border-slate-200"
                              >
                                -30m
                              </button>
                              <button
                                type="button"
                                onClick={() => adjustRowTime(row.id, 'endTime', 30)}
                                className="h-6 px-1.5 text-[11px] font-bold bg-white hover:bg-slate-200 rounded text-slate-700 border border-slate-200"
                              >
                                +30m
                              </button>
                            </div>
                          </div>
                          <input 
                            type="time" 
                            value={row.endTime} 
                            onChange={e => updateRow(row.id, 'endTime', e.target.value)} 
                            className="w-full h-10 px-3 text-base font-black text-slate-800 bg-white border border-slate-300 rounded-lg outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Rozdělení na přesčas při přesahu nad 8h */}
                    {row.type === WorkType.REGULAR && rowAnalysis?.hasOvertimeSplit && (
                      <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="text-orange-900 font-medium">
                          <strong className="text-orange-800">⚡ Přesah nad 8h fond:</strong>{' '}
                          <span>{rowAnalysis.regHours}h běžná</span>
                          <span className="mx-1 text-orange-400">•</span>
                          <strong className="text-orange-700">+{rowAnalysis.otHours}h přesčas</strong>
                        </div>
                        {rowAnalysis.splitTime && (
                          <button
                            type="button"
                            onClick={() => splitRowAtOvertime(row.id)}
                            className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs shrink-0"
                          >
                            ✂️ Rozdělit na 2 řádky (v {rowAnalysis.splitTime})
                          </button>
                        )}
                      </div>
                    )}

                    {/* Hodiny a typ činnosti */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                          Odpracováno hodin {hasWorkHours && <span className="text-[10px] text-indigo-600 font-normal">(přepočteno z Od–Do)</span>}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => stepRowHours(row.id, -0.5)}
                            className="w-10 h-11 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-sm rounded-xl transition-colors shrink-0"
                          >
                            -0.5
                          </button>
                          <input 
                            type="number" 
                            step="0.5" 
                            min="0" 
                            max="24"
                            value={row.hours} 
                            onChange={e => updateRow(row.id, 'hours', e.target.value)} 
                            className="flex-1 h-11 text-center bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                            placeholder="0.0"
                          />
                          <button
                            type="button"
                            onClick={() => stepRowHours(row.id, 0.5)}
                            className="w-10 h-11 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-sm rounded-xl transition-colors shrink-0"
                          >
                            +0.5
                          </button>
                          <button
                            type="button"
                            onClick={() => stepRowHours(row.id, 1.0)}
                            className="w-9 h-11 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs rounded-xl transition-colors shrink-0"
                          >
                            +1h
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                          Typ činnosti
                        </label>
                        <select 
                          value={row.type} 
                          onChange={e => updateRow(row.id, 'type', e.target.value as WorkType)} 
                          className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                          {Object.values(WorkType).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Popis práce */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Poznámka / Popis montáže nebo činnosti
                      </label>
                      <input 
                        type="text" 
                        value={row.description} 
                        onChange={e => updateRow(row.id, 'description', e.target.value)} 
                        className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                        placeholder="Popište montáž, kabeláž nebo důvod nepřítomnosti..."
                      />
                    </div>
                  </div>
                );
              })}

              {/* Tlačítko přidat další činnost */}
              <button 
                type="button" 
                onClick={addRow}
                className="w-full h-12 border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 active:bg-indigo-100 rounded-2xl text-indigo-700 transition-all text-sm font-bold flex items-center justify-center gap-2"
              >
                <span className="text-lg font-black">＋</span>
                <span>PŘIDAT DALŠÍ ZAKÁZKU / LÉKAŘE V TENTO DEN</span>
              </button>

              {/* Doplnění do fondu 8h */}
              {missingHours > 0 && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <div className="text-xs sm:text-sm font-black text-amber-900 flex items-center gap-1.5">
                      <span>💡</span> Do 8h fondu zbývá {missingHours.toFixed(1)} h
                    </div>
                    <div className="text-xs text-amber-700">Doplňte návštěvu lékaře nebo dovolenou jedním klikem:</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddMissingHours(WorkType.DOCTOR, 'Návštěva lékaře')}
                      className="text-xs font-bold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                    >
                      + Lékař ({missingHours.toFixed(1)}h)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddMissingHours(WorkType.VACATION, 'Dovolená')}
                      className="text-xs font-bold px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-xs"
                    >
                      + Dovolená ({missingHours.toFixed(1)}h)
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Fixní spodní panel se součtem */}
          <div className="p-4 sm:p-5 bg-white border-t border-slate-200 shrink-0 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-1">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Celkový denní součet</p>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className={`text-xl sm:text-2xl font-black ${breakdown.total < 8 ? 'text-amber-600' : breakdown.overtime > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                    {breakdown.total.toFixed(1)} h
                  </span>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    Běžná: {breakdown.regular.toFixed(1)}h
                  </span>
                  {breakdown.overtime > 0 && (
                    <span className="text-xs font-bold text-orange-800 bg-orange-100/80 border border-orange-200 px-2 py-0.5 rounded">
                      Přesčas: +{breakdown.overtime.toFixed(1)}h
                    </span>
                  )}
                  {hasWorkHours && lunchBreak && (
                    <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      🍽️ Oběd {lunchStart}–{lunchEnd}
                    </span>
                  )}
                </div>
              </div>

              <div>
                {breakdown.overtime > 0 ? (
                  <span className="inline-block text-xs text-orange-800 font-black bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg">
                    ⚡ Přesčas celkem: +{breakdown.overtime.toFixed(1)}h
                  </span>
                ) : breakdown.total < 8 ? (
                  <span className="inline-block text-xs text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                    Méně než 8h (-{(8 - breakdown.total).toFixed(1)}h)
                  </span>
                ) : (
                  <span className="inline-block text-xs text-green-800 font-bold bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
                    ✓ Standardní směna 8 hodin
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm sm:text-base flex items-center justify-center"
              >
                Zrušit
              </button>
              <button 
                type="submit" 
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all text-sm sm:text-base flex items-center justify-center"
              >
                Uložit denní výkaz ({rows.length} {rows.length === 1 ? 'činnost' : rows.length < 5 ? 'činnosti' : 'činností'})
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

export default EntryFormModal;
