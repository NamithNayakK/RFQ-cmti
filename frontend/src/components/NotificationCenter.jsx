import { useEffect, useState } from 'react';
import { FiBell, FiX, FiCheck, FiTrash2 } from 'react-icons/fi';
import { fileService } from '../api/fileService';

export default function NotificationCenter({ onClose, onNotificationClick }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await fileService.getNotifications(10, 0, false);
      setNotifications(response.notifications || []);
      setUnreadCount(response.unread_count || 0);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await fileService.markNotificationAsRead(notificationId);
      loadNotifications();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleNotificationClick = async (notificationId) => {
    await handleMarkAsRead(notificationId);
    if (onNotificationClick) {
      onNotificationClick();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fileService.markAllNotificationsAsRead();
      loadNotifications();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-end pt-20 pr-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-96 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiBell size={20} className="text-manufacturing-accent" />
            <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-manufacturing-accent text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FiBell size={40} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-medium">No notifications</p>
                <p className="text-xs text-slate-400">New updates will appear here</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 transition cursor-pointer ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 text-sm">
                        {notification.part_name}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Material: {notification.material || 'N/A'}
                      </p>
                      {notification.part_number && (
                        <p className="text-xs text-slate-600">
                          Part #: {notification.part_number}
                        </p>
                      )}
                      {notification.description && (
                        <p className="text-xs text-slate-600 mt-1">
                          {notification.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="h-2 w-2 bg-manufacturing-accent rounded-full mt-2 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
          <button
            onClick={handleMarkAllAsRead}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-manufacturing-accent hover:text-manufacturing-accent/80"
          >
            <FiCheck size={16} />
            Mark all as read
          </button>
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
            title="Clear notifications"
          >
            <FiTrash2 size={16} />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
