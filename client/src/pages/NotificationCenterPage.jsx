import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import notificationService from '../services/notificationService';
import LoadingState from '../components/LoadingState';

export default function NotificationCenterPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (filter === 'unread') params.read = false;
      if (filter === 'read') params.read = true;
      if (typeFilter) params.type = typeFilter;

      const response = await notificationService.getNotifications(params);
      setNotifications(response.data || response || []);
      setUnreadCount(response.meta?.unreadCount || response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, read: true, readAt: new Date() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      fetchNotifications(); // Refresh to update counts
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification._id);
    }
    
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (type) => {
    const icons = {
      staff_invitation: '👋',
      staff_approval: '✅',
      staff_rejection: '❌',
      document_uploaded: '📄',
      appointment_created: '📅',
      appointment_updated: '🔄',
      appointment_cancelled: '🚫',
      lab_result_ready: '🧪',
      prescription_ready: '💊',
      system_announcement: '📢',
      verification_required: '⚠️',
    };
    return icons[type] || '🔔';
  };

  const notificationTypes = [
    { value: '', label: 'All Types' },
    { value: 'staff_invitation', label: 'Staff Invitations' },
    { value: 'staff_approval', label: 'Approvals' },
    { value: 'document_uploaded', label: 'Documents' },
    { value: 'appointment_created', label: 'Appointments' },
    { value: 'lab_result_ready', label: 'Lab Results' },
    { value: 'system_announcement', label: 'Announcements' },
  ];

  if (loading) {
    return <LoadingState message="Loading notifications..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Bell size={32} className="text-jeevacare-blue" />
          Notification Center
        </h1>
        {unreadCount > 0 && (
          <p className="text-gray-600 mt-2">
            You have <span className="font-semibold text-blue-600">{unreadCount}</span> unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'read'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Read
          </button>
        </div>

        <div className="flex gap-2 items-center w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {notificationTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap"
            >
              <CheckCheck size={16} />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Bell size={64} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No notifications</h3>
          <p className="text-gray-600">
            {filter === 'unread' 
              ? "You're all caught up! No unread notifications."
              : typeFilter
              ? `No ${notificationTypes.find(t => t.value === typeFilter)?.label.toLowerCase()} notifications.`
              : "You don't have any notifications yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              className={`bg-white rounded-lg border transition-all cursor-pointer ${
                !notification.read
                  ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <span className="text-3xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className={`text-lg font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification._id);
                            }}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm font-medium flex items-center gap-1"
                          >
                            <Check size={14} />
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification._id);
                          }}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm font-medium flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
