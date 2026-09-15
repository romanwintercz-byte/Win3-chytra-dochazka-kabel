
import React, { useState } from 'react';
import { Notification } from '../types';

const NotificationBell: React.FC<{notifications: Notification[], onMarkAsRead: any, onMarkAllAsRead: any}> = ({ notifications }) => {
  const [isOpen, setIsOpen] = useState(false);
  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-400 hover:text-white relative">
        <span>🔔</span>
        {unread > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-slate-900">{unread}</span>}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-4 animate-fade-in text-slate-900">
          <div className="font-bold text-xs uppercase text-slate-400 mb-2 border-b pb-2">Oznámení</div>
          <div className="space-y-3 py-2">
            {notifications.length === 0 ? <p className="text-center text-xs text-slate-400">Žádné novinky</p> : null}
          </div>
        </div>
      )}
    </div>
  );
};
export default NotificationBell;
