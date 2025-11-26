import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, API_HOST } from '../config/networkConfig';

// Network configuration is now managed centrally!
// To change IP address, only update the root .env file
export { API_HOST };

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  // Generation can take a while; give it more time
  timeout: 300000, // 5 minutes for quiz generation
  headers: {
    'Content-Type': 'application/json',
  },
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      // Trigger logout in app
    }
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(errorMessage));
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password, role) =>
    api.post('/auth/register', { name, email, password, role }),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/update-profile', data),
  guestAccess: () => api.post('/auth/guest-access'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  verifyResetCode: (email, code) => api.post('/auth/verify-reset-code', { email, code }),
  resetPassword: (email, code, password) =>
    api.post('/auth/reset-password', { email, code, password }),
  requestRoleUpgrade: (targetRole) =>
    api.post('/auth/request-role-upgrade', { targetRole }),
  // Email verification via OTP
  sendVerificationCode: (email) => api.post('/auth/verify-email/send-code', { email }),
  verifyEmailCode: (email, code) => api.post('/auth/verify-email/code', { email, code }),
  // Admin 2FA verification
  verifyAdminLogin: (email, code) => api.post('/auth/verify-admin-login', { email, code }),
};

// Quiz API
export const quizAPI = {
  getAll: () => api.get('/quiz'),
  getById: (id) => api.get(`/quiz/${id}`),
  create: (data) => api.post('/quiz', data),
  update: (id, data) => api.put(`/quiz/${id}`, data),
  delete: (id) => api.delete(`/quiz/${id}`),
  submit: (id, answers, timeTaken, proctoring, classId) =>
    api.post(`/quiz/${id}/submit`, { answers, timeTaken, proctoring, classId }),
  getMyQuizzes: () => api.get('/quiz/my/quizzes'),
  uploadAndGenerate: (formData) =>
    api.post('/quiz/upload-and-generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  generateFromText: (data) => api.post('/quiz/generate-from-text', data),

  // Streaming methods - fallback to non-streaming with simulated progress for React Native
  streamUploadAndGenerate: async (formData, onEvent) => {
    // Extract numQuestions for progress simulation
    const numQuestions = parseInt(formData.get('numQuestions')) || 5;
    let currentProgress = 0;

    // Simulate ready event
    onEvent({ event: 'ready' });

    // Simulate extracting
    setTimeout(() => onEvent({ event: 'extracting' }), 300);
    setTimeout(() => onEvent({ event: 'extracted' }), 800);

    // Simulate question generation progress - incremental
    const progressInterval = setInterval(() => {
      if (currentProgress < numQuestions) {
        currentProgress++;
        onEvent({
          event: 'question',
          index: currentProgress - 1,
          received: currentProgress,
          data: {
            questionText: `Generating question ${currentProgress}...`,
            difficulty: formData.get('difficulty') || 'medium'
          }
        });
      }
    }, 4000); // Every 4 seconds

    try {
      // Call the non-streaming endpoint with proper config
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/quiz/upload-and-generate`,
        formData,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'multipart/form-data'
          },
          timeout: 300000, // 5 minutes
        }
      );

      clearInterval(progressInterval);

      // Simulate stream complete
      onEvent({ event: 'stream-complete' });

      // Send completion event
      const quizId = response.data.data?.quiz?.id || response.data.data?.quiz?._id;
      onEvent({
        event: 'completed',
        data: {
          quiz: {
            id: quizId,
            title: response.data.data?.quiz?.title,
            totalQuestions: response.data.data?.quiz?.questions?.length || numQuestions
          }
        }
      });

      return response;
    } catch (error) {
      clearInterval(progressInterval);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to generate quiz';
      onEvent({ event: 'error', message: errorMsg });
      throw error;
    }
  },

  streamFromText: async (data, onEvent) => {
    const numQuestions = parseInt(data.numQuestions) || 5;
    let questionCount = 0;

    // Simulate ready event
    onEvent({ event: 'ready' });

    // Simulate progress - show questions being generated incrementally
    const progressInterval = setInterval(() => {
      if (questionCount < numQuestions) {
        questionCount++;
        onEvent({
          event: 'question',
          index: questionCount - 1,
          received: questionCount,
          data: {
            questionText: `Generating question ${questionCount}...`,
            difficulty: data.difficulty || 'medium'
          }
        });
      }
    }, 4000); // Every 4 seconds

    try {
      // Call the non-streaming endpoint with direct axios call for better timeout control
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/quiz/generate-from-text`,
        data,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          timeout: 300000, // 5 minutes
        }
      );

      clearInterval(progressInterval);

      // Simulate stream complete
      onEvent({ event: 'stream-complete' });

      // Send completion event
      const quizId = response.data.data?.quiz?.id || response.data.data?.quiz?._id;
      onEvent({
        event: 'completed',
        data: {
          quiz: {
            id: quizId,
            title: response.data.data?.quiz?.title,
            totalQuestions: response.data.data?.quiz?.questions?.length || numQuestions
          }
        }
      });

      return response;
    } catch (error) {
      clearInterval(progressInterval);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to generate quiz';
      onEvent({ event: 'error', message: errorMsg });
      throw error;
    }
  },
};

