import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fileService = {
  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  // Request presigned upload URL
  requestUploadUrl: async (uploadData) => {
    const response = await api.post('/files/upload', uploadData);
    return response.data;
  },

  // Upload file to presigned URL
  uploadFile: async (uploadUrl, file, onProgress) => {
    if (!file) {
      throw new Error('File object is required');
    }
    const response = await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (onProgress) {
          onProgress(progress);
        }
        return progress;
      },
    });
    return response.data;
  },

  // Get list of files
  listFiles: async (limit = 50, offset = 0) => {
    const params = { limit, offset };
    const response = await api.get('/files/list', { params });
    return response.data;
  },

  // Search files
  searchFiles: async (searchParams) => {
    const response = await api.post('/files/search', searchParams);
    return response.data;
  },

  // Get file metadata
  getFileMetadata: async (fileId) => {
    const response = await api.get(`/files/metadata/${fileId}`);
    return response.data;
  },

  // Request download URL
  requestDownloadUrl: async (objectKey) => {
    const response = await api.get(`/files/download/${objectKey}`);
    return response.data;
  },

  // Request mesh URL (for 3D viewer)
  requestMeshUrl: async (objectKey) => {
    const response = await api.get(`/files/mesh/${objectKey}`);
    return response.data;
  },

  // Delete file
  deleteFile: async (objectKey) => {
    const response = await api.delete(`/files/${objectKey}`);
    return response.data;
  },

  // Live material pricing (INR)
  getLiveMaterialCosts: async (materials = []) => {
    const params = materials.length > 0 ? { materials: materials.join(',') } : undefined;
    const response = await api.get('/manufacturing/costs/live', { params });
    return response.data;
  },

  // Notifications
  getNotifications: async (limit = 50, offset = 0, unreadOnly = false) => {
    const response = await api.get('/notifications/', {
      params: { limit, offset, unread_only: unreadOnly }
    });
    return response.data;
  },

  getUnreadNotificationsCount: async () => {
    const response = await api.get('/notifications/', { params: { limit: 1 } });
    return response.data.unread_count;
  },

  markNotificationAsRead: async (notificationId) => {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllNotificationsAsRead: async () => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },

  getNotificationDetails: async (notificationId) => {
    const response = await api.get(`/notifications/${notificationId}/details`);
    return response.data;
  },

  // Quotes
  createQuote: async (quoteData) => {
    const response = await api.post('/quotes', quoteData);
    return response.data;
  },

  getQuotes: async (status = null, limit = 50, offset = 0) => {
    const params = { limit, offset };
    if (status) params.status = status;
    const response = await api.get('/quotes', { params });
    return response.data;
  },

  getBuyerQuotes: async (status = null, limit = 50, offset = 0) => {
    const params = { limit, offset };
    if (status) params.status = status;
    const response = await api.get('/quotes/buyer', { params });
    return response.data;
  },

  getQuoteDetails: async (quoteId) => {
    const response = await api.get(`/quotes/${quoteId}`);
    return response.data;
  },

  getQuotesByNotification: async (notificationId) => {
    const response = await api.get(`/quotes/notification/${notificationId}`);
    return response.data;
  },

  acceptQuote: async (quoteId) => {
    const response = await api.put(`/quotes/${quoteId}`, {
      status: 'accepted'
    });
    return response.data;
  },

  rejectQuote: async (quoteId, rejectionReason = '') => {
    const response = await api.put(`/quotes/${quoteId}`, {
      status: 'rejected',
      rejection_reason: rejectionReason
    });
    return response.data;
  },

  getManufacturerStats: async () => {
    const response = await api.get('/quotes/manufacturer/stats');
    return response.data;
  },

  deleteQuote: async (quoteId) => {
    const response = await api.delete(`/quotes/${quoteId}`);
    return response.data;
  },

  // Buyer Quote Notifications
  getBuyerQuoteNotifications: async (limit = 50, offset = 0) => {
    const response = await api.get('/quotes/buyer/notifications', {
      params: { limit, offset }
    });
    return response.data;
  },

  markQuoteNotificationAsRead: async (notificationId) => {
    const response = await api.put(`/quotes/buyer/notifications/${notificationId}/read`);
    return response.data;
  },

  getUnreadQuoteNotificationsCount: async () => {
    const response = await api.get('/quotes/buyer/notifications/unread/count');
    return response.data;
  },

  deleteQuoteNotification: async (notificationId) => {
    const response = await api.delete(`/quotes/buyer/notifications/${notificationId}`);
    return response.data;
  },

  clearAllQuoteNotifications: async () => {
    const response = await api.delete('/quotes/buyer/notifications/all');
    return response.data;
  },

  // Manufacturer Notifications
  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  clearAllNotifications: async () => {
    const response = await api.delete('/notifications/');
    return response.data;
  },

  // Pricing Management
  createMaterialPrice: async (pricingData) => {
    const response = await api.post('/pricing/materials', pricingData);
    return response.data;
  },

  getMaterialPrices: async (limit = 50, offset = 0) => {
    const response = await api.get('/pricing/materials', {
      params: { limit, offset }
    });
    return response.data;
  },

  getMaterialPrice: async (materialName) => {
    const response = await api.get(`/pricing/materials/${materialName}`);
    return response.data;
  },

  updateMaterialPrice: async (materialName, pricingData) => {
    const response = await api.put(`/pricing/materials/${materialName}`, pricingData);
    return response.data;
  },

  deleteMaterialPrice: async (materialName) => {
    const response = await api.delete(`/pricing/materials/${materialName}`);
    return response.data;
  },

  calculateQuotePrice: async (pricingRequest) => {
    const response = await api.post('/pricing/calculate', pricingRequest);
    return response.data;
  },
};