import React, { useState, useRef, useEffect } from 'react';
import { Notification } from '../types';

interface NotificationBellProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ notifications, onMarkAsRead, onMarkAllAsRead }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
        case 'success': return <div className="text-green-500">✅</div>;
        case 'error': return <div className="text-red-500">❌</div>;
        case 'warning': return <div className="text-orange-500">⚠️</div>;
        default: return <div className="text-blue-500">ℹ️</div>;
    }
  };

  const getTimeAgo = (dateStr: string) => {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Teď';
      if (mins < 60) return `${mins} min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours} h`;
      return Math.floor(hours / 24) + ' d';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-700/50 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in origin-top-right">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800">Oznámení</h3>
            {unreadCount > 0 && (
                <button 
                    onClick={onMarkAllAsRead}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                    Přečíst vše
                </button>
            )}
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                    Žádná nová oznámení
                </div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {notifications.map(n => (
                        <div 
                            key={n.id} 
                            onClick={() => onMarkAsRead(n.id)}
                            className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                        >
                            <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                            <div className="flex-1">
                                <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                    {n.message}
                                </p>
                                <span className="text-xs text-gray-400 mt-1 block">
                                    {getTimeAgo(n.createdAt)}
                                </span>
                            </div>
                            {!n.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></div>
                            )}
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;