
import React from 'react';
import { Employee, Job } from '../types';

const AdminPanel: React.FC<{employees: Employee[], onAddEmployee: any, onUpdateEmployee: any, onToggleEmployeeStatus: any, jobs: Job[], onAddJob: any, onToggleJobStatus: any, currentUser: Employee, onStartPresentation: any}> = ({ employees, jobs }) => {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-bold mb-4">Správa zaměstnanců</h3>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {employees.map(e => (
            <div key={e.id} className="p-4 flex justify-between items-center">
              <span className="font-medium">{e.name}</span>
              <span className="text-xs text-slate-400">{e.role}</span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="text-lg font-bold mb-4">Projekty / Zakázky</h3>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {jobs.map(j => (
            <div key={j.id} className="p-4 flex justify-between items-center">
              <span className="font-medium">{j.name}</span>
              <span className="text-xs text-slate-400">{j.code}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
export default AdminPanel;
