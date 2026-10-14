import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

/**
 * Get notifications for the authenticated user
 */
export const getNotifications = async (params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/notifications`, { params });
  return response.data;
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  const response = await axios.get(`${API_BASE_URL}/notifications/unread-count`);
  return response.data;
};

/**
 * Mark a notification as read
 */
export const markAsRead = async (notificationId) => {
  const response = await axios.patch(`${API_BASE_URL}/notifications/${notificationId}/read`);
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  const response = await axios.patch(`${API_BASE_URL}/notifications/mark-all-read`);
  return response.data;
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId) => {
  const response = await axios.delete(`${API_BASE_URL}/notifications/${notificationId}`);
  return response.data;
};

const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

export default notificationService;
