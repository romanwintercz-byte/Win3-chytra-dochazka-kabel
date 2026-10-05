import React, { useState, useMemo } from 'react';
import { Employee, ResponsibilityRole, formatDepartment, DEPARTMENT_OPTIONS } from '../types';
import { isRootAdmin } from '../services/mockData';

interface SupervisorAssignmentPanelProps {
  employees: Employee[];
  roles: ResponsibilityRole[];
  currentUser: Employee;
  onUpdateEmployee: (emp: Employee) => void;
  onNavigateToRoles?: () => void;
}

export const SupervisorAssignmentPanel: React.FC<SupervisorAssignmentPanelProps> = ({
  employees,
  roles,
  currentUser,
  onUpdateEmployee,
  onNavigateToRoles
}) => {
  // Přepínač pohledů: Karty týmů podle vedoucích vs. Rychlá tabulka & hromadné akce
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Filtry pro tabulku
  const [tableSearch, setTableSearch] = useState('');
  const [tableSupervisorFilter, setTableSupervisorFilter] = useState<string>('all');
  const [tableDeptFilter, setTableDeptFilter] = useState<string>('all');
  const [tableSelectedEmpIds, setTableSelectedEmpIds] = useState<string[]>([]);
  const [bulkTargetSupervisorId, setBulkTargetSupervisorId] = useState<string>('');

  // Stav pro modální okno přiřazení k jednomu konkrétnímu vedoucímu
  const [selectedSupervisorForModal, setSelectedSupervisorForModal] = useState<Employee | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalFilterTab, setModalFilterTab] = useState<'unassigned' | 'same_dept' | 'all'>('unassigned');
  const [modalSelectedEmpIds, setModalSelectedEmpIds] = useState<string[]>([]);

  // Dočasná notifikace o úspěšném uložení
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3500);
  };

  // Mapa rolí pro rychlé vyhledání
  const roleMap = useMemo(() => {
    const map = new Map<string, ResponsibilityRole>();
    roles.forEach(r => map.set(r.id, r));
    return map;
  }, [roles]);

  // Seznam vedoucích / mistrů (aktivní pracovníci s rolí Manager, s úrovní >= 2, nebo s oprávněním schvalovat)
  const supervisors = useMemo(() => {
    const active = employees.filter(e => e.isActive);
    const result = active.filter(e => {
      const r = roleMap.get(e.customRoleId || '');
      const hasLevel = r && r.level >= 2;
      const canApprove = r && r.canApproveWeekly;
      const isMgr = e.role === 'Manager';
      const hasSubordinates = employees.some(sub => sub.supervisorId === e.id);
      return hasLevel || canApprove || isMgr || hasSubordinates;
    });

    // Seřadit podle úrovně sestupně, poté podle jména
    return result.sort((a, b) => {
      const rA = roleMap.get(a.customRoleId || '');
      const rB = roleMap.get(b.customRoleId || '');
      const levA = rA?.level || (a.role === 'Manager' ? 5 : 1);
      const levB = rB?.level || (b.role === 'Manager' ? 5 : 1);
      if (levB !== levA) return levB - levA;
      return a.name.localeCompare(b.name, 'cs');
    });
  }, [employees, roleMap]);

  // Mapa podřízených podle ID vedoucího
  const subordinatesMap = useMemo(() => {
    const map = new Map<string, Employee[]>();
    supervisors.forEach(s => map.set(s.id, []));

    employees.filter(e => e.isActive).forEach(e => {
      if (e.supervisorId && map.has(e.supervisorId)) {
        map.get(e.supervisorId)!.push(e);
      }
    });

    return map;
  }, [employees, supervisors]);

  // Nepřiřazení zaměstnanci (aktivní, nemají vedoucího a nejsou hlavní admin)
  const unassignedEmployees = useMemo(() => {
    return employees.filter(e => e.isActive && !e.supervisorId && !isRootAdmin(e));
  }, [employees]);

  // Počet přiřazených pracovníků
  const assignedCount = useMemo(() => {
    return employees.filter(e => e.isActive && !!e.supervisorId).length;
  }, [employees]);

  // Přímé přiřazení jednoho zaměstnance
  const handleAssignSingle = (empId: string, supId: string | undefined) => {
    const target = employees.find(e => e.id === empId);
    if (!target) return;
    const supervisorObj = supId ? employees.find(s => s.id === supId) : null;
    
    onUpdateEmployee({
      ...target,
      supervisorId: supId || undefined
    });

    if (supervisorObj) {
      showToast(`Zaměstnanec ${target.name} byl přiřazen k vedoucímu ${supervisorObj.name}.`);
    } else {
      showToast(`U zaměstnance ${target.name} bylo přiřazení k vedoucímu zrušeno.`);
    }
  };

  // Hromadné přiřazení označených zaměstnanců
  const handleBulkAssign = (supId: string | undefined) => {
    if (tableSelectedEmpIds.length === 0) return;
    const targetSup = supId ? employees.find(s => s.id === supId) : null;

    tableSelectedEmpIds.forEach(id => {
      const emp = employees.find(e => e.id === id);
      if (emp) {
        onUpdateEmployee({
          ...emp,
          supervisorId: supId || undefined
        });
      }
    });

    if (targetSup) {
      showToast(`Úspěšně přiřazeno ${tableSelectedEmpIds.length} pracovníků k vedoucímu ${targetSup.name}.`);
    } else {
      showToast(`U ${tableSelectedEmpIds.length} pracovníků byl odebrán vedoucí.`);
    }

    setTableSelectedEmpIds([]);
    setBulkTargetSupervisorId('');
  };

  // Otevření modálu pro přiřazení k danému vedoucímu
  const handleOpenAssignModal = (sup: Employee) => {
    setSelectedSupervisorForModal(sup);
    setModalSearch('');
    setModalFilterTab('unassigned');
    // Předvybrat zaměstnance, kteří již k tomuto vedoucímu patří
    const currentSubs = subordinatesMap.get(sup.id) || [];
    setModalSelectedEmpIds(currentSubs.map(s => s.id));
  };

  // Uložení výběru z modálu
  const handleSaveModal = () => {
    if (!selectedSupervisorForModal) return;
    const supId = selectedSupervisorForModal.id;
    const currentSubs = subordinatesMap.get(supId) || [];
    const currentSubIds = new Set(currentSubs.map(s => s.id));
    const newSelectedIds = new Set(modalSelectedEmpIds);

    // Přidat nově vybrané
    modalSelectedEmpIds.forEach(id => {
      if (!currentSubIds.has(id)) {
        const emp = employees.find(e => e.id === id);
        if (emp) {
          onUpdateEmployee({ ...emp, supervisorId: supId });
        }
      }
    });

    // Odebrat odznačené (kteří dříve patřili k tomuto vedoucímu)
    currentSubs.forEach(emp => {
      if (!newSelectedIds.has(emp.id)) {
        onUpdateEmployee({ ...emp, supervisorId: undefined });
      }
    });

    showToast(`Tým vedoucího ${selectedSupervisorForModal.name} byl aktualizován (${modalSelectedEmpIds.length} pracovníků).`);
    setSelectedSupervisorForModal(null);
    setModalSelectedEmpIds([]);
  };

  // Filtrování zaměstnanců pro tabulkový pohled
  const filteredTableEmployees = useMemo(() => {
    return employees
      .filter(e => e.isActive)
      .filter(e => {
        if (!tableSearch.trim()) return true;
        const q = tableSearch.toLowerCase().trim();
        return e.name.toLowerCase().includes(q) || (e.email && e.email.toLowerCase().includes(q));
      })
      .filter(e => {
        if (tableSupervisorFilter === 'all') return true;
        if (tableSupervisorFilter === 'unassigned') return !e.supervisorId && !isRootAdmin(e);
        return e.supervisorId === tableSupervisorFilter;
      })
      .filter(e => {
        if (tableDeptFilter === 'all') return true;
        return e.department === tableDeptFilter;
      });
  }, [employees, tableSearch, tableSupervisorFilter, tableDeptFilter]);

  // Zaměstnanci pro modální okno přiřazení
  const modalCandidates = useMemo(() => {
    if (!selectedSupervisorForModal) return [];
    const sup = selectedSupervisorForModal;

    return employees
      .filter(e => e.isActive && e.id !== sup.id)
      .filter(e => {
        if (!modalSearch.trim()) return true;
        const q = modalSearch.toLowerCase().trim();
        return e.name.toLowerCase().includes(q) || (e.email && e.email.toLowerCase().includes(q));
      })
      .filter(e => {
        if (modalFilterTab === 'unassigned') {
          // Zobrazit nepřiřazené + ty, co už u tohoto vedoucího jsou
          return !e.supervisorId || e.supervisorId === sup.id;
        }
        if (modalFilterTab === 'same_dept') {
          return e.department === sup.department;
        }
        return true;
      });
  }, [employees, selectedSupervisorForModal, modalSearch, modalFilterTab]);

  return (
    <div className="space-y-6">
      {/* Toast notifikace */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-500 font-bold text-xs flex items-center gap-2 animate-bounce">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Horní hlavička sekce */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 rounded-3xl text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-indigo-500/30 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold text-indigo-200">
              <span>👔</span>
              <span>Organizace týmů a schvalovatelů</span>
            </div>
            <h3 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Přiřazení konkrétních lidí ke konkrétnímu vedoucímu
            </h3>
            <p className="text-xs text-indigo-200 leading-relaxed">
              Zde snadno a rychle propojíte dělníky a předáky s jejich mistrem či vedoucím. 
              Přiřazený vedoucí má povinnost každý pátek schválit týdenní docházku svého týmu.
            </p>
          </div>

          {/* Přepínač pohledů */}
          <div className="flex items-center gap-1.5 bg-black/25 p-1 rounded-2xl border border-white/10 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards' 
                  ? 'bg-white text-indigo-950 shadow-sm' 
                  : 'text-indigo-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>🗂️</span>
              <span>Karty vedoucích</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table' 
                  ? 'bg-white text-indigo-950 shadow-sm' 
                  : 'text-indigo-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>📋</span>
              <span>Rychlá tabulka & hromadně</span>
            </button>
          </div>
        </div>

        {/* Metriky přiřazení */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xs border border-white/10">
            <span className="text-[10px] text-indigo-200 uppercase font-black tracking-wider block">Celkem zaměstnanců</span>
            <span className="text-xl font-black text-white mt-0.5 block">{employees.length}</span>
          </div>

          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xs border border-white/10">
            <span className="text-[10px] text-indigo-200 uppercase font-black tracking-wider block">Vedoucí & mistři</span>
            <span className="text-xl font-black text-amber-300 mt-0.5 block">{supervisors.length}</span>
          </div>

          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xs border border-white/10">
            <span className="text-[10px] text-indigo-200 uppercase font-black tracking-wider block">Přiřazeno v týmech</span>
            <span className="text-xl font-black text-emerald-300 mt-0.5 block">{assignedCount}</span>
          </div>

          <div className={`p-3 rounded-2xl backdrop-blur-xs border transition-all ${
            unassignedEmployees.length > 0 
              ? 'bg-amber-500/20 border-amber-400/40 text-amber-200' 
              : 'bg-white/10 border-white/10 text-white'
          }`}>
            <span className="text-[10px] text-amber-200 uppercase font-black tracking-wider block">
              ⚠️ Bez vedoucího
            </span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xl font-black text-amber-300">{unassignedEmployees.length}</span>
              {unassignedEmployees.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('table');
                    setTableSupervisorFilter('unassigned');
                  }}
                  className="text-[10px] px-2 py-0.5 bg-amber-400 text-amber-950 font-black rounded-lg hover:bg-amber-300 transition-colors cursor-pointer"
                >
                  Vyřešit ➔
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POHLED 1: KARTY VEDOUCÍCH (PŘEHLED TÝMŮ)                                  */}
      {/* ========================================================================= */}
      {viewMode === 'cards' && (
        <div className="space-y-6">
          {/* Upozornění na nepřiřazené pracovníky */}
          {unassignedEmployees.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-2xl shrink-0">⚠️</span>
                <div>
                  <strong className="block font-black text-sm text-amber-950">
                    {unassignedEmployees.length} zaměstnanců zatím nemá přiřazeného vedoucího
                  </strong>
                  <span>
                    Pro kontrolu docházky v pátek je nutné přiřadit každého dělníka k mistrovi nebo vedoucímu.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('table');
                    setTableSupervisorFilter('unassigned');
                  }}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Rychle přiřadit v tabulce ➔
                </button>
              </div>
            </div>
          )}

          {/* Mřížka vedoucích */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {supervisors.map(sup => {
              const subs = subordinatesMap.get(sup.id) || [];
              const supRole = roleMap.get(sup.customRoleId || '') || {
                name: sup.role,
                level: sup.role === 'Manager' ? 5 : 2,
                badgeColor: sup.role === 'Manager' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-slate-100 text-slate-700 border-slate-300'
              };
              const isWin3 = isRootAdmin(sup);

              return (
                <div 
                  key={sup.id}
                  className="bg-white rounded-3xl border border-slate-200 hover:border-indigo-300 transition-all shadow-xs flex flex-col justify-between overflow-hidden"
                >
                  {/* Horní hlavička karty vedoucího */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={sup.avatar} 
                          alt="" 
                          className="w-12 h-12 rounded-2xl bg-white border border-slate-200 object-cover shrink-0 shadow-2xs" 
                        />
                        <div className="min-w-0">
                          <div className="font-black text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{sup.name}</span>
                            {isWin3 && <span title="Hlavní správce" className="text-xs">👑</span>}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">{sup.email || 'Bez e-mailu'}</div>
                          
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${supRole.badgeColor || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                              L{supRole.level} • {supRole.name}
                            </span>
                            <span className="text-[10px] font-mono font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {formatDepartment(sup.department)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Počet v týmu */}
                      <span className={`px-2.5 py-1 rounded-xl font-black text-xs shrink-0 ${
                        subs.length > 0 
                          ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {subs.length} {subs.length === 1 ? 'člověk' : subs.length >= 2 && subs.length <= 4 ? 'lidé' : 'lidí'}
                      </span>
                    </div>
                  </div>

                  {/* Seznam přiřazených podřízených */}
                  <div className="p-5 flex-1 space-y-2.5">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Pracovníci v týmu ({subs.length}):
                      </span>
                      {subs.length > 0 && (
                        <span className="text-[10px] text-slate-400">
                          Kliknutím na ✕ odeberete
                        </span>
                      )}
                    </div>

                    {subs.length === 0 ? (
                      <div className="py-6 px-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                        <span className="text-2xl block">👥</span>
                        <p className="text-xs text-slate-500 font-medium">Zatím žádní přiřazení lidé</p>
                        <p className="text-[11px] text-slate-400">Klikněte níže na tlačítko a vyberte pracovníky pro tento tým.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {subs.map(sub => {
                          const subRole = roleMap.get(sub.customRoleId || '');
                          return (
                            <div 
                              key={sub.id}
                              className="group flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 transition-colors text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img 
                                  src={sub.avatar} 
                                  alt="" 
                                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 object-cover shrink-0" 
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate">{sub.name}</div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <span>{subRole?.name || sub.role}</span>
                                    <span>•</span>
                                    <span>{formatDepartment(sub.department)}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAssignSingle(sub.id, undefined)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all cursor-pointer text-xs"
                                title={`Odebrat ${sub.name} z týmu tohoto vedoucího`}
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Spodní akční tlačítko pro přiřazení lidí */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenAssignModal(sup)}
                      className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>➕</span>
                      <span>Přiřadit pracovníky k tomuto vedoucímu</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Karta s nepřiřazenými pracovníky k okamžitému rozřazení */}
          {unassignedEmployees.length > 0 && (
            <div className="bg-white rounded-3xl border border-amber-300 p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <h4 className="font-black text-sm text-slate-900">
                      Rychlé rozřazení nepřiřazených pracovníků ({unassignedEmployees.length})
                    </h4>
                    <p className="text-xs text-slate-500">
                      U každého pracovníka můžete přímo vybrat jeho vedoucího:
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unassignedEmployees.map(emp => {
                  const empRole = roleMap.get(emp.customRoleId || '');
                  return (
                    <div 
                      key={emp.id} 
                      className="p-3 bg-amber-50/40 rounded-2xl border border-amber-200/80 flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={emp.avatar} alt="" className="w-8 h-8 rounded-full bg-white border border-amber-200" />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">{emp.name}</div>
                          <div className="text-[10px] text-slate-500">
                            {empRole?.name || emp.role} • {formatDepartment(emp.department)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-amber-900 uppercase block mb-1">
                          Vyberte vedoucího:
                        </label>
                        <select
                          value=""
                          onChange={e => {
                            if (e.target.value) {
                              handleAssignSingle(emp.id, e.target.value);
                            }
                          }}
                          className="w-full h-8 px-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="">Zvolit vedoucího...</option>
                          {supervisors.map(s => {
                            const sRole = roleMap.get(s.customRoleId || '');
                            return (
                              <option key={s.id} value={s.id}>
                                {s.name} ({sRole?.name || s.role})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* POHLED 2: RYCHLÁ TABULKA A HROMADNÉ PŘIŘAZENÍ                             */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="space-y-4">
          {/* Vyhledávací a filtrovací lišta */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Vyhledávání */}
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Hledat zaměstnance podle jména..."
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
                {tableSearch && (
                  <button
                    type="button"
                    onClick={() => setTableSearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtr podle vedoucího */}
              <select
                value={tableSupervisorFilter}
                onChange={e => setTableSupervisorFilter(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Všichni zaměstnanci</option>
                <option value="unassigned">⚠️ Pouze bez vedoucího ({unassignedEmployees.length})</option>
                <optgroup label="Podle konkrétního vedoucího">
                  {supervisors.map(s => {
                    const count = (subordinatesMap.get(s.id) || []).length;
                    return (
                      <option key={s.id} value={s.id}>
                        Tým: {s.name} ({count} lidí)
                      </option>
                    );
                  })}
                </optgroup>
              </select>

              {/* Filtr podle střediska */}
              <select
                value={tableDeptFilter}
                onChange={e => setTableDeptFilter(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Všechna střediska</option>
                {DEPARTMENT_OPTIONS.map(opt => (
                  <option key={opt.code} value={opt.code}>{opt.name}</option>
                ))}
              </select>
            </div>

            <span className="text-[11px] text-slate-500 font-bold shrink-0">
              Nalezeno {filteredTableEmployees.length} zaměstnanců
            </span>
          </div>

          {/* Hromadná lišta akcí (pokud je zaškrtnut alespoň 1 zaměstnanec) */}
          {tableSelectedEmpIds.length > 0 && (
            <div className="bg-indigo-900 text-white p-4 rounded-2xl border border-indigo-700 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center font-black text-xs">
                  {tableSelectedEmpIds.length}
                </span>
                <span className="font-bold">
                  Vybráno {tableSelectedEmpIds.length} {tableSelectedEmpIds.length === 1 ? 'zaměstnanec' : tableSelectedEmpIds.length <= 4 ? 'zaměstnanci' : 'zaměstnanců'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={bulkTargetSupervisorId}
                  onChange={e => setBulkTargetSupervisorId(e.target.value)}
                  className="h-9 px-3 bg-white text-slate-900 border border-white rounded-xl text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="">Vyberte cílového vedoucího...</option>
                  {supervisors.map(s => {
                    const sRole = roleMap.get(s.customRoleId || '');
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({sRole?.name || s.role})
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  disabled={!bulkTargetSupervisorId}
                  onClick={() => handleBulkAssign(bulkTargetSupervisorId)}
                  className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  ✓ Přiřadit vybrané
                </button>

                <button
                  type="button"
                  onClick={() => handleBulkAssign(undefined)}
                  className="h-9 px-3 bg-rose-600/80 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors cursor-pointer"
                  title="Odebere vedoucího všem označeným pracovníkům"
                >
                  Odebrat vedoucího
                </button>

                <button
                  type="button"
                  onClick={() => setTableSelectedEmpIds([])}
                  className="h-9 px-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Zrušit výběr
                </button>
              </div>
            </div>
          )}

          {/* Samotná tabulka */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black tracking-wider text-slate-500">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredTableEmployees.length > 0 && 
                          filteredTableEmployees.every(e => tableSelectedEmpIds.includes(e.id))
                        }
                        onChange={e => {
                          if (e.target.checked) {
                            setTableSelectedEmpIds(filteredTableEmployees.map(emp => emp.id));
                          } else {
                            setTableSelectedEmpIds([]);
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5">Zaměstnanec</th>
                    <th className="p-3.5">Role ve stromu</th>
                    <th className="p-3.5 text-center">Středisko</th>
                    <th className="p-3.5">Přiřazený vedoucí / schvalovatel</th>
                    <th className="p-3.5 text-center">Stav</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTableEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Žádní zaměstnanci neodpovídají zadaným filtrům.
                      </td>
                    </tr>
                  ) : (
                    filteredTableEmployees.map(emp => {
                      const isSelected = tableSelectedEmpIds.includes(emp.id);
                      const isRoot = isRootAdmin(emp);
                      const empRole = roleMap.get(emp.customRoleId || '') || {
                        name: emp.role,
                        level: emp.role === 'Manager' ? 5 : 1,
                        badgeColor: 'bg-slate-100 text-slate-700 border-slate-300'
                      };
                      const currentSupervisor = emp.supervisorId ? employees.find(s => s.id === emp.supervisorId) : null;

                      return (
                        <tr 
                          key={emp.id} 
                          className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}
                        >
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                if (e.target.checked) {
                                  setTableSelectedEmpIds(prev => [...prev, emp.id]);
                                } else {
                                  setTableSelectedEmpIds(prev => prev.filter(id => id !== emp.id));
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>

                          {/* Zaměstnanec */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <img src={emp.avatar} alt="" className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 shrink-0" />
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{emp.name}</span>
                                  {isRoot && <span title="Hlavní správce">👑</span>}
                                </div>
                                <div className="text-[10px] text-slate-400">{emp.email || 'Bez e-mailu'}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${empRole.badgeColor || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                              L{empRole.level} • {empRole.name}
                            </span>
                          </td>

                          {/* Středisko */}
                          <td className="p-3.5 text-center">
                            <span className="font-mono text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {formatDepartment(emp.department)}
                            </span>
                          </td>

                          {/* Přímý výběr vedoucího v řádku */}
                          <td className="p-3.5">
                            <select
                              value={emp.supervisorId || ''}
                              onChange={e => handleAssignSingle(emp.id, e.target.value || undefined)}
                              className={`w-full max-w-[240px] h-9 px-2.5 rounded-xl text-xs font-bold border transition-all outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                                emp.supervisorId 
                                  ? 'bg-white border-slate-300 text-slate-900' 
                                  : 'bg-amber-50 border-amber-300 text-amber-900 font-black'
                              }`}
                            >
                              <option value="">⚠️ Bez vedoucího (nezařazeno)</option>
                              {supervisors
                                .filter(s => s.id !== emp.id)
                                .map(s => {
                                  const sRole = roleMap.get(s.customRoleId || '');
                                  return (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({sRole?.name || s.role})
                                    </option>
                                  );
                                })}
                            </select>
                          </td>

                          {/* Stav přiřazení */}
                          <td className="p-3.5 text-center">
                            {currentSupervisor ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-black">
                                <span>✓</span>
                                <span>{currentSupervisor.name}</span>
                              </span>
                            ) : isRoot ? (
                              <span className="text-[10px] text-slate-400 font-bold">Správce</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg text-[10px] font-black animate-pulse">
                                <span>⚠️</span>
                                <span>Nepřiřazeno</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODÁLNÍ DIALOG: PŘIŘAZENÍ PRACOVNÍKŮ K DANÉMU VEDOUCÍMU                  */}
      {/* ========================================================================= */}
      {selectedSupervisorForModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
            {/* Hlavička modálu */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedSupervisorForModal.avatar} 
                  alt="" 
                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 object-cover shrink-0 shadow-2xs" 
                />
                <div>
                  <h4 className="font-black text-base text-slate-900">
                    Přiřadit pracovníky k vedoucímu
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-indigo-700 text-xs">{selectedSupervisorForModal.name}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 text-xs font-mono">{formatDepartment(selectedSupervisorForModal.department)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSupervisorForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Filtry uvnitř modálu */}
            <div className="p-4 border-b border-slate-100 bg-white space-y-2.5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Vyhledat pracovníka..."
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setModalFilterTab('unassigned')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      modalFilterTab === 'unassigned' 
                        ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Bez vedoucího ({unassignedEmployees.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFilterTab('same_dept')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      modalFilterTab === 'same_dept' 
                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-300' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Středisko {selectedSupervisorForModal.department || ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFilterTab('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      modalFilterTab === 'all' 
                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-300' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Všichni
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const allCandidateIds = modalCandidates.map(c => c.id);
                      setModalSelectedEmpIds(Array.from(new Set([...modalSelectedEmpIds, ...allCandidateIds])));
                    }}
                    className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Vybrat vše
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setModalSelectedEmpIds([])}
                    className="font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Zrušit výběr
                  </button>
                </div>
              </div>
            </div>

            {/* Seznam kandidátů s checkboxy */}
            <div className="p-4 flex-1 overflow-y-auto divide-y divide-slate-100 max-h-96">
              {modalCandidates.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Žádní pracovníci neodpovídají zadanému filtru.
                </div>
              ) : (
                modalCandidates.map(emp => {
                  const isChecked = modalSelectedEmpIds.includes(emp.id);
                  const isCurrentlyAssignedHere = emp.supervisorId === selectedSupervisorForModal.id;
                  const otherSupervisor = !isCurrentlyAssignedHere && emp.supervisorId ? employees.find(s => s.id === emp.supervisorId) : null;
                  const empRole = roleMap.get(emp.customRoleId || '');

                  return (
                    <label 
                      key={emp.id}
                      className={`flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer ${
                        isChecked ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setModalSelectedEmpIds(prev => [...prev, emp.id]);
                            } else {
                              setModalSelectedEmpIds(prev => prev.filter(id => id !== emp.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <img src={emp.avatar} alt="" className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                            <span>{emp.name}</span>
                            {empRole && (
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${empRole.badgeColor || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                                {empRole.name}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {formatDepartment(emp.department)}
                            {otherSupervisor && (
                              <span className="text-amber-700 ml-1.5 font-semibold">
                                (nyní u: {otherSupervisor.name})
                              </span>
                            )}
                            {!emp.supervisorId && (
                              <span className="text-amber-600 ml-1.5 font-bold">
                                (⚠️ bez vedoucího)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isCurrentlyAssignedHere && (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                          ✓ V týmu
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            {/* Spodní lišta modálu s potvrzením */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-700">
                Vybráno: <strong className="text-indigo-600">{modalSelectedEmpIds.length}</strong> pracovníků
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSupervisorForModal(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                >
                  ✓ Uložit přiřazení k {selectedSupervisorForModal.name}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorAssignmentPanel;
