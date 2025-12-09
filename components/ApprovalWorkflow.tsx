
import React, { useState } from 'react';
import { MonthStatus, TimesheetStatus } from '../types';
import { ValidationIssue } from '../services/validationService';

interface ApprovalWorkflowProps {
  status: MonthStatus;
  onUpdateStatus: (newStatus: TimesheetStatus, comment?: string) => void;
  isManagerMode: boolean;
  validationIssues?: ValidationIssue[];
}

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({ status, onUpdateStatus, isManagerMode, validationIssues = [] }) => {
  const [comment, setComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const errors = validationIssues.filter(i => i.severity === 'error');

  const getStatusBadge = (s: TimesheetStatus) => {
    switch (s) {
      case TimesheetStatus.DRAFT: return 'bg-gray-100 text-gray-700 border-gray-200';
      case TimesheetStatus.SUBMITTED: return 'bg-blue-50 text-blue-700 border-blue-200';
      case TimesheetStatus.APPROVED: return 'bg-green-50 text-green-700 border-green-200';
      case TimesheetStatus.REJECTED: return 'bg-red-50 text-red-700 border-red-200';
      default: return '';
    }
  };

  const getFormattedMonth = () => {
    try {
        const [year, month] = status.month.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const str = date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
        return str.charAt(0).toUpperCase() + str.slice(1);
    } catch (e) {
        return status.month;
    }
  };

  const handleSubmit = () => {
    if (errors.length > 0) {
      const confirmSubmit = window.confirm(`Ve výkazu jsou chyby (${errors.length}x chybějící dny). Opravdu chcete výkaz odeslat neúplný?`);
      if (!confirmSubmit) return;
    }
    onUpdateStatus(TimesheetStatus.SUBMITTED);
  };

  const handleReject = () => {
    onUpdateStatus(TimesheetStatus.REJECTED, comment);
    setShowRejectModal(false);
    setComment('');
  };

  return (
    <div className="bg-white border-b border-gray-200 p-4 mb-6 sticky top-0 z-20 shadow-sm">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">Stav výkazu ({getFormattedMonth()}):</div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${getStatusBadge(status.status)}`}>
            {status.status === TimesheetStatus.DRAFT && 'Rozpracováno'}
            {status.status === TimesheetStatus.SUBMITTED && 'Čeká na schválení'}
            {status.status === TimesheetStatus.APPROVED && 'Schváleno'}
            {status.status === TimesheetStatus.REJECTED && 'Vráceno k opravě'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Employee Actions */}
          {!isManagerMode && status.status === TimesheetStatus.DRAFT && (
            <button
              onClick={handleSubmit}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                errors.length > 0 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {errors.length > 0 ? 'Odeslat s chybami' : 'Odeslat ke schválení'}
            </button>
          )}
          
          {!isManagerMode && status.status === TimesheetStatus.REJECTED && (
            <button
              onClick={handleSubmit}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Odeslat opravený výkaz
            </button>
          )}

          {/* Manager Actions */}
          {isManagerMode && status.status === TimesheetStatus.SUBMITTED && (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                className="bg-white border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Vrátit k opravě
              </button>
              <button
                onClick={() => onUpdateStatus(TimesheetStatus.APPROVED)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Schválit výkaz
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Messages */}
      {status.managerComment && (
         <div className="max-w-6xl mx-auto mt-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800">
            <strong>Poznámka manažera:</strong> {status.managerComment}
         </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Vrátit výkaz k přepracování</h3>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 h-32 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Uveďte důvod vrácení..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Zrušit
              </button>
              <button
                onClick={handleReject}
                disabled={!comment.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Vrátit zaměstnanci
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalWorkflow;
