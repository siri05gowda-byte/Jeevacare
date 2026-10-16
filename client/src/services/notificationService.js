import api from './api';

/**
 * Get notifications for the authenticated user
 */
export const getNotifications = async (params = {}) => {
  const response = await api.get('/notifications', { params });
  return response;
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread-count');
  return response;
};

/**
 * Mark a notification as read
 */
export const markAsRead = async (notificationId) => {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return response;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  const response = await api.patch('/notifications/mark-all-read');
  return response;
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId) => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response;
};

const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

export default notificationService;
