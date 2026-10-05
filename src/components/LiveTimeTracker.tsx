import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TimeEntry, WorkType, Employee, Job } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface LiveTimeTrackerProps {
  currentUserId: string;
  targetUser?: Employee;
  jobs: Job[];
  todayEntries: TimeEntry[];
  onAddEntry: (entry: TimeEntry) => Promise<void> | void;
  onUpdateEntry?: (entry: TimeEntry) => Promise<void> | void;
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
  previousEntryId?: string; // ID pĹ™edchozĂ­ho zĂˇznamu pro plynulou synchronizaci ÄŤasĹŻ
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

// Výpočet čistých hodin s automatickým odečtem 30 min oběda po 4,5 hodině práce
export const calculateSessionHours = (
  start: string,
  end: string,
  activityType: WorkType,
  breakMinutesOverride: number | null = null
): { hours: number, appliedBreak: number } => {
  if (!start || !end) return { hours: 0.1, appliedBreak: 0 };
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return { hours: 0.1, appliedBreak: 0 };

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  let diff = endMinutes - startMinutes;
  let appliedBreak = 0;

  if (activityType === WorkType.REGULAR) {
    if (breakMinutesOverride !== null) {
      appliedBreak = breakMinutesOverride;
    } else {
      if (diff > 270) {
        appliedBreak = 30;
      }
    }
    diff -= appliedBreak;
  }

  const hours = Math.round((diff / 60) * 10) / 10;
  return { hours: Math.max(0.1, hours), appliedBreak };
};

const LiveTimeTracker: React.FC<LiveTimeTrackerProps> = ({
  currentUserId,
  targetUser,
  jobs,
  todayEntries,
  onAddEntry,
  onUpdateEntry,
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

  // Editace jiĹľ uloĹľenĂ©ho zĂˇznamu v seznamu
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const [editType, setEditType] = useState<WorkType>(WorkType.REGULAR);
  const [editJobId, setEditJobId] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editSyncAdjacent, setEditSyncAdjacent] = useState<boolean>(true);

  // NaÄŤĂ­st aktivnĂ­ relaci z localStorage pro konkrĂ©tnĂ­ho uĹľivatele
  useEffect(() => {
    if (!currentUserId) return;
    try {
      const stored = localStorage.getItem(getStorageKey(currentUserId));
      if (stored) {
        const parsed: ActiveSession = JSON.parse(stored);
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

  // VĂ˝chozĂ­ zakĂˇzka podle stĹ™ediska nebo prvnĂ­ aktivnĂ­
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

  // BÄ›ĹľĂ­cĂ­ sekundy
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
    }, 5500);
  };

  // UloĹľenĂ­ relace do localStorage
  const saveSession = (session: ActiveSession | null) => {
    setActiveSession(session);
    if (!currentUserId) return;
    if (session) {
      localStorage.setItem(getStorageKey(currentUserId), JSON.stringify(session));
    } else {
      localStorage.removeItem(getStorageKey(currentUserId));
    }
  };

  // 1. ZAHĂJENĂŤ AKTIVITY (JĂ­zda, PrĂˇce, LĂ©kaĹ™)
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

    const jobName = jobs.find(j => j.id === jobToUse)?.name || 'ZakĂˇzka';
    if (type === WorkType.DRIVE) {
      showToast(`đźš— JĂ­zda zahĂˇjena v ${nowTimeStr} (${jobName})`);
    } else if (type === WorkType.REGULAR) {
      showToast(`đź”¨ PrĂˇce zahĂˇjena v ${nowTimeStr} (${jobName})`);
    } else {
      showToast(`âŹ±ď¸Ź ZĂˇznam zahĂˇjen: ${type} v ${nowTimeStr}`);
    }
  };

  // 2. DOKONÄŚENĂŤ AKTIVNĂŤ RELACE A PĹEPNUTĂŤ NA DALĹ ĂŤ KROK S UCHOVĂNĂŤM VAZBY
  const handleFinishCurrentSession = async (
    nextActivityType: WorkType | null,
    nextJobId?: string
  ) => {
    if (!activeSession) return;

    const endTimeStr = formatHHMM();
    const startTimeStr = activeSession.startTimeStr;
    const finalJobId = activeSession.jobId || selectedJobId || jobs[0]?.id || '';
    const jobObj = jobs.find(j => j.id === finalJobId);
    const jobLabel = jobObj ? `${jobObj.code} ${jobObj.name}` : 'ZakĂˇzka';

    const { hours, appliedBreak } = calculateSessionHours(
      startTimeStr,
      endTimeStr,
      activeSession.activityType,
      activeSession.hasLunchDeduction ?? deductLunch ? (deductLunch ? null : 0) : 0 // TODO fix
    );

    // VytvoĹ™enĂ­ unikĂˇtnĂ­ho TimeEntry zĂˇznamu
    const newEntryId = uuidv4();
    let defaultDesc = '';
    if (activeSession.activityType === WorkType.DRIVE) {
      defaultDesc = `JĂ­zda: ${jobLabel}`;
    } else if (activeSession.activityType === WorkType.REGULAR) {
      defaultDesc = `PrĂˇce: ${jobLabel}`;
    } else {
      defaultDesc = activeSession.activityType;
    }

    const entryToSave: TimeEntry = {
      id: newEntryId,
      employeeId: currentUserId,
      date: activeSession.dateStr || getTodayDateStr(),
      project: finalJobId,
      description: activeSession.note ? `${activeSession.note} (${defaultDesc})` : defaultDesc,
      hours,
      type: activeSession.activityType,
      startTime: startTimeStr,
      endTime: endTimeStr,
      breakMinutes: appliedBreak,
        lunchTime: appliedBreak > 0 ? `Automaticky ${appliedBreak} min` : undefined
    };

    // UloĹľit novÄ› dokonÄŤenĂ˝ zĂˇznam do systĂ©mu
    await onAddEntry(entryToSave);

    if (navigator.vibrate) {
      try { navigator.vibrate([40, 60, 40]); } catch {}
    }

    // Pokud nĂˇsleduje dalĹˇĂ­ krok (napĹ™. JĂ­zda -> PrĂˇce, nebo PrĂˇce -> JĂ­zda)
    if (nextActivityType) {
      const targetJob = nextJobId || finalJobId;
      const nextSession: ActiveSession = {
        userId: currentUserId,
        jobId: targetJob,
        activityType: nextActivityType,
        startTimestamp: Date.now(),
        startTimeStr: endTimeStr, // NovĂˇ aktivita plynule navazuje pĹ™esnÄ› na konec pĹ™edchozĂ­!
        dateStr: getTodayDateStr(),
        note: '',
        hasLunchDeduction: deductLunch,
        previousEntryId: newEntryId // PĹĂŤMĂ VAZBA NA PRĂVÄš ULOĹ˝ENĂť ZĂZNAM!
      };
      saveSession(nextSession);
      setSelectedJobId(targetJob);
      setSessionNote('');

      if (activeSession.activityType === WorkType.DRIVE && nextActivityType === WorkType.REGULAR) {
        showToast(`âś… JĂ­zda uloĹľena (${startTimeStr} â€“ ${endTimeStr}, ${hours} h) â†’ đź”¨ PrĂˇce na mĂ­stÄ› zahĂˇjena v ${endTimeStr}`);
      } else if (activeSession.activityType === WorkType.REGULAR && nextActivityType === WorkType.DRIVE) {
        showToast(`âś… PrĂˇce uloĹľena (${startTimeStr} â€“ ${endTimeStr}, ${hours} h) â†’ đźš— JĂ­zda zahĂˇjena v ${endTimeStr}`);
      } else {
        showToast(`âś… ZĂˇznam uloĹľen (${startTimeStr} â€“ ${endTimeStr}, ${hours} h) â†’ ZahĂˇjeno: ${nextActivityType} v ${endTimeStr}`);
      }
    } else {
      // ĂšplnĂ˝ konec smÄ›ny / jĂ­zdy
      saveSession(null);
      setSessionNote('');
      showToast(`đźŹ ZĂˇznam ĂşspÄ›ĹˇnÄ› ukonÄŤen a uloĹľen: ${hours} h (${startTimeStr} â€“ ${endTimeStr})`);
    }
  };

  // ZruĹˇenĂ­ bez uloĹľenĂ­
  const handleCancelSession = () => {
    if (window.confirm('Opravdu chcete zruĹˇit bÄ›ĹľĂ­cĂ­ zĂˇznam bez uloĹľenĂ­?')) {
      saveSession(null);
      setSessionNote('');
      setIsEditingStartTime(false);
      showToast('âš ď¸Ź BÄ›ĹľĂ­cĂ­ zĂˇznam byl zruĹˇen bez uloĹľenĂ­.');
    }
  };

  // 3. ĂšPRAVA ÄŚASU ZAÄŚĂTKU S AUTOMATICKOU SYNCHRONIZACĂŤ PĹEDCHOZĂŤHO ZĂZNAMU!
  const handleApplyCustomStartTime = async (newTime: string) => {
    if (!activeSession) return;
    if (!newTime || !newTime.includes(':')) {
      alert('Zadejte platnĂ˝ ÄŤas ve formĂˇtu HH:MM (napĹ™. 06:30)');
      return;
    }
    const [h, m] = newTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      alert('NeplatnĂ˝ ÄŤas');
      return;
    }
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const oldStartTime = activeSession.startTimeStr;

    // VypoÄŤĂ­st novĂ˝ startTimestamp pro bÄ›ĹľĂ­cĂ­ stopky
    const startDate = new Date();
    startDate.setHours(h, m, 0, 0);

    const updated: ActiveSession = {
      ...activeSession,
      startTimeStr: formatted,
      startTimestamp: startDate.getTime()
    };
    saveSession(updated);
    setIsEditingStartTime(false);

    // KONTROLA A AUTOMATICKĂ AKTUALIZACE KONCE PĹEDCHOZĂŤHO ZĂZNAMU
    const todayStr = getTodayDateStr();
    const sortedToday = todayEntries
      .filter(e => e.date.split('T')[0] === todayStr)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    // 1. ZkusĂ­me najĂ­t pĹ™edchozĂ­ zĂˇznam podle vazby previousEntryId
    let prevEntry = activeSession.previousEntryId 
      ? todayEntries.find(e => e.id === activeSession.previousEntryId)
      : undefined;

    // 2. Pokud ID chybĂ­ (napĹ™. po obnovenĂ­ ze starĂ© relace), vyhledĂˇme zĂˇznam s endTime === oldStartTime
    if (!prevEntry && sortedToday.length > 0) {
      prevEntry = sortedToday.find(e => e.endTime === oldStartTime);
      if (!prevEntry) {
        // Fallback: poslednĂ­ zĂˇznam dne
        prevEntry = sortedToday[sortedToday.length - 1];
      }
    }

    if (prevEntry && onUpdateEntry) {
      // Kontrola logiky: novĂ˝ ÄŤas konce by nemÄ›l bĂ˝t pĹ™ed zaÄŤĂˇtkem pĹ™edchozĂ­ho zĂˇznamu
      if (prevEntry.startTime) {
        const [psh, psm] = prevEntry.startTime.split(':').map(Number);
        const prevStartMinutes = psh * 60 + psm;
        const newMinutes = h * 60 + m;
        if (newMinutes < prevStartMinutes) {
          alert(`UpozornÄ›nĂ­: ÄŚas ${formatted} je dĹ™Ă­vÄ›jĹˇĂ­ neĹľ zaÄŤĂˇtek pĹ™edchozĂ­ho zĂˇznamu (${prevEntry.startTime}).`);
        }
      }

      const { hours: prevNewHours } = calculateSessionHours(
          prevEntry.startTime || formatted,
          formatted,
          prevEntry.type,
          prevEntry.breakMinutes || 0
        );

      const updatedPrevEntry: TimeEntry = {
        ...prevEntry,
        endTime: formatted,
        hours: prevNewHours
      };

      await onUpdateEntry(updatedPrevEntry);

      showToast(`âŹ±ď¸Ź ÄŚas zaÄŤĂˇtku ${activeSession.activityType === WorkType.DRIVE ? 'jĂ­zdy' : 'prĂˇce'} upraven na ${formatted} â€˘ Konec pĹ™edchozĂ­ ${prevEntry.type === WorkType.DRIVE ? 'jĂ­zdy' : 'prĂˇce'} automaticky upraven na ${formatted} (${prevNewHours.toFixed(1)} h)`);
    } else {
      showToast(`âŹ±ď¸Ź ÄŚas zahĂˇjenĂ­ upraven na ${formatted}`);
    }
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

  // 4. RYCHLĂ EDITACE JEDNOTLIVĂťCH ZĂZNAMĹ® V DNEĹ NĂŤM PĹEHLEDU S PROPOJENĂŤM
  const handleOpenEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditStartTime(entry.startTime || '06:30');
    setEditEndTime(entry.endTime || '15:00');
    setEditType(entry.type);
    setEditJobId(entry.project || '');
    setEditDesc(entry.description || '');
    setEditSyncAdjacent(true);
  };

  const handleSaveEditedEntry = async () => {
    if (!editingEntry || !onUpdateEntry) return;

    if (!editStartTime || !editEndTime) {
      alert('VyplĹte ÄŤas zaÄŤĂˇtku i konce.');
      return;
    }

    const oldStart = editingEntry.startTime;
    const oldEnd = editingEntry.endTime;

    const { hours: newHours } = calculateSessionHours(
        editStartTime,
        editEndTime,
        editType,
        editingEntry.breakMinutes != null ? editingEntry.breakMinutes : null
      );

    const updatedCurrent: TimeEntry = {
      ...editingEntry,
      startTime: editStartTime,
      endTime: editEndTime,
      hours: newHours,
      type: editType,
      project: editJobId,
      description: editDesc
    };

    await onUpdateEntry(updatedCurrent);

    // Pokud je zapnuta synchronizace navazujĂ­cĂ­ch ÄŤasĹŻ
    if (editSyncAdjacent) {
      const todayStr = getTodayDateStr();
      const sortedToday = todayEntries
        .filter(e => e.date.split('T')[0] === todayStr && e.id !== editingEntry.id)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

      // A) ZmÄ›na endTime -> ovlivnĂ­ navazujĂ­cĂ­ zĂˇznam nebo aktivnĂ­ relaci
      if (editEndTime !== oldEnd) {
        // HledĂˇme zĂˇznam, kterĂ˝ zaÄŤĂ­nal v ÄŤase oldEnd
        const nextEntry = sortedToday.find(e => e.startTime === oldEnd);
        if (nextEntry && nextEntry.endTime) {
          const { hours: nextNewHours } = calculateSessionHours(
              editEndTime,
              nextEntry.endTime,
              nextEntry.type,
              nextEntry.breakMinutes || 0
            );
          await onUpdateEntry({
            ...nextEntry,
            startTime: editEndTime,
            hours: nextNewHours
          });
        }

        // Pokud v ÄŤase oldEnd zaÄŤĂ­nala prĂˇvÄ› bÄ›ĹľĂ­cĂ­ relace:
        if (activeSession && (activeSession.startTimeStr === oldEnd || activeSession.previousEntryId === editingEntry.id)) {
          const [nh, nm] = editEndTime.split(':').map(Number);
          const startDate = new Date();
          startDate.setHours(nh, nm, 0, 0);
          saveSession({
            ...activeSession,
            startTimeStr: editEndTime,
            startTimestamp: startDate.getTime()
          });
        }
      }

      // B) ZmÄ›na startTime -> ovlivnĂ­ pĹ™edchozĂ­ zĂˇznam
      if (editStartTime !== oldStart) {
        const prevEntry = sortedToday.find(e => e.endTime === oldStart);
        if (prevEntry && prevEntry.startTime) {
          const { hours: prevNewHours } = calculateSessionHours(
              prevEntry.startTime,
              editStartTime,
              prevEntry.type,
              prevEntry.breakMinutes || 0
            );
          await onUpdateEntry({
            ...prevEntry,
            endTime: editStartTime,
            hours: prevNewHours
          });
        }
      }
    }

    setEditingEntry(null);
    showToast(`âś… ZĂˇznam (${editType}) upraven na ${editStartTime} â€“ ${editEndTime} (${newHours} h)${editSyncAdjacent ? ' a navazujĂ­cĂ­ ÄŤasy synchronizovĂˇny' : ''}.`);
  };

  // VĂ˝poÄŤty pro aktivnĂ­ relaci
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
        activeSession.hasLunchDeduction ?? deductLunch ? null : 0
      ).hours;
  }, [activeSession, now, deductLunch]);

  // VybranĂˇ zakĂˇzka pro detail
  const currentSelectedJob = useMemo(() => {
    const id = activeSession?.jobId || selectedJobId;
    return jobs.find(j => j.id === id);
  }, [jobs, activeSession, selectedJobId]);

  // DneĹˇnĂ­ zĂˇznamy â€“ souhrn
  const todaySummary = useMemo(() => {
    const todayStr = getTodayDateStr();
    const list = todayEntries
      .filter(e => e.date.split('T')[0] === todayStr)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
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
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-500/30 shadow-md overflow-hidden mb-6 transition-all">
      {/* Toast notifikace */}
      {toastMessage && (
        <div className="bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-between border-b border-slate-700 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">â—Ź</span>
            <span>{toastMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 text-sm"
          >
            âś•
          </button>
        </div>
      )}

      {/* HLAVNĂŤ SEKCE: AKTIVNĂŤ STOPKY NEBO VĂťBÄšR PRO SPUĹ TÄšNĂŤ */}
      <div className="p-4 sm:p-5">
        {!activeSession ? (
          /* ================= STAV: KLID / PĹIPRAVENO K SPUĹ TÄšNĂŤ ================= */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold shadow-2xs">
                  âŹ±ď¸Ź
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <span>Ĺ˝ivĂ˝ zĂˇznamnĂ­k dochĂˇzky a jĂ­zdy</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Na jedno kliknutĂ­
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    AktuĂˇlnĂ­ ÄŤas: <strong className="text-slate-800 font-mono">{formatHHMM()}</strong> â€˘ RĂˇno kliknÄ›te na JĂ­zdu, po dojezdu na PrĂˇci
                  </p>
                </div>
              </div>

              {onOpenManualEditor && (
                <button
                  type="button"
                  onClick={onOpenManualEditor}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 self-start sm:self-auto flex items-center gap-1 transition-colors"
                >
                  <span>âśŹď¸Ź Zadat den zpÄ›tnÄ›</span>
                </button>
              )}
            </div>

            {/* Volba zakĂˇzky */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  1. Vyberte zakĂˇzku / stĹ™edisko:
                </label>
                <div className="relative">
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 hover:border-indigo-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-2xs"
                  >
                    {jobs.filter(j => j.isActive).map(j => (
                      <option key={j.id} value={j.id}>
                        {j.code} â€“ {j.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  PoznĂˇmka (volitelnĂ©):
                </label>
                <input
                  type="text"
                  placeholder="napĹ™. VĂ˝jezd montĂˇĹľ, hala B..."
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 hover:border-indigo-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* HLAVNĂŤ SPOUĹ TÄšCĂŤ TLAÄŚĂŤTKA ("NA RĂNÄš") */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                2. Vyberte ÄŤinnost pro zahĂˇjenĂ­:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. JĂŤZDA - hlavnĂ­ akce */}
                <button
                  type="button"
                  onClick={() => handleStartActivity(WorkType.DRIVE)}
                  className="p-4 rounded-xl border-2 border-cyan-500 bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black text-sm flex flex-col items-center justify-center gap-1.5 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all group"
                >
                  <div className="flex items-center gap-2 text-base">
                    <span className="text-xl group-hover:scale-125 transition-transform">đźš—</span>
                    <span className="text-base tracking-wide">ZahĂˇjit JĂŤZDU</span>
                  </div>
                  <span className="text-[11px] text-cyan-100 font-medium">
                    ZaÄŤne mÄ›Ĺ™it ÄŤas jĂ­zdy na zakĂˇzku
                  </span>
                </button>

                {/* 2. PRĂCE - druhĂˇ hlavnĂ­ akce */}
                <button
                  type="button"
                  onClick={() => handleStartActivity(WorkType.REGULAR)}
                  className="p-4 rounded-xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-sm flex flex-col items-center justify-center gap-1.5 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all group"
                >
                  <div className="flex items-center gap-2 text-base">
                    <span className="text-xl group-hover:scale-125 transition-transform">đź”¨</span>
                    <span className="text-base tracking-wide">ZahĂˇjit PRĂCI</span>
                  </div>
                  <span className="text-[11px] text-emerald-100 font-medium">
                    PrĂˇce na zakĂˇzce (odpracovanĂˇ doba)
                  </span>
                </button>

                {/* 3. LĂ‰KAĹ */}
                <button
                  type="button"
                  onClick={() => handleStartActivity(WorkType.DOCTOR)}
                  className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-900 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all group shadow-2xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base group-hover:scale-110 transition-transform">đź©ş</span>
                    <span>NĂˇvĹˇtÄ›va lĂ©kaĹ™e</span>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-normal">
                    PĹ™ekĂˇĹľka v prĂˇci (lĂ©kaĹ™)
                  </span>
                </button>

                {/* 4. SLUĹ˝EBNĂŤ CESTA */}
                <button
                  type="button"
                  onClick={() => handleStartActivity(WorkType.BUSINESS_TRIP)}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all group shadow-2xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base group-hover:scale-110 transition-transform">đź’Ľ</span>
                    <span>SluĹľebnĂ­ cesta</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    JednĂˇnĂ­ / vĂ˝jezd mimo firmu
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= STAV: AKTIVNĂŤ PROBĂŤHAJĂŤCĂŤ ZĂZNAM ================= */
          <div className="space-y-4">
            {/* HORNĂŤ LIĹ TA AKTIVNĂŤHO STAVU S PULZUJĂŤCĂŤM INDIKĂTOREM */}
            <div className={`p-4 rounded-xl border-2 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              activeSession.activityType === WorkType.DRIVE 
                ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 text-white border-cyan-400 shadow-lg' 
                : activeSession.activityType === WorkType.REGULAR
                  ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white border-emerald-400 shadow-lg'
                  : 'bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white border-indigo-400 shadow-lg'
            }`}>
              {/* LevĂ© info o ÄŤinnosti */}
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
                    {activeSession.activityType === WorkType.DRIVE ? 'đźš— ProbĂ­hĂˇ JĂ­zda' : `đź”¨ ProbĂ­hĂˇ: ${activeSession.activityType}`}
                  </span>

                  {activeSession.activityType === WorkType.DRIVE && (
                    <span className="text-[10px] text-cyan-200/80 font-medium">
                      (eviduje se mimo pracovnĂ­ fond)
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 pt-1">
                  <h4 className="text-base sm:text-lg font-black text-white">
                    {currentSelectedJob ? `${currentSelectedJob.code} â€“ ${currentSelectedJob.name}` : 'Bez pĹ™iĹ™azenĂ© zakĂˇzky'}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">ZaÄŤĂˇtek:</span>
                    <strong className="text-white font-mono text-sm bg-white/10 px-2 py-0.5 rounded">
                      {activeSession.startTimeStr}
                    </strong>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartTime(activeSession.startTimeStr);
                        setIsEditingStartTime(!isEditingStartTime);
                      }}
                      className="text-[11px] text-cyan-300 hover:text-white underline ml-1 font-bold"
                    >
                      {isEditingStartTime ? 'âś• ZavĹ™Ă­t' : 'âśŹď¸Ź Upravit ÄŤas'}
                    </button>
                  </div>

                  {activeSession.note && (
                    <div className="text-slate-300 italic text-[11px]">
                      â€ž{activeSession.note}â€ś
                    </div>
                  )}
                </div>

                {/* RychlĂˇ oprava ÄŤasu startu se synchronizacĂ­ pĹ™edchozĂ­ho kroku */}
                {isEditingStartTime && (
                  <div className="bg-slate-800/95 p-3.5 rounded-xl border border-slate-700 mt-2.5 space-y-2.5 max-w-lg shadow-xl">
                    <div className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>âŹ±ď¸Ź</span>
                        <span>ZmÄ›na ÄŤasu zaÄŤĂˇtku (automaticky upravĂ­ i konec pĹ™edchozĂ­ho kroku):</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        className="bg-slate-900 border border-slate-600 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCustomStartTime(customStartTime)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-black shadow-xs transition-colors"
                      >
                        Potvrdit a synchronizovat
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-semibold">RychlĂ˝ posun:</span>
                      <button
                        type="button"
                        onClick={() => handleAdjustStartMinutes(-5)}
                        className="bg-slate-700 hover:bg-slate-600 text-[10px] font-bold px-2 py-0.5 rounded text-white"
                      >
                        -5 min
                      </button>
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
                      <button
                        type="button"
                        onClick={() => handleAdjustStartMinutes(+10)}
                        className="bg-slate-700 hover:bg-slate-600 text-[10px] font-bold px-2 py-0.5 rounded text-white ml-2"
                      >
                        +10 min
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* PravĂ˝ blok: VelkĂ˝ digitĂˇlnĂ­ ÄŤasomÄ›Ĺ™iÄŤ */}
              <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-slate-700/60 pt-3 md:pt-0">
                <div className="font-mono text-3xl sm:text-4xl font-black text-white tracking-wider tabular-nums drop-shadow-xs">
                  {formatSecondsToHMS(elapsedSeconds)}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-slate-300">Doba Ăşseku:</span>
                  <span className="text-sm font-black text-amber-300 font-mono">
                    {liveCalculatedHours.toFixed(1)} h
                  </span>
                </div>
              </div>
            </div>

            {/* PĹEPĂŤNACĂŤ AKCE NA JEDNO KLIKNUTĂŤ (PODLE AKTUĂLNĂŤHO STAVU) */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                PĹ™ejĂ­t na dalĹˇĂ­ krok:
              </p>

              {activeSession.activityType === WorkType.DRIVE ? (
                /* === PĹEPĂŤNAÄŚE PĹI JĂŤZDÄš: 1. PĹ™Ă­jezd na mĂ­sto / PrĂˇce, 2. Konec jĂ­zdy === */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleFinishCurrentSession(WorkType.REGULAR)}
                    className="p-4 rounded-xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-base flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all group"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">đź”¨</span>
                    <div className="text-left">
                      <div className="text-base font-black">PĹ™Ă­jezd na mĂ­sto â†’ ZahĂˇjit PRĂCI</div>
                      <div className="text-xs text-emerald-100 font-normal">
                        UkonÄŤĂ­ jĂ­zdu ({liveCalculatedHours.toFixed(1)}h) a zaÄŤne poÄŤĂ­tat pracovnĂ­ dobu
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFinishCurrentSession(null)}
                    className="p-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs"
                  >
                    <span className="text-xl">đźŹ</span>
                    <div className="text-left">
                      <div className="text-sm font-black">UkonÄŤit jĂ­zdu (Konec cesty)</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        NĂˇvrat na firmu / domĹŻ bez navazujĂ­cĂ­ prĂˇce
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
                /* === PĹEPĂŤNAÄŚE PĹI PRĂCI: 1. Konec prĂˇce / JĂ­zda, 2. Konec smÄ›ny === */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleFinishCurrentSession(WorkType.DRIVE)}
                    className="p-4 rounded-xl border-2 border-cyan-500 bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-black text-base flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all group"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">đźš—</span>
                    <div className="text-left">
                      <div className="text-base font-black">Konec prĂˇce â†’ ZahĂˇjit JĂŤZDU</div>
                      <div className="text-xs text-cyan-100 font-normal">
                        UkonÄŤĂ­ prĂˇci ({liveCalculatedHours.toFixed(1)}h) a zaÄŤne mÄ›Ĺ™it jĂ­zdu (odjezd)
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFinishCurrentSession(null)}
                    className="p-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs"
                  >
                    <span className="text-xl">đźŹ</span>
                    <div className="text-left">
                      <div className="text-sm font-black">Konec smÄ›ny (UkonÄŤit prĂˇci)</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        UloĹľĂ­ {liveCalculatedHours.toFixed(1)} h a uzavĹ™e dennĂ­ mÄ›Ĺ™enĂ­
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* DOPLĹ‡KOVĂ‰ PĹEPĂŤNAÄŚE: ZmÄ›na zakĂˇzky bÄ›hem dne, lĂ©kaĹ™, zruĹˇenĂ­ */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[11px] text-slate-400">PĹ™epnout v prĹŻbÄ›hu dne:</span>
                  
                  {/* PĹ™ejezd na jinou zakĂˇzku */}
                  <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                    <span className="text-[10px] font-bold text-slate-500 px-1">PĹ™ejezd na zakĂˇzku:</span>
                    <select
                      value={activeSession.jobId}
                      onChange={(e) => {
                        const newJobId = e.target.value;
                        if (window.confirm('Chcete ukonÄŤit stĂˇvajĂ­cĂ­ Ăşsek a zaÄŤĂ­t jĂ­zdu na novou zakĂˇzku?')) {
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

                  {/* NĂˇvĹˇtÄ›va lĂ©kaĹ™e */}
                  {activeSession.activityType !== WorkType.DOCTOR && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Chcete uloĹľit dosavadnĂ­ prĂˇci a zahĂˇjit nĂˇvĹˇtÄ›vu lĂ©kaĹ™e?')) {
                          handleFinishCurrentSession(WorkType.DOCTOR);
                        }
                      }}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span>đź©ş Odchod k lĂ©kaĹ™i</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCancelSession}
                  className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-bold px-2 py-1 rounded transition-colors text-[11px]"
                >
                  âś• ZruĹˇit stopky bez uloĹľenĂ­
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DNEĹ NĂŤ ULOĹ˝ENĂ‰ ZĂZNAMY S MOĹ˝NOSTĂŤ EDITACE A SYNCHRONIZACE */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 sm:px-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              đź“… DneĹˇnĂ­ zĂˇznamy ({new Date().toLocaleDateString('cs-CZ')})
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              â€˘ {todaySummary.totalCount} {todaySummary.totalCount === 1 ? 'zĂˇznam' : todaySummary.totalCount >= 2 && todaySummary.totalCount <= 4 ? 'zĂˇznamy' : 'zĂˇznamĹŻ'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-black">
            <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-normal">OdpracovĂˇno: </span>
              <span className="text-slate-900">{todaySummary.workHours.toFixed(1)} h</span>
            </div>
            {todaySummary.driveHours > 0 && (
              <div className="bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200 text-cyan-900 shadow-2xs">
                <span className="text-cyan-700 font-normal">đźš— JĂ­zda: </span>
                <span>{todaySummary.driveHours.toFixed(1)} h</span>
              </div>
            )}
          </div>
        </div>

        {todaySummary.entries.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-1">
            ZatĂ­m dnes nebyl uloĹľen ĹľĂˇdnĂ˝ zĂˇznam. RĂˇno kliknÄ›te na â€žZahĂˇjit JĂ­zduâ€ś nebo â€žZahĂˇjit PrĂˇciâ€ś.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
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
                      {isDrive ? 'đźš—' : entry.type === WorkType.DOCTOR ? 'đź©ş' : 'đź”¨'}
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
                          <span className="text-[11px] font-mono text-slate-600 font-bold bg-white/70 px-1.5 py-0.5 rounded border border-slate-200/60">
                            {entry.startTime} â€“ {entry.endTime}
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

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`font-black text-sm ${isDrive ? 'text-cyan-800' : 'text-slate-900'}`}>
                      {entry.hours.toFixed(1)} h
                    </span>

                    {/* TlaÄŤĂ­tko pro Ăşpravu ÄŤasu zĂˇznamu */}
                    {onUpdateEntry && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditEntry(entry)}
                        className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 transition-colors text-xs font-bold"
                        title="Upravit ÄŤasy zĂˇznamu"
                      >
                        âśŹď¸Ź
                      </button>
                    )}

                    {onDeleteEntry && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Smazat tento zĂˇznam (${entry.type}, ${entry.hours}h)?`)) {
                            onDeleteEntry(entry.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition-colors"
                        title="Smazat zĂˇznam"
                      >
                        đź—‘ď¸Ź
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODĂL PRO RYCHLOU EDITACI ZĂZNAMU A SYNCHRONIZACI ÄŚASĹ® */}
      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <span>âśŹď¸Ź Ăšprava zĂˇznamu:</span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {editingEntry.type}
                </span>
              </h4>
              <button 
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                âś•
              </button>
            </div>

            <div className="space-y-3">
              {/* ÄŚasy od â€“ do */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    ÄŚas od:
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    ÄŚas do:
                  </label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Typ ÄŤinnosti */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Typ ÄŤinnosti:
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as WorkType)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value={WorkType.DRIVE}>đźš— JĂ­zda (mimo fond)</option>
                  <option value={WorkType.REGULAR}>đź”¨ BÄ›ĹľnĂˇ prĂˇce</option>
                  <option value={WorkType.DOCTOR}>đź©ş LĂ©kaĹ™</option>
                  <option value={WorkType.BUSINESS_TRIP}>đź’Ľ SluĹľebnĂ­ cesta</option>
                  <option value={WorkType.OVERTIME}>âšˇ PĹ™esÄŤas</option>
                </select>
              </div>

              {/* ZakĂˇzka */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  ZakĂˇzka:
                </label>
                <select
                  value={editJobId}
                  onChange={(e) => setEditJobId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.code} â€“ {j.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* PoznĂˇmka */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Popis / PoznĂˇmka:
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  placeholder="napĹ™. JĂ­zda na montĂˇĹľ..."
                />
              </div>

              {/* Volba automatickĂ© synchronizace */}
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="syncAdjacent"
                  checked={editSyncAdjacent}
                  onChange={(e) => setEditSyncAdjacent(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="syncAdjacent" className="text-xs text-indigo-950 font-medium cursor-pointer">
                  <strong>PlynulĂˇ nĂˇvaznost:</strong> Automaticky pĹ™izpĹŻsobit navazujĂ­cĂ­ ÄŤas sousednĂ­ho Ăşseku nebo bÄ›ĹľĂ­cĂ­ch stopek, aby ÄŤasy pĹ™esnÄ› sedÄ›ly.
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ZruĹˇit
              </button>
              <button
                type="button"
                onClick={handleSaveEditedEntry}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-xs transition-colors"
              >
                UloĹľit zmÄ›ny
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTimeTracker;





