import React, { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { API_BASE, getStoredToken } from '../../services/api';

interface Notification {
  id: number;
  report_id: number | null;
  category: string;
  title: string;
  message: string;
  timestamp: string;
  is_read: number;
}

interface NotificationsPanelProps {
  onClose: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${getStoredToken() || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${getStoredToken() || ''}`
        }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="absolute right-0 top-12 mt-2 w-80 sm:w-96 bg-[#0B2D42] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
      <div className="p-3 border-b border-white/10 flex justify-between items-center bg-[#071A2B]">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Bell size={14} className="text-[#14B8A6]" />
          Notifications
        </h3>
        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="max-h-[400px] overflow-y-auto p-2">
        {loading ? (
          <div className="p-4 text-center text-xs text-white/50 animate-pulse">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-xs text-white/50">No new notifications</div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map(n => (
              <div key={n.id} className={`p-3 rounded-lg border ${n.is_read ? 'bg-white/5 border-white/5' : 'bg-white/10 border-white/20'} flex flex-col gap-1 relative`}>
                <div className="flex justify-between items-start pr-6">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#14B8A6]">{n.category}</span>
                  <span className="text-[10px] text-white/40">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <h4 className="text-xs font-semibold text-white">{n.title}</h4>
                <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">{n.message}</p>
                {!n.is_read && (
                  <button onClick={() => markAsRead(n.id)} className="absolute right-2 top-2 p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors" title="Mark as read">
                    <Check size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
