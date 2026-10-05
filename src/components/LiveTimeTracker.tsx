import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TimeEntry, WorkType, Employee, Job } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface LiveTimeTrackerProps {
  currentUserId: string;
  targetUser?: Employee;
  jobs: Job[];
  todayEntries: TimeEntry[];
  onAddEntry: (entry: TimeEntry) => Promise<void> | void;
  onDeleteEntry?: (id: string) => Promise<void> | void;
  onOpenManualEditor?: () => void;
  isLocked?: boolean;
}

interface ActiveSession {
  userId: string;
  jobId: string;
  activityType: WorkType;
  startTimestamp: number;
  startTimeStr: string;
  dateStr: string;
  note?: string;
  hasLunchDeduction?: boolean;
}

const getStorageKey = (userId: string) => `kabel_live_tracker_${userId}`;

const getTodayDateStr = () => new Date().toISOString().split('T')[0];

const formatHHMM = (d: Date = new Date()): string => {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const formatSecondsToHMS = (totalSeconds: number): string => {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Výpočet čistých hodin s možným odečtem oběda (11:00 - 11:30)
export const calculateSessionHours = (
  start: string,
  end: string,
  activityType: WorkType,
  deductLunch: boolean = true
): number => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0.1;

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  let diff = endMinutes - startMinutes;

  // Jízda nemá odečet oběda. Pro běžnou práci odečítáme oběd pokud je zapnutý a protíná 11:00-11:30
  if (activityType === WorkType.REGULAR && deductLunch) {
    const lStart = 11 * 60;
    const lEnd = 11 * 60 + 30;
    const overlapStart = Math.max(startMinutes, lStart);
    const overlapEnd = Math.min(endMinutes, lEnd);
    if (overlapEnd > overlapStart) {
      diff -= (overlapEnd - overlapStart);
    }
  }

  const hours = Math.round((diff / 60) * 10) / 10;
  return Math.max(0.1, hours);
};

const LiveTimeTracker: React.FC<LiveTimeTrackerProps> = ({
  currentUserId,
  targetUser,
  jobs,
  todayEntries,
  onAddEntry,
  onDeleteEntry,
  onOpenManualEditor,
  isLocked = false
}) => {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [sessionNote, setSessionNote] = useState<string>('');
  const [isEditingStartTime, setIsEditingStartTime] = useState<boolean>(false);
  const [customStartTime, setCustomStartTime] = useState<string>('');
  const [deductLunch, setDeductLunch] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Načíst aktivní relaci z localStorage pro konkrétního uživatele
  useEffect(() => {
    if (!currentUserId) return;
    try {
      const stored = localStorage.getItem(getStorageKey(currentUserId));
      if (stored) {
        const parsed: ActiveSession = JSON.parse(stored);
        // Pokud je relace z jiného dne než dnešek, zachováme, ale necháme uživatele rozhodnout
        setActiveSession(parsed);
        setSelectedJobId(parsed.jobId || '');
        setSessionNote(parsed.note || '');
        setDeductLunch(parsed.hasLunchDeduction ?? true);
      } else {
        setActiveSession(null);
      }
    } catch {
      setActiveSession(null);
    }
  }, [currentUserId]);

  // Výchozí zakázka podle střediska nebo první aktivní
  useEffect(() => {
    if (selectedJobId || !jobs || jobs.length === 0) return;
    let defaultJob = '';
    if (targetUser?.department) {
      const match = jobs.find(j => j.code === targetUser.department);
      if (match) defaultJob = match.id;
    }
    if (!defaultJob) {
      defaultJob = jobs.find(j => j.isActive)?.id || jobs[0]?.id || '';
    }
    setSelectedJobId(defaultJob);
  }, [targetUser, jobs, selectedJobId]);

  // Běžící sekundy
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Uložení relace do localStorage
  const saveSession = (session: ActiveSession | null) => {
    setActiveSession(session);
    if (!currentUserId) return;
    if (session) {
      localStorage.setItem(getStorageKey(currentUserId), JSON.stringify(session));
    } else {
      localStorage.removeItem(getStorageKey(currentUserId));
    }
  };

  // 1. ZAHÁJENÍ AKTIVITY (Jízda, Práce, Lékař)
  const handleStartActivity = (type: WorkType, customJobId?: string) => {
    const jobToUse = customJobId || selectedJobId || jobs[0]?.id || '';
    const nowTimeStr = formatHHMM();
    const todayStr = getTodayDateStr();

    const newSession: ActiveSession = {
      userId: currentUserId,
      jobId: jobToUse,
      activityType: type,
      startTimestamp: Date.now(),
      startTimeStr: nowTimeStr,
      dateStr: todayStr,
      note: sessionNote.trim(),
      hasLunchDeduction: deductLunch
    };

    saveSession(newSession);

    if (navigator.vibrate) {
      try { navigator.vibrate(40); } catch {}
    }

    const jobName = jobs.find(j => j.id === jobToUse)?.name || 'Zakázka';
    if (type === WorkType.DRIVE) {
      showToast(`🚗 Jízda zahájena v ${nowTimeStr} (${jobName})`);
    } else if (type === WorkType.REGULAR) {
      showToast(`🔨 Práce zahájena v ${nowTimeStr} (${jobName})`);
    } else {
      showToast(`⏱️ Záznam zahájen: ${type} v ${nowTimeStr}`);
    }
  };

  // 2. DOKONČENÍ AKTIVNÍ RELACE A VOLITELNÉ PŘEPNUTÍ NA NOVOU
  const handleFinishCurrentSession = async (
    nextActivityType: WorkType | null,
    nextJobId?: string
  ) => {
    if (!activeSession) return;

    const endTimeStr = formatHHMM();
    const startTimeStr = activeSession.startTimeStr;
    const finalJobId = activeSession.jobId || selectedJobId || jobs[0]?.id || '';
    const jobObj = jobs.find(j => j.id === finalJobId);
    const jobLabel = jobObj ? `${jobObj.code} ${jobObj.name}` : 'Zakázka';

    const hours = calculateSessionHours(
      startTimeStr,
      endTimeStr,
      activeSession.activityType,
      activeSession.hasLunchDeduction ?? deductLunch
    );

    // Vytvoření TimeEntry záznamu
    let defaultDesc = '';
    if (activeSession.activityType === WorkType.DRIVE) {
      defaultDesc = `Jízda: ${jobLabel}`;
    } else if (activeSession.activityType === WorkType.REGULAR) {
      defaultDesc = `Práce: ${jobLabel}`;
    } else {
      defaultDesc = activeSession.activityType;
    }

    const entryToSave: TimeEntry = {
      id: uuidv4(),
      employeeId: currentUserId,
      date: activeSession.dateStr || getTodayDateStr(),
      project: finalJobId,
      description: activeSession.note ? `${activeSession.note} (${defaultDesc})` : defaultDesc,
      hours,
      type: activeSession.activityType,
      startTime: startTimeStr,
      endTime: endTimeStr,
      breakMinutes: (activeSession.activityType === WorkType.REGULAR && activeSession.hasLunchDeduction) ? 30 : 0,
      lunchTime: (activeSession.activityType === WorkType.REGULAR && activeSession.hasLunchDeduction) ? '11:00 – 11:30' : undefined
    };

    // Uložit do systému
    await onAddEntry(entryToSave);

    if (navigator.vibrate) {
      try { navigator.vibrate([40, 60, 40]); } catch {}
    }

    // Pokud následuje další aktivita (např. Jízda -> Práce nebo Práce -> Jízda)
    if (nextActivityType) {
      const targetJob = nextJobId || finalJobId;
      const nextSession: ActiveSession = {
        userId: currentUserId,
        jobId: targetJob,
        activityType: nextActivityType,
        startTimestamp: Date.now(),
        startTimeStr: endTimeStr, // Nová aktivita plynule navazuje přesně na konec předchozí!
        dateStr: getTodayDateStr(),
        note: '',
        hasLunchDeduction: deductLunch
      };
      saveSession(nextSession);
      setSelectedJobId(targetJob);
      setSessionNote('');

      const targetJobName = jobs.find(j => j.id === targetJob)?.name || 'Zakázka';
      if (activeSession.activityType === WorkType.DRIVE && nextActivityType === WorkType.REGULAR) {
        showToast(`✅ Jízda ukončena (${hours} h) → 🔨 Práce na místě zahájena v ${endTimeStr}`);
      } else if (activeSession.activityType === WorkType.REGULAR && nextActivityType === WorkType.DRIVE) {
        showToast(`✅ Práce ukončena (${hours} h) → 🚗 Jízda zahájena v ${endTimeStr}`);
      } else {
        showToast(`✅ Záznam uložen (${hours} h) → Zahájeno: ${nextActivityType} v ${endTimeStr}`);
      }
    } else {
      // Úplný konec (např. Konec jízdy po příjezdu domů / Konec směny)
      saveSession(null);
      setSessionNote('');
      showToast(`🏁 Záznam úspěšně ukončen a uložen: ${hours} h (${startTimeStr} – ${endTimeStr})`);
    }
  };

  // Zrušení bez uložení (pokud se uživatel překlikl)
  const handleCancelSession = () => {
    if (window.confirm('Opravdu chcete zrušit běžící záznam bez uložení?')) {
      saveSession(null);
      setSessionNote('');
      setIsEditingStartTime(false);
      showToast('⚠️ Běžící záznam byl zrušen bez uložení.');
    }
  };

  // Úprava počátečního času (když zaměstnanec zapomněl kliknout ráno)
  const handleApplyCustomStartTime = (newTime: string) => {
    if (!activeSession) return;
    if (!newTime || !newTime.includes(':')) {
      alert('Zadejte platný čas ve formátu HH:MM (např. 06:30)');
      return;
    }
    const [h, m] = newTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      alert('Neplatný čas');
      return;
    }
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    
    // Vypočíst nový startTimestamp
    const startDate = new Date();
    startDate.setHours(h, m, 0, 0);

    const updated: ActiveSession = {
      ...activeSession,
      startTimeStr: formatted,
      startTimestamp: startDate.getTime()
    };
    saveSession(updated);
    setIsEditingStartTime(false);
    showToast(`⏱️ Čas zahájení upraven na ${formatted}`);
  };

  const handleAdjustStartMinutes = (minutesDelta: number) => {
    if (!activeSession) return;
    const [h, m] = activeSession.startTimeStr.split(':').map(Number);
    let totalM = h * 60 + m + minutesDelta;
    if (totalM < 0) totalM = 0;
    if (totalM >= 24 * 60) totalM = 23 * 60 + 59;
    const newH = Math.floor(totalM / 60);
    const newM = totalM % 60;
    const formatted = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    handleApplyCustomStartTime(formatted);
  };

  // Výpočty pro aktivní relaci
  const elapsedSeconds = useMemo(() => {
    if (!activeSession) return 0;
    const diff = Math.floor((now - activeSession.startTimestamp) / 1000);
    return Math.max(0, diff);
  }, [activeSession, now]);

  const liveCalculatedHours = useMemo(() => {
    if (!activeSession) return 0;
    const currentTimeStr = formatHHMM();
    return calculateSessionHours(
      activeSession.startTimeStr,
      currentTimeStr,
      activeSession.activityType,
      activeSession.hasLunchDeduction ?? deductLunch
    );
  }, [activeSession, now, deductLunch]);

  // Vybraná zakázka pro detail
  const currentSelectedJob = useMemo(() => {
    const id = activeSession?.jobId || selectedJobId;
    return jobs.find(j => j.id === id);
  }, [jobs, activeSession, selectedJobId]);

  // Dnešní záznamy – souhrn
  const todaySummary = useMemo(() => {
    const todayStr = getTodayDateStr();
    const list = todayEntries.filter(e => e.date.split('T')[0] === todayStr);
    const workHours = list.filter(e => e.type !== WorkType.DRIVE).reduce((acc, e) => acc + (e.hours || 0), 0);
    const driveHours = list.filter(e => e.type === WorkType.DRIVE).reduce((acc, e) => acc + (e.hours || 0), 0);
    return {
      entries: list,
      workHours: Math.round(workHours * 10) / 10,
      driveHours: Math.round(driveHours * 10) / 10,
      totalCount: list.length
    };
  }, [todayEntries]);

  if (isLocked) {
    return null; // Pokud je měsíc uzamčen, živý záznamník je neaktivní
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-500/30 shadow-md overflow-hidden mb-6 transition-all">
      {/* Toast notifikace */}
      {toastMessage && (
        <div className="bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-between border-b border-slate-700 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">●</span>
            <span>{toastMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* HLAVNÍ SEKCE: AKTIVNÍ STOPKY NEBO VÝBĚR PRO SPUŠTĚNÍ */}
      <div className="p-4 sm:p-5">
        {!activeSession ? (
          /* ================= STAV: KLID / PŘIPRAVENO K SPUŠTĚNÍ ================= */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold shadow-2xs">
                  ⏱️
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <span>Živý záznamník docházky a jízdy</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Na jedno kliknutí
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Aktuální čas: <strong className="text-slate-800 font-mono">{formatHHMM()}</strong> • Ráno klikněte na Jízdu, po dojezdu na Práci
                  </p>
                </div>
              </div>

              {onOpenManualEditor && (
                <button
                  type="button"
                  onClick={onOpenManualEditor}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 self-start sm:self-auto flex items-center gap-1 transition-colors"
                >
                  <span>✏️ Zadat den zpětně</span>
                </button>
              )}
            </div>

            {/* Volba zakázky */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  1. Vyberte zakázku / středisko:
                </label>
                <div className="relative">
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 hover:border-indigo-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-2xs"
                  >
                    {jobs.filter(j => j.isActive).map(j => (
                      <option key={j.id} value={j.id}>
                        {j.code} – {j.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Poznámka (volitelné):
                </label>
                <input
                  type="text"
                  placeholder="např. Výjezd montáž, hala B..."
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 hover:border-indigo-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* HLAVNÍ SPOUŠTĚCÍ TLAČÍTKA ("NA RÁNĚ") */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                2. Vyberte činnost pro zahájení:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. JÍZDA - hlavní akce */}
                <button
                  type="button"
                  onClick={() => handleStartActivity(WorkType.DRIVE)}
                  className="p-4 rounded-xl border-2 border-cyan-500 bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black text-sm flex flex-col items-center justify-center gap-1.5 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all group"
                >
                  <div className="flex items-center gap-2 text-base">
                    <span className="text-xl group-hover:scale-125 transition-transform">🚗</span>
                    <span className="text-base tracking-wide">Zahájit JÍZDU</span>
                  </div>
                  <span className="text-[11px] text-cyan-100 font-medium">
                    Začne měřit čas jízdy na zakázku
                  </span>
                </button>

                {/* 2. PRÁCE - druhá hlavní akce */}
                <button
                  type="button"
                  onClick={() => handleStartActivity(WorkType.REGULAR)}
                  className="p-4 rounded-xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-sm flex flex-col items-center justify-center gap-1.5 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all group"
                >
                  <div className="flex items-center gap-2 text-base">
                    <span className="text-xl group-hover:scale-125 transition-transform">🔨</span>
                    <span className="text-base tracking-wide">Zahájit PRÁCI</span>
                  </div>
                  <span className="text-[11px] text-emerald-100 font-medium">
                    Práce na zakázce (odpracovaná doba)
                  </span>
                </button>

                {/* 3. LÉKAŘ */}
                <button
                  type="button"
                  onClick={() => handleStartActivity(WorkType.DOCTOR)}
                  className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-900 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all group shadow-2xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base group-hover:scale-110 transition-transform">🩺</span>
                    <span>Návštěva lékaře</span>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-normal">
                    Překážka v práci (lékař)
                  </span>
                </button>

                {/* 4. SLUŽEBNÍ CESTA */}
                <button
                  type="button"
                  onClick={() => handleStartActivity(WorkType.BUSINESS_TRIP)}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all group shadow-2xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base group-hover:scale-110 transition-transform">💼</span>
                    <span>Služební cesta</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Jednání / výjezd mimo firmu
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= STAV: AKTIVNÍ PROBÍHAJÍCÍ ZÁZNAM ================= */
          <div className="space-y-4">
            {/* HORNÍ LIŠTA AKTIVNÍHO STAVU S PULZUJÍCÍM INDIKÁTOREM */}
            <div className={`p-4 rounded-xl border-2 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              activeSession.activityType === WorkType.DRIVE 
                ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 text-white border-cyan-400 shadow-lg' 
                : activeSession.activityType === WorkType.REGULAR
                  ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white border-emerald-400 shadow-lg'
                  : 'bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white border-indigo-400 shadow-lg'
            }`}>
              {/* Levé info o činnosti */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      activeSession.activityType === WorkType.DRIVE ? 'bg-cyan-400' : 'bg-emerald-400'
                    }`} />
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      activeSession.activityType === WorkType.DRIVE ? 'bg-cyan-500' : 'bg-emerald-500'
                    }`} />
                  </span>

                  <span className={`text-xs font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full ${
                    activeSession.activityType === WorkType.DRIVE
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {activeSession.activityType === WorkType.DRIVE ? '🚗 Probíhá Jízda' : `🔨 Probíhá: ${activeSession.activityType}`}
                  </span>

                  {activeSession.activityType === WorkType.DRIVE && (
                    <span className="text-[10px] text-cyan-200/80 font-medium">
                      (eviduje se mimo pracovní fond)
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 pt-1">
                  <h4 className="text-base sm:text-lg font-black text-white">
                    {currentSelectedJob ? `${currentSelectedJob.code} – ${currentSelectedJob.name}` : 'Bez přiřazené zakázky'}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Začátek:</span>
                    <strong className="text-white font-mono text-sm bg-white/10 px-2 py-0.5 rounded">
                      {activeSession.startTimeStr}
                    </strong>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartTime(activeSession.startTimeStr);
                        setIsEditingStartTime(!isEditingStartTime);
                      }}
                      className="text-[11px] text-cyan-300 hover:text-white underline ml-1 font-semibold"
                    >
                      {isEditingStartTime ? 'Zavřít' : 'Upravit čas'}
                    </button>
                  </div>

                  {activeSession.note && (
                    <div className="text-slate-300 italic text-[11px]">
                      „{activeSession.note}“
                    </div>
                  )}
                </div>

                {/* Rychlá oprava času startu */}
                {isEditingStartTime && (
                  <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700 mt-2 space-y-2 max-w-md">
                    <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Zapomněli jste kliknout ráno? Upravte čas startu:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        className="bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-xs font-mono font-bold text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCustomStartTime(customStartTime)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-bold shadow-xs"
                      >
                        Uložit čas
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400">Rychlý posun vzad:</span>
                      <button
                        type="button"
                        onClick={() => handleAdjustStartMinutes(-10)}
                        className="bg-slate-700 hover:bg-slate-600 text-[10px] font-bold px-2 py-0.5 rounded text-white"
                      >
                        -10 min
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustStartMinutes(-15)}
                        className="bg-slate-700 hover:bg-slate-600 text-[10px] font-bold px-2 py-0.5 rounded text-white"
                      >
                        -15 min
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustStartMinutes(-30)}
                        className="bg-slate-700 hover:bg-slate-600 text-[10px] font-bold px-2 py-0.5 rounded text-white"
                      >
                        -30 min
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pravý blok: Velký digitální časoměřič */}
              <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-slate-700/60 pt-3 md:pt-0">
                <div className="font-mono text-3xl sm:text-4xl font-black text-white tracking-wider tabular-nums drop-shadow-xs">
                  {formatSecondsToHMS(elapsedSeconds)}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-slate-300">Doba úseku:</span>
                  <span className="text-sm font-black text-amber-300 font-mono">
                    {liveCalculatedHours.toFixed(1)} h
                  </span>
                </div>
              </div>
            </div>

            {/* PŘEPÍNACÍ AKCE NA JEDNO KLIKNUTÍ (PODLE AKTUÁLNÍHO STAVU) */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Přejít na další krok:
              </p>

              {activeSession.activityType === WorkType.DRIVE ? (
                /* === PŘEPÍNAČE PŘI JÍZDĚ: 1. Příjezd na místo / Práce, 2. Konec jízdy === */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleFinishCurrentSession(WorkType.REGULAR)}
                    className="p-4 rounded-xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-base flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all group"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">🔨</span>
                    <div className="text-left">
                      <div className="text-base font-black">Příjezd na místo → Zahájit PRÁCI</div>
                      <div className="text-xs text-emerald-100 font-normal">
                        Ukončí jízdu ({liveCalculatedHours.toFixed(1)}h) a začne počítat pracovní dobu
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFinishCurrentSession(null)}
                    className="p-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs"
                  >
                    <span className="text-xl">🏁</span>
                    <div className="text-left">
                      <div className="text-sm font-black">Ukončit jízdu (Konec cesty)</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        Návrat na firmu / domů bez navazující práce
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
                /* === PŘEPÍNAČE PŘI PRÁCI: 1. Konec práce / Jízda, 2. Konec směny === */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleFinishCurrentSession(WorkType.DRIVE)}
                    className="p-4 rounded-xl border-2 border-cyan-500 bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-black text-base flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all group"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">🚗</span>
                    <div className="text-left">
                      <div className="text-base font-black">Konec práce → Zahájit JÍZDU</div>
                      <div className="text-xs text-cyan-100 font-normal">
                        Ukončí práci ({liveCalculatedHours.toFixed(1)}h) a začne měřit jízdu (odjezd)
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFinishCurrentSession(null)}
                    className="p-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs"
                  >
                    <span className="text-xl">🏁</span>
                    <div className="text-left">
                      <div className="text-sm font-black">Konec směny (Ukončit práci)</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        Uloží {liveCalculatedHours.toFixed(1)} h a uzavře denní měření
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* DOPLŇKOVÉ PŘEPÍNAČE: Změna zakázky během dne, lékař, zrušení */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[11px] text-slate-400">Přepnout v průběhu dne:</span>
                  
                  {/* Přejezd na jinou zakázku */}
                  <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                    <span className="text-[10px] font-bold text-slate-500 px-1">Přejezd na zakázku:</span>
                    <select
                      value={activeSession.jobId}
                      onChange={(e) => {
                        const newJobId = e.target.value;
                        if (window.confirm('Chcete ukončit stávající úsek a začít jízdu na novou zakázku?')) {
                          handleFinishCurrentSession(WorkType.DRIVE, newJobId);
                        }
                      }}
                      className="bg-white border border-slate-300 rounded text-[11px] font-bold text-slate-800 py-0.5 px-2 cursor-pointer"
                    >
                      {jobs.filter(j => j.isActive).map(j => (
                        <option key={j.id} value={j.id}>
                          {j.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Návštěva lékaře */}
                  {activeSession.activityType !== WorkType.DOCTOR && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Chcete uložit dosavadní práci a zahájit návštěvu lékaře?')) {
                          handleFinishCurrentSession(WorkType.DOCTOR);
                        }
                      }}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span>🩺 Odchod k lékaři</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCancelSession}
                  className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-bold px-2 py-1 rounded transition-colors text-[11px]"
                >
                  ✕ Zrušit stopky bez uložení
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DNEŠNÍ ULOŽENÉ ZÁZNAMY (PŘEHLED DNE NA JEDNOM MÍSTĚ) */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 sm:px-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              📅 Dnešní záznamy ({new Date().toLocaleDateString('cs-CZ')})
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              • {todaySummary.totalCount} {todaySummary.totalCount === 1 ? 'záznam' : todaySummary.totalCount >= 2 && todaySummary.totalCount <= 4 ? 'záznamy' : 'záznamů'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-black">
            <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-normal">Odpracováno: </span>
              <span className="text-slate-900">{todaySummary.workHours.toFixed(1)} h</span>
            </div>
            {todaySummary.driveHours > 0 && (
              <div className="bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200 text-cyan-900 shadow-2xs">
                <span className="text-cyan-700 font-normal">🚗 Jízda: </span>
                <span>{todaySummary.driveHours.toFixed(1)} h</span>
              </div>
            )}
          </div>
        </div>

        {todaySummary.entries.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-1">
            Zatím dnes nebyl uložen žádný záznam. Ráno klikněte na „Zahájit Jízdu“ nebo „Zahájit Práci“.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {todaySummary.entries.map((entry) => {
              const jobObj = jobs.find(j => j.id === entry.project || j.code === entry.project);
              const isDrive = entry.type === WorkType.DRIVE;

              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                    isDrive 
                      ? 'bg-cyan-50/70 border-cyan-200 text-cyan-950' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">
                      {isDrive ? '🚗' : entry.type === WorkType.DOCTOR ? '🩺' : '🔨'}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="font-black text-slate-900 truncate">
                          {entry.type}
                        </strong>
                        {jobObj && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                            {jobObj.code}
                          </span>
                        )}
                        {entry.startTime && entry.endTime && (
                          <span className="text-[11px] font-mono text-slate-500 font-medium">
                            {entry.startTime} – {entry.endTime}
                          </span>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {entry.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className={`font-black text-sm ${isDrive ? 'text-cyan-800' : 'text-slate-900'}`}>
                      {entry.hours.toFixed(1)} h
                    </span>

                    {onDeleteEntry && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Smazat tento záznam (${entry.type}, ${entry.hours}h)?`)) {
                            onDeleteEntry(entry.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition-colors"
                        title="Smazat záznam"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTimeTracker;