// Search API
export const searchAPI = {
  similarQuizzes: (query, limit = 10) =>
    api.get('/search/similar', { params: { query, limit } }),
  vectorSearch: (query, limit = 10) =>
    api.post('/search/vector', {
      query,
      limit,
      collection: 'quizembeddings',
      index: 'quizembeddings_vector_index'
    }),
  hybridSearch: (query, limit = 15) =>
    api.post('/search/hybrid', {
      query,
      limit,
      vectorWeight: 0.7,  // Weight for vector search results
      textWeight: 0.3     // Weight for text search results
    }),
  similarToQuiz: (quizId) => api.get(`/search/quiz/${quizId}/similar`),
  getCategories: () => api.get('/search/categories'),
  getTags: () => api.get('/search/tags'),
};

// Analytics API
export const analyticsAPI = {
  getMyStats: () => api.get('/analytics/my-stats'),
  getStats: () => api.get('/analytics/stats'),
  getQuizAnalytics: (quizId) => api.get(`/analytics/quiz/${quizId}/analytics`),
  getLeaderboard: (limit = 10) =>
    api.get('/analytics/leaderboard', { params: { limit } }),
  getClassLeaderboard: (classId, limit = 20) =>
    api.get(`/analytics/leaderboard/class/${classId}`, { params: { limit } }),
  getMyHistory: (page = 1, limit = 10) =>
    api.get('/analytics/my-history', { params: { page, limit } }),
  getHistoryDetail: (historyId) => api.get(`/analytics/history/${historyId}`),
};

// History API
export const historyAPI = {
  getById: (historyId) => api.get(`/history/${historyId}`),
};

// User API
export const userAPI = {
  upgradeSubscription: (plan) => api.post('/users/upgrade-subscription', { plan }),
  getUsageStats: () => api.get('/users/usage-stats'),
  resetPassword: (currentPassword, newPassword) =>
    api.post('/users/reset-password', { currentPassword, newPassword }),
  getUserById: (userId) => api.get(`/users/${userId}`),
  updateProfile: (data) => api.put('/auth/update-profile', data),
  uploadAvatar: (formData) => api.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Classes API
export const classesAPI = {
  create: (data) => api.post('/classes', data),
  getAll: () => api.get('/classes'),
  join: (code) => api.post('/classes/join', { code }),
  leave: (classId) => api.post(`/classes/${classId}/leave`),
  getById: (classId) => api.get(`/classes/${classId}`),
  mine: () => api.get('/classes/mine'),
  update: (classId, data) => api.put(`/classes/${classId}`, data),
  delete: (classId) => api.delete(`/classes/${classId}`),
  assignQuiz: (classId, quizId) => api.post(`/classes/${classId}/assign`, { quizId }),
  assign: (classId, quizId) => api.post(`/classes/${classId}/assign`, { quizId }),
  removeStudent: (classId, studentId) => api.delete(`/classes/${classId}/students/${studentId}`),
  createPost: (classId, data) => api.post(`/classes/${classId}/posts`, data),
  handleJoinRequest: (classId, requestId, action) => api.post(`/classes/${classId}/join-requests/${requestId}`, { action }),
  getJoinRequests: (classId) => api.get(`/classes/${classId}/join-requests`),
  checkCodeExists: (code) => api.get(`/classes/check-code/${code}`),
  generateNewCode: (classId) => api.post(`/classes/${classId}/new-code`),
};

// Subscriptions API
export const subscriptionsAPI = {
  current: () => api.get('/subscriptions/current'),
  change: (plan, billingCycle = 'monthly') => api.post('/subscriptions/change', { plan, billingCycle }),
  getPackages: () => api.get('/subscriptions/packages'),
};

// Payments API
export const paymentsAPI = {
  create: (data) => api.post('/payments', data),
  list: () => api.get('/payments'),
  updateStatus: (id, status) => api.put(`/payments/${id}/status`, { status }),
};

// Admin Payments
export const adminPaymentsAPI = {
  getAll: (params) => api.get('/admin/payments', { params }),
  getById: (paymentId) => api.get(`/admin/payments/${paymentId}`),
  updateStatus: (paymentId, status) => api.put(`/admin/payments/${paymentId}/status`, { status }),
};

// Feedback API
export const feedbackAPI = {
  create: (data) => api.post('/feedback', data),
  mine: () => api.get('/feedback/mine'),
};

// Notifications API
export const notificationsAPI = {
  mine: () => api.get('/notifications/mine'),
  markRead: (id) => api.post(`/notifications/${id}/read`),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (userId) => api.get(`/admin/users/${userId}`),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getQuizzes: (params) => api.get('/admin/quizzes', { params }),
  updateQuizStatus: (quizId, status) => api.put(`/admin/quizzes/${quizId}/status`, { status }),
  toggleQuizVisibility: (quizId, isPublic) => api.put(`/admin/quizzes/${quizId}/toggle-visibility`, { isPublic }),
  getAnalytics: () => api.get('/admin/analytics'),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  // Package management
  getPackages: () => api.get('/admin/packages'),
  createPackage: (data) => api.post('/admin/packages', data),
  updatePackage: (packageId, data) => api.put(`/admin/packages/${packageId}`, data),
  deletePackage: (packageId) => api.delete(`/admin/packages/${packageId}`),
};

export default api;
