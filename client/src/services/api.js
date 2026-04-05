import axios from 'axios';
import { io } from 'socket.io-client';

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const createAuthenticatedSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Missing auth token for socket initialization');
  }

  return io(SOCKET_URL, {
    auth: { token },
  });
};

const API = axios.create({
  baseURL: '/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (data) => API.post('/auth/login', data);
export const signup = (data) => API.post('/auth/signup', data);
export const getMe = () => API.get('/auth/me');

// Tasks
export const getTasks = (params) => API.get('/tasks', { params });
export const createTask = (data) => API.post('/tasks', data);
export const updateTask = (id, data) => API.put(`/tasks/${id}`, data);
export const deleteTask = (id) => API.delete(`/tasks/${id}`);

// Sprints
export const getSprints = (params) => API.get('/sprints', { params });
export const createSprint = (data) => API.post('/sprints', data);
export const updateSprint = (id, data) => API.put(`/sprints/${id}`, data);
export const deleteSprint = (id) => API.delete(`/sprints/${id}`);
export const getSprintBoard = (id) => API.get(`/sprints/${id}/board`);

// Developers
export const getDevelopers = () => API.get('/developers');
export const getDeveloper = (id) => API.get(`/developers/${id}`);
export const getDeveloperStats = (id) => API.get(`/developers/${id}/stats`);

// Analytics
export const getTeamAnalytics = () => API.get('/analytics/team');
export const getSprintAnalytics = () => API.get('/analytics/sprints');
export const getBottlenecks = () => API.get('/analytics/bottlenecks');
export const getInsights = () => API.get('/analytics/insights');

// AI
export const getTeamAiInsights = () => API.get('/ai/team-insights');
export const generateTaskDescription = (data) => API.post('/ai/generate-task', data);

// GitHub API Sync
export const syncGithubData = (id, data) => API.post(`/github/sync/${id}`, data);

export default API;
