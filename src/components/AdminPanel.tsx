import React, { useState, useRef, useMemo } from 'react';
import { 
  Employee, 
  Job, 
  formatDepartment, 
  DEPARTMENT_OPTIONS, 
  ResponsibilityRole, 
  DEFAULT_RESPONSIBILITY_ROLES 
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getFullBackup, restoreBackup } from '../services/supabase';
import { isRootAdmin } from '../services/mockData';
import { getStoredRoles, saveStoredRoles } from '../services/roleService';
import PinPadModal from './PinPadModal';
import SupervisorAssignmentPanel from './SupervisorAssignmentPanel';

interface AdminPanelProps {
  currentUser: Employee;
  employees: Employee[];
  jobs: Job[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onToggleEmployeeStatus: (id: string, isActive: boolean) => void;
  onDeleteEmployee?: (id: string) => void;
  onAddJob: (job: Job) => void;
  onUpdateJob: (job: Job) => void;
  onToggleJobStatus: (id: string, isActive: boolean) => void;
}

const COLOR_OPTIONS = [
  { label: 'Břidlicová (Dělník)', value: 'bg-slate-100 text-slate-800 border-slate-300' },
  { label: 'Modrá (Předák)', value: 'bg-blue-100 text-blue-900 border-blue-300' },
  { label: 'Jantarová (Mistr)', value: 'bg-amber-100 text-amber-900 border-amber-300' },
  { label: 'Fialová (Vedoucí výroby)', value: 'bg-purple-100 text-purple-900 border-purple-300' },
  { label: 'Zelená (Vedení / Mzdy)', value: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { label: 'Oranžová (Speciální provoz)', value: 'bg-orange-100 text-orange-900 border-orange-300' },
  { label: 'Tyrkysová (Doprava / Logistika)', value: 'bg-cyan-100 text-cyan-900 border-cyan-300' },
  { label: 'Růžová (Kontrola jakosti)', value: 'bg-rose-100 text-rose-900 border-rose-300' }
];

const LEVEL_NAMES: Record<number, string> = {
  1: 'Úroveň 1: Dělník (Zápis docházky)',
  2: 'Úroveň 2: Předák (Denní dohled nad partou)',
  3: 'Úroveň 3: Mistr (Týdenní schvalování v pátek)',
  4: 'Úroveň 4: Vedoucí výroby (Dohled nad středisky)',
  5: 'Úroveň 5: Vedení / Mzdy / Admin (Kompletní správa)'
};

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  currentUser,
  employees, 
  jobs, 
  onAddEmployee, 
  onUpdateEmployee, 
  onToggleEmployeeStatus, 
  onDeleteEmployee,
  onAddJob, 
  onUpdateJob,
  onToggleJobStatus
}) => {
  // Aktivní podzáložka v administraci
  const [adminTab, setAdminTab] = useState<'employees' | 'devices' | 'supervisors' | 'roles' | 'jobs' | 'backup'>('employees');

  // Počet aktivních zaměstnanců bez přiřazeného vedoucího
  const unassignedCount = useMemo(() => {
    return employees.filter(e => e.isActive && !e.supervisorId && !isRootAdmin(e)).length;
  }, [employees]);

  // STROM ODPOVĚDNOSTÍ & ROLE
  const [roles, setRoles] = useState<ResponsibilityRole[]>(() => getStoredRoles());
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormLevel, setRoleFormLevel] = useState<number>(1);
  const [roleFormDesc, setRoleFormDesc] = useState('');
  const [roleFormColor, setRoleFormColor] = useState(COLOR_OPTIONS[0].value);
  const [roleFormCanApprove, setRoleFormCanApprove] = useState(false);
  const [roleFormCanManage, setRoleFormCanManage] = useState(false);

  // ZAMĚSTNANCI
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'Manager' | 'Zaměstnanec'>('Zaměstnanec');
  const [newEmpCustomRoleId, setNewEmpCustomRoleId] = useState<string>('role-delnik');
  const [newEmpSupervisorId, setNewEmpSupervisorId] = useState<string>('');
  const [newEmpPin, setNewEmpPin] = useState('');
  const [showPinField, setShowPinField] = useState(false);
    const [newEmpAvatar, setNewEmpAvatar] = useState<string>('');
  const [newEmpDepartment, setNewEmpDepartment] = useState<'101' | '102' | '103' | string>('102');
  
  // Bezpečnostní ověření PINem pro administrátora Win3 Support
  const [isVerifyingAdminPin, setIsVerifyingAdminPin] = useState(false);
  const [pendingAdminEditEmp, setPendingAdminEditEmp] = useState<Employee | null>(null);

  // ZAKÁZKY
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [newJobName, setNewJobName] = useState('');
  const [newJobCode, setNewJobCode] = useState('');

  // ZÁLOHY
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seřazené role podle úrovně sestupně (5 -> 1)
  const sortedRolesDesc = useMemo(() => {
    return [...roles].sort((a, b) => b.level - a.level);
  }, [roles]);

  // Pomocná mapa rolí podle ID
  const roleMap = useMemo(() => {
    const map = new Map<string, ResponsibilityRole>();
    roles.forEach(r => map.set(r.id, r));
    return map;
  }, [roles]);

  const handleDownloadBackup = async () => {
    setIsBackupLoading(true);
    try {
      const data = await getFullBackup();
      const backupWithRoles = {
        ...data,
        roles
      };
      const blob = new Blob([JSON.stringify(backupWithRoles, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kabel_zaloha_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Chyba při stahování zálohy: ' + err.message);
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('VAROVÁNÍ: Obnova dat ze zálohy nahradí aktuální stav databáze. Chcete pokračovat?')) {
      e.target.value = '';
      return;
    }

    setIsBackupLoading(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      if (backupData.roles && Array.isArray(backupData.roles)) {
        setRoles(backupData.roles);
        saveStoredRoles(backupData.roles);
      }
      await restoreBackup(backupData);
      alert('Data firmy Kabel byla úspěšně obnovena ze zálohy!');
      window.location.reload();
    } catch (err: any) {
      alert('Chyba při obnově dat: ' + err.message);
    } finally {
      setIsBackupLoading(false);
      e.target.value = '';
    }
  };

  // ===================== OPERACE SE STROMEM ROLÍ =====================
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName.trim()) return;

    let updated: ResponsibilityRole[];
    if (editingRoleId) {
      updated = roles.map(r => r.id === editingRoleId ? {
        ...r,
        name: roleFormName.trim(),
        level: Number(roleFormLevel),
        description: roleFormDesc.trim(),
        badgeColor: roleFormColor,
        canApproveWeekly: roleFormCanApprove,
        canManageAll: roleFormCanManage
      } : r);
    } else {
      const newRole: ResponsibilityRole = {
        id: `role-${uuidv4().slice(0, 8)}`,
        name: roleFormName.trim(),
        level: Number(roleFormLevel),
        description: roleFormDesc.trim(),
        badgeColor: roleFormColor,
        canApproveWeekly: roleFormCanApprove,
        canManageAll: roleFormCanManage
      };
      updated = [...roles, newRole];
    }

    setRoles(updated);
    saveStoredRoles(updated);
    handleCancelRoleEdit();
  };

  const startEditingRole = (r: ResponsibilityRole) => {
    setEditingRoleId(r.id);
    setRoleFormName(r.name);
    setRoleFormLevel(r.level);
    setRoleFormDesc(r.description || '');
    setRoleFormColor(r.badgeColor || COLOR_OPTIONS[0].value);
    setRoleFormCanApprove(!!r.canApproveWeekly);
    setRoleFormCanManage(!!r.canManageAll);
  };

  const handleCancelRoleEdit = () => {
    setEditingRoleId(null);
    setRoleFormName('');
    setRoleFormLevel(1);
    setRoleFormDesc('');
    setRoleFormColor(COLOR_OPTIONS[0].value);
    setRoleFormCanApprove(false);
    setRoleFormCanManage(false);
  };

  const handleDeleteRole = (id: string) => {
    const roleToDelete = roles.find(r => r.id === id);
    if (!roleToDelete) return;

    if (id === 'role-delnik' || id === 'role-vedeni') {
      alert('Základní systémové role Dělník a Vedení / Admin nelze smazat.');
      return;
    }

    const assignedCount = employees.filter(e => e.customRoleId === id).length;
    if (assignedCount > 0) {
      if (!confirm(`Tato role je přiřazena ${assignedCount} zaměstnancům. Chcete ji opravdu smazat? Zaměstnanci budou přeřazeni na roli Dělník.`)) {
        return;
      }
      // Přeřadit zaměstnance
      employees.forEach(emp => {
        if (emp.customRoleId === id) {
          onUpdateEmployee({
            ...emp,
            customRoleId: 'role-delnik'
          });
        }
      });
    } else {
      if (!confirm(`Opravdu chcete smazat roli „${roleToDelete.name}“?`)) {
        return;
      }
    }

    const updated = roles.filter(r => r.id !== id);
    setRoles(updated);
    saveStoredRoles(updated);
  };

  const handleResetRoles = () => {
    if (confirm('Chcete obnovit výchozí strom odpovědností firmy Kabel (Dělník, Předák, Mistr, Vedoucí výroby, Vedení / Mzdy)?')) {
      setRoles(DEFAULT_RESPONSIBILITY_ROLES);
      saveStoredRoles(DEFAULT_RESPONSIBILITY_ROLES);
      handleCancelRoleEdit();
    }
  };

  // ===================== OPERACE SE ZAMĚSTNANCI =====================
  const handleAddEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;

    const selectedRoleObj = roles.find(r => r.id === newEmpCustomRoleId);
    // Systémová role 'Manager' pokud má schvalování týdne nebo plnou správu
    let systemRole: 'Manager' | 'Zaměstnanec' = newEmpRole;
    if (selectedRoleObj?.canManageAll || selectedRoleObj?.canApproveWeekly || selectedRoleObj?.level && selectedRoleObj.level >= 3) {
      systemRole = 'Manager';
    } else {
      systemRole = 'Zaměstnanec';
    }
    
    if (editingEmpId) {
      const existingEmp = employees.find(emp => String(emp.id) === String(editingEmpId));
      if (existingEmp) {
        if (isRootAdmin(existingEmp) && !isRootAdmin(currentUser)) {
          alert('Profil hlavního administrátora Win3 Support nemohou běžní manažeři upravovat.');
          return;
        }

        const isTargetRootAdmin = isRootAdmin(existingEmp);
        const finalRole = isTargetRootAdmin ? 'Manager' : systemRole;
        const finalCustomRole = isTargetRootAdmin ? 'role-vedeni' : newEmpCustomRoleId;
        const finalPin = newEmpPin.trim() ? newEmpPin.trim() : existingEmp.pinCode;

        onUpdateEmployee({
          ...existingEmp,
          name: newEmpName.trim(),
          email: newEmpEmail.trim(),
          role: finalRole,
          customRoleId: finalCustomRole || undefined,
          supervisorId: newEmpSupervisorId || undefined,
          pinCode: finalPin,
          department: newEmpDepartment || undefined
        });
      }
      handleCancelEditEmp();
    } else {
      if (newEmpName.toLowerCase().includes('win3') && !isRootAdmin(currentUser)) {
        alert('Tento název profilu je vyhrazen pro hlavního administrátora.');
        return;
      }

      onAddEmployee({
        id: uuidv4(),
        name: newEmpName.trim(),
        email: newEmpEmail.trim(),
        role: systemRole,
        customRoleId: newEmpCustomRoleId || undefined,
        supervisorId: newEmpSupervisorId || undefined,
        avatar: newEmpAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newEmpName)}`,
        isActive: true,
        pinCode: newEmpPin.trim() || undefined,
        department: newEmpDepartment || undefined
      });
      handleCancelEditEmp();
    }
  };

  const startEditingEmp = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setNewEmpName(emp.name);
    setNewEmpEmail(emp.email || '');
    setNewEmpRole(emp.role);
    setNewEmpCustomRoleId(emp.customRoleId || (emp.role === 'Manager' ? 'role-vedeni' : 'role-delnik'));
    setNewEmpSupervisorId(emp.supervisorId || '');
    setNewEmpPin('');
    setNewEmpDepartment(emp.department || '102');
  };

  const handleEditEmpClick = (emp: Employee) => {
    if (isRootAdmin(emp)) {
      if (isRootAdmin(currentUser)) {
        if (currentUser.pinCode) {
          setPendingAdminEditEmp(emp);
          setIsVerifyingAdminPin(true);
          return;
        }
      } else {
        alert('Profil hlavního administrátora Win3 Support může upravovat pouze sám hlavní správce.');
        return;
      }
    }
    startEditingEmp(emp);
  };

  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const size = Math.min(img.width, img.height);
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;
        const TARGET_SIZE = 128;
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, TARGET_SIZE, TARGET_SIZE);
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        setNewEmpAvatar(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCancelEditEmp = () => {
    setEditingEmpId(null);
    setNewEmpName('');
    setNewEmpEmail('');
    setNewEmpRole('Zaměstnanec');
    setNewEmpCustomRoleId('role-delnik');
    setNewEmpSupervisorId('');
    setNewEmpPin('');
    setNewEmpDepartment('102');
  };

  // ===================== OPERACE SE ZAKÁZKAMI =====================
  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName.trim() || !newJobCode.trim()) return;

    if (editingJobId) {
      const existingJob = jobs.find(j => j.id === editingJobId);
      if (existingJob) {
        onUpdateJob({
          ...existingJob,
          name: newJobName.trim(),
          code: newJobCode.trim().toUpperCase()
        });
      }
      setEditingJobId(null);
    } else {
      onAddJob({
        id: uuidv4(),
        name: newJobName.trim(),
        code: newJobCode.trim().toUpperCase(),
        isActive: true
      });
    }
    setNewJobName('');
    setNewJobCode('');
  };

  const handleEditJobClick = (job: Job) => {
    setEditingJobId(job.id);
    setNewJobName(job.name);
    setNewJobCode(job.code);
  };

  const handleCancelEditJob = () => {
    setEditingJobId(null);
    setNewJobName('');
    setNewJobCode('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {/* Horní hlavička administrace */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>⚙️</span>
              <span>Správa systému firmy Kabel</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nastavení zaměstnanců, stromu odpovědností, zakázek a záloh databáze
            </p>
          </div>
        </div>

        {/* Přepínač podzáložek v administraci */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setAdminTab('employees')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              adminTab === 'employees' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>👥</span>
            <span>Zaměstnanci</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              adminTab === 'employees' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {employees.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab('supervisors')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              adminTab === 'supervisors' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>👔</span>
            <span>Přiřazení k vedoucím</span>
            {unassignedCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 animate-pulse">
                {unassignedCount} nepřiřazeno
              </span>
            ) : (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                adminTab === 'supervisors' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                ✓ Týmy
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setAdminTab('roles')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              adminTab === 'roles' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>🌳</span>
            <span>Strom odpovědností a role</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              adminTab === 'roles' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {roles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab('jobs')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              adminTab === 'jobs' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>📁</span>
            <span>Zakázky a střediska</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              adminTab === 'jobs' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {jobs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab('backup')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              adminTab === 'backup' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>💾</span>
            <span>Záloha databáze</span>
          </button>
        </div>

        {/* ======================= PODZÁLOŽKA 1: ZAMĚSTNANCI ======================= */}
        {adminTab === 'employees' && (
          <div className="space-y-6">
            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950">
              <div>
                <strong className="block font-black text-sm text-indigo-900">Správa zaměstnanců a rolí</strong>
                <span>Zde spravujete profily zaměstnanců, jejich role a výchozí střediska. Pro přehledné hromadné rozřazení pracovníků k vedoucím využijte záložku Přiřazení k vedoucím.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setAdminTab('supervisors')}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>👔</span>
                  <span>Přiřazení k vedoucím ➔</span>
                  {unassignedCount > 0 && (
                    <span className="bg-amber-400 text-amber-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                      {unassignedCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('roles')}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Strom rolí ➔
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Formulář pro přidání/úpravu zaměstnance */}
              <div className="lg:col-span-1">
                <form onSubmit={handleAddEmp} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3.5 sticky top-6 shadow-2xs">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <span>{editingEmpId ? '✏️ Upravit zaměstnance' : '➕ Nový zaměstnanec'}</span>
                  </h4>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Jméno a příjmení:</label>
                    <input 
                      type="text" 
                      placeholder="např. Petr Novák" 
                      value={newEmpName} 
                      onChange={e => setNewEmpName(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Firemní e-mail:</label>
                    <input 
                      type="email" 
                      placeholder="novak@kabel.cz" 
                      value={newEmpEmail} 
                      onChange={e => setNewEmpEmail(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  {/* VÝBĚR ROLE VE STROMU ODPOVĚDNOSTÍ */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Role ve stromu odpovědností:
                    </label>
                    <select
                      value={newEmpCustomRoleId}
                      onChange={e => {
                        const rId = e.target.value;
                        setNewEmpCustomRoleId(rId);
                        const matchedRole = roles.find(r => r.id === rId);
                        if (matchedRole?.canManageAll || matchedRole?.canApproveWeekly || (matchedRole?.level && matchedRole.level >= 3)) {
                          setNewEmpRole('Manager');
                        } else {
                          setNewEmpRole('Zaměstnanec');
                        }
                      }}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {sortedRolesDesc.map(r => (
                        <option key={r.id} value={r.id}>
                          Úroveň {r.level}: {r.name} {r.canApproveWeekly ? '✓ (Páteční schvalovatel)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PŘÍMÝ NADŘÍZENÝ / SCHVALOVATEL */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Přímý nadřízený / schvalovatel:
                    </label>
                    <select
                      value={newEmpSupervisorId}
                      onChange={e => setNewEmpSupervisorId(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Bez přímého nadřízeného (dle střediska)</option>
                      {employees
                        .filter(e => e.id !== editingEmpId && e.isActive)
                        .map(sup => {
                          const supRole = roleMap.get(sup.customRoleId || '');
                          return (
                            <option key={sup.id} value={sup.id}>
                              {sup.name} ({supRole?.name || sup.role})
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  {/* Výchozí středisko */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Výchozí středisko:</label>
                    <select
                      value={newEmpDepartment}
                      onChange={e => setNewEmpDepartment(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {DEPARTMENT_OPTIONS.map(opt => (
                        <option key={opt.code} value={opt.code}>{opt.name}</option>
                      ))}
                      <option value="">Bez střediska</option>
                    </select>
                  </div>

                  {/* PIN pro rychlé přepínání na mobilu */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">PIN pro přepínání na tabletu (4 čísla):</label>
                    <div className="relative">
                      <input 
                        type={showPinField ? "text" : "password"} 
                        placeholder={editingEmpId && employees.find(e => e.id === editingEmpId)?.pinCode ? "•••• (PIN nastaven)" : "PIN (např. 1234)"} 
                        value={newEmpPin} 
                        maxLength={4}
                        onChange={e => setNewEmpPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full h-10 pl-3 pr-8 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 outline-none text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPinField(prev => !prev)}
                        className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                        title={showPinField ? "Skrýt PIN" : "Zobrazit PIN"}
                      >
                        {showPinField ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  {editingEmpId && isRootAdmin(employees.find(e => e.id === editingEmpId)) && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 text-[11px] text-indigo-900 flex items-center gap-2">
                      <span>🛡️</span>
                      <span>Upravujete profil <strong>Win3 Support</strong>. Pole PIN vyplňte pouze pro změnu.</span>
                    </div>
                  )}

                  
                    {/* Fotografie / Avatar */}
                    <div className="md:col-span-2 mt-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fotografie zaměstnance (nepovinné)</label>
                      <div className="flex items-center gap-4">
                        <img 
                          src={newEmpAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newEmpName || 'N')}`} 
                          alt="" 
                          className="w-12 h-12 rounded-full bg-slate-100 object-cover border border-slate-200"
                        />
                        <div className="flex-1">
                          <div className="flex gap-2">
                            <label className="cursor-pointer bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center flex-1 text-center">
                              📷 Vyfotit
                              <input 
                                type="file" 
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </label>
                            <label className="cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center flex-1 text-center">
                              📁 Ze souboru
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1.5">
                            Fotka se automaticky ořízne na čtverec a úsporně zmenší.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 mt-4 border-t border-slate-100 pt-4">
                    <button 
                      type="submit" 
                      className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                    >
                      {editingEmpId ? 'Uložit změny' : 'Přidat zaměstnance'}
                    </button>
                    {editingEmpId && (
                      <button 
                        type="button" 
                        onClick={handleCancelEditEmp} 
                        className="h-10 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Zrušit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Seznam zaměstnanců */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                  <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Seznam zaměstnanců ({employees.length})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Role a nadřízení
                    </span>
                  </div>

                  {/* REAL EMPLOYEES */}
                  <h3 className="font-black text-slate-900 mt-6 mb-2 uppercase tracking-wider text-xs border-b pb-2">Zaměstnanci a vedení</h3>
                  {employees.filter(e => !e.id.startsWith('DEV-')).map(e => {
                    const isThisAdmin = isRootAdmin(e);
                    const isViewerAdmin = isRootAdmin(currentUser);
                    const assignedRole = roleMap.get(e.customRoleId || '') || roles.find(r => r.id === 'role-delnik') || {
                      name: e.role,
                      level: e.role === 'Manager' ? 5 : 1,
                      badgeColor: e.role === 'Manager' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-slate-100 text-slate-700 border-slate-300'
                    };
                    const supervisor = e.supervisorId ? employees.find(s => s.id === e.supervisorId) : null;

                    return (
                      <div key={e.id} className={`p-3.5 flex justify-between items-center gap-3 ${!e.isActive ? 'opacity-50 bg-slate-50' : ''} ${isThisAdmin ? 'bg-indigo-50/20' : ''}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={e.avatar} alt="" className="w-10 h-10 rounded-full bg-slate-100 object-cover shrink-0 border border-slate-200" />
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 flex-wrap">
                                                              <span className="truncate">{e.name}</span>
                                {e.id.startsWith('DEV-') && (
                                  <span className="text-[10px] bg-red-100 text-red-800 font-black px-2 py-0.5 rounded-md border border-red-300 flex items-center gap-1 shadow-2xs">
                                    <span>📱</span>
                                    <span>Kód: {e.id.replace('DEV-', '')}</span>
                                  </span>
                                )}
                                {e.id.startsWith('DEV-') && (
                                  <span className="text-[10px] bg-red-100 text-red-800 font-black px-2 py-0.5 rounded-md border border-red-300 flex items-center gap-1 shadow-2xs">
                                    <span>📱</span>
                                    <span>Kód: {e.id.replace('DEV-', '')}</span>
                                  </span>
                                )}
                              {isThisAdmin && (
                                <span className="text-[10px] bg-indigo-600 text-white font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                  <span>👑</span>
                                  <span>Hlavní správce</span>
                                </span>
                              )}
                              {e.pinCode && <span title="Chráněno PIN kódem" className="text-xs">🔒</span>}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                              {/* Barevný odznak role ze stromu */}
                              <span className={`px-2 py-0.5 rounded-md font-bold border text-[10px] ${assignedRole.badgeColor || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                                Úroveň {assignedRole.level} • {assignedRole.name}
                              </span>

                              <span className="text-slate-400">•</span>
                              <span className="font-mono text-slate-600 font-semibold">{formatDepartment(e.department)}</span>

                              {supervisor ? (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                                    <span>👔</span>
                                    <span>Schvaluje: <strong>{supervisor.name}</strong></span>
                                  </span>
                                </>
                              ) : !isThisAdmin ? (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <button
                                    type="button"
                                    onClick={() => setAdminTab('supervisors')}
                                    className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md font-black cursor-pointer transition-colors"
                                    title="Přiřadit k vedoucímu"
                                  >
                                    <span>⚠️</span>
                                    <span>Bez vedoucího (Přiřadit ➔)</span>
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isThisAdmin && !isViewerAdmin ? (
                            <span 
                              className="text-[11px] px-3 py-1.5 rounded-xl font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1.5 select-none"
                              title="Profil hlavního administrátora nemohou ostatní manažeři upravovat"
                            >
                              <span>🔒</span>
                              <span>Chráněno</span>
                            </span>
                          ) : (
                            <>
                              <button 
                                type="button"
                                onClick={() => handleEditEmpClick(e)}
                                className="text-xs px-2.5 py-1.5 rounded-lg font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              >
                                Upravit
                              </button>
                              {!isThisAdmin && (
                                <>
                                  <button 
                                      type="button"
                                      onClick={() => onToggleEmployeeStatus(e.id, !e.isActive)}
                                      className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                                        e.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                      }`}
                                    >
                                      {e.isActive ? 'Archiv' : (e.id.startsWith('DEV-') ? 'Povolit zařízení' : 'Aktivovat')}
                                    </button>
                                  {onDeleteEmployee && (
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`Opravdu chcete smazat zaměstnance ${e.name}?`)) {
                                          onDeleteEmployee(e.id);
                                        }
                                      }}
                                      className="text-xs px-2 py-1.5 rounded-lg font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                                      title="Smazat zaměstnance"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      );
                    })}
                    
                    {/* DEVICES */}
                    <h3 className="font-black text-slate-900 mt-8 mb-2 uppercase tracking-wider text-xs border-b pb-2 flex items-center gap-2">
                      <span>📱</span> Povolená a čekající zařízení
                    </h3>
                    {employees.filter(e => e.id.startsWith('DEV-')).sort((a, b) => a.name.localeCompare(b.name, 'cs')).map(e => (
                      <div key={e.id} className={`p-3.5 flex justify-between items-center gap-3 ${!e.isActive ? 'bg-rose-50 border border-rose-200 shadow-sm' : 'bg-slate-50'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${e.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-200 text-rose-700 animate-pulse'}`}>
                            📱
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900">{e.name}</div>
                            <div className="text-sm text-indigo-700 mt-1 font-mono font-black bg-indigo-50 inline-block px-2 py-0.5 rounded border border-indigo-100">Kód: {e.id.replace('DEV-', '')}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { const nn = prompt('Nový název zařízení:', e.name); if (nn && nn.trim() !== '') onUpdateEmployee({...e, name: nn.trim()}); }} className="text-xs px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg" title="Přejmenovat">
                            ✏️
                          </button>
                          {!e.isActive && (
                            <button type="button" onClick={() => onToggleEmployeeStatus(e.id, true)} className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm">
                              Povolit zařízení
                            </button>
                          )}
                          {e.isActive && (
                            <button type="button" onClick={() => onToggleEmployeeStatus(e.id, false)} className="text-xs px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg">
                              Zablokovat
                            </button>
                          )}
                          {onDeleteEmployee && (
                            <button type="button" onClick={() => { if(confirm('Smazat toto zařízení ze systému?')) onDeleteEmployee(e.id); }} className="text-xs px-2 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg">
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= PODZÁLOŽKA 2: PŘIŘAZENÍ K VEDOUCÍM ======================= */}
        {adminTab === 'supervisors' && (
          <SupervisorAssignmentPanel
            employees={employees}
            roles={roles}
            currentUser={currentUser}
            onUpdateEmployee={onUpdateEmployee}
            onNavigateToRoles={() => setAdminTab('roles')}
          />
        )}

        {/* ======================= PODZÁLOŽKA 2: STROM ODPOVĚDNOSTÍ & ROLE ======================= */}
        {adminTab === 'roles' && (
          <div className="space-y-6">
            <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-amber-950">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌳</span>
                  <h3 className="font-black text-sm text-amber-900">
                    Organizační strom odpovědností firmy Kabel
                  </h3>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Zde si můžete upravit nebo vytvořit vlastní role a úrovně hierarchie. 
                  Role s příznakem <strong>„Týdenní schvalovatel v pátek“</strong> (zejména Mistři a Vedoucí) 
                  zajišťují povinné schválení docházky každý pátek za celou dílnu nebo středisko.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetRoles}
                  className="px-3.5 py-2 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
                  title="Vrátí výchozí role Kabel: Dělník, Předák, Mistr, Vedoucí výroby, Vedení"
                >
                  🔄 Obnovit výchozí strom
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Formulář pro přidání/úpravu role */}
              <div className="lg:col-span-1">
                <form onSubmit={handleSaveRole} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3.5 sticky top-6 shadow-2xs">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <span>{editingRoleId ? '✏️ Upravit roli ve stromu' : '➕ Přidat novou roli do stromu'}</span>
                  </h4>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Název role:
                    </label>
                    <input 
                      type="text" 
                      placeholder="např. Směnový mistr, Předák montáží..." 
                      value={roleFormName} 
                      onChange={e => setRoleFormName(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Úroveň v hierarchii (1 = nejnižší, 5 = nejvyšší):
                    </label>
                    <select
                      value={roleFormLevel}
                      onChange={e => setRoleFormLevel(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={1}>{LEVEL_NAMES[1]}</option>
                      <option value={2}>{LEVEL_NAMES[2]}</option>
                      <option value={3}>{LEVEL_NAMES[3]}</option>
                      <option value={4}>{LEVEL_NAMES[4]}</option>
                      <option value={5}>{LEVEL_NAMES[5]}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Popis odpovědnosti:
                    </label>
                    <textarea 
                      placeholder="Stručný popis pravomocí a povinností..." 
                      value={roleFormDesc} 
                      onChange={e => setRoleFormDesc(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Barva štítku:
                    </label>
                    <select
                      value={roleFormColor}
                      onChange={e => setRoleFormColor(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {COLOR_OPTIONS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Přepínače oprávnění */}
                  <div className="space-y-2 pt-1 border-t border-slate-200">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
                      <input 
                        type="checkbox" 
                        checked={roleFormCanApprove} 
                        onChange={e => setRoleFormCanApprove(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Může schvalovat týdenní docházku v pátek</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
                      <input 
                        type="checkbox" 
                        checked={roleFormCanManage} 
                        onChange={e => setRoleFormCanManage(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Plná administrace systému (Správa firmy)</span>
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="submit" 
                      className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                    >
                      {editingRoleId ? 'Uložit roli' : 'Vytvořit roli'}
                    </button>
                    {editingRoleId && (
                      <button 
                        type="button" 
                        onClick={handleCancelRoleEdit} 
                        className="h-10 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Zrušit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Strom rolí – vizualizace pyramidy */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Hierarchie odpovědností (od vedení po dělníky)
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Celkem {roles.length} rolí
                  </span>
                </div>

                <div className="space-y-3">
                  {sortedRolesDesc.map(r => {
                    const assignedEmps = employees.filter(e => e.customRoleId === r.id);

                    return (
                      <div 
                        key={r.id} 
                        className={`p-4 rounded-2xl border transition-all ${
                          editingRoleId === r.id 
                            ? 'ring-2 ring-indigo-500 bg-indigo-50/20 border-indigo-300' 
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-mono font-black text-xs flex items-center justify-center border border-slate-200">
                              L{r.level}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-black text-sm text-slate-900">{r.name}</h5>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${r.badgeColor || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                                  Úroveň {r.level}
                                </span>
                                {r.canApproveWeekly && (
                                  <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.2 rounded">
                                    ✓ Týdenní schvalovatel
                                  </span>
                                )}
                                {r.canManageAll && (
                                  <span className="text-[10px] bg-purple-100 text-purple-900 border border-purple-300 font-bold px-1.5 py-0.2 rounded">
                                    👑 Administrátor
                                  </span>
                                )}
                              </div>
                              {r.description && (
                                <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => startEditingRole(r)}
                              className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Upravit
                            </button>
                            {r.id !== 'role-delnik' && r.id !== 'role-vedeni' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(r.id)}
                                className="text-xs px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg transition-colors cursor-pointer"
                                title="Smazat roli"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Seznam zaměstnanců v této roli */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-400">Přiřazeno ({assignedEmps.length}):</span>
                            {assignedEmps.length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">Zatím nikdo</span>
                            ) : (
                              assignedEmps.map(emp => (
                                <span key={emp.id} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md font-semibold text-[11px] text-slate-800">
                                  <span>👤</span>
                                  <span>{emp.name}</span>
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= PODZÁLOŽKA 3: ZAKÁZKY A STŘEDISKA ======================= */}
        {adminTab === 'jobs' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="space-y-4">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <span>📁</span>
                <span>Zakázky a střediska firmy Kabel</span>
              </h3>

              <form onSubmit={handleAddJob} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                  {editingJobId ? 'Upravit zakázku' : 'Nová zakázka'}
                </h4>
                
                <input 
                  type="text" 
                  placeholder="Název zakázky (např. Výroba rozvaděčů B)" 
                  value={newJobName} 
                  onChange={e => setNewJobName(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                
                <input 
                  type="text" 
                  placeholder="Kód zakázky (např. 102 nebo ZAK-01)" 
                  value={newJobCode} 
                  onChange={e => setNewJobCode(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  required
                />

                
                    {/* Fotografie / Avatar */}
                    <div className="md:col-span-2 mt-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fotografie zaměstnance (nepovinné)</label>
                      <div className="flex items-center gap-4">
                        <img 
                          src={newEmpAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newEmpName || 'N')}`} 
                          alt="" 
                          className="w-12 h-12 rounded-full bg-slate-100 object-cover border border-slate-200"
                        />
                        <div className="flex-1">
                          <div className="flex gap-2">
                            <label className="cursor-pointer bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center flex-1 text-center">
                              📷 Vyfotit
                              <input 
                                type="file" 
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </label>
                            <label className="cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center flex-1 text-center">
                              📁 Ze souboru
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1.5">
                            Fotka se automaticky ořízne na čtverec a úsporně zmenší.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 mt-4 border-t border-slate-100 pt-4">
                  <button 
                    type="submit" 
                    className="flex-1 h-10 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    {editingJobId ? 'Uložit změny' : 'Přidat zakázku'}
                  </button>
                  {editingJobId && (
                    <button 
                      type="button" 
                      onClick={handleCancelEditJob} 
                      className="h-10 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Zrušit
                    </button>
                  )}
                </div>
              </form>

              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {jobs.map(j => (
                  <div key={j.id} className={`p-3 flex justify-between items-center ${!j.isActive ? 'opacity-50 bg-slate-50' : ''}`}>
                    <div>
                      <div className="font-bold text-xs text-slate-900">{j.name}</div>
                      <div className="text-[11px] font-mono font-bold text-indigo-600">{j.code}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button" 
                        onClick={() => handleEditJobClick(j)}
                        className="text-xs px-2.5 py-1 rounded-lg font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        Upravit
                      </button>
                      <button 
                        type="button" 
                        onClick={() => onToggleJobStatus(j.id, !j.isActive)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          j.isActive ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {j.isActive ? 'Archivovat' : 'Aktivovat'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ======================= PODZÁLOŽKA 4: ZÁLOHY ======================= */}
        {adminTab === 'backup' && (
          <section className="space-y-4">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>💾</span>
              <span>Zálohování a obnova dat docházky Kabel</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Exportovat kompletní zálohu</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Stáhne do JSON souboru všechny zaměstnance, role ve stromu odpovědností, zakázky i docházkové záznamy.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={handleDownloadBackup}
                  disabled={isBackupLoading}
                  className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors whitespace-nowrap disabled:opacity-50 self-start shadow-xs cursor-pointer"
                >
                  {isBackupLoading ? 'Exportuji...' : 'Stáhnout JSON zálohu'}
                </button>
              </div>

              <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-rose-900">Obnovit data ze záložního souboru</h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Nahradí data v systému obsahem ze záložního JSON souboru.
                  </p>
                </div>
                <div>
                  <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleRestoreBackup} 
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBackupLoading}
                    className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors whitespace-nowrap shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isBackupLoading ? 'Nahrávám...' : 'Vybrat soubor a obnovit'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* PIN ověření pro administrátora Win3 Support */}
      <PinPadModal
        isOpen={isVerifyingAdminPin}
        onClose={() => {
          setIsVerifyingAdminPin(false);
          setPendingAdminEditEmp(null);
        }}
        onSuccess={() => {
          setIsVerifyingAdminPin(false);
          if (pendingAdminEditEmp) {
            startEditingEmp(pendingAdminEditEmp);
            setPendingAdminEditEmp(null);
          }
        }}
        targetPin={pendingAdminEditEmp?.pinCode || ''}
        targetUserName={pendingAdminEditEmp?.name || ''}
        title="Ověření administrátora"
        subtitle="Pro úpravu profilu Win3 Support zadejte stávající PIN kód"
      />
    </div>
  );
};

export default AdminPanel;
