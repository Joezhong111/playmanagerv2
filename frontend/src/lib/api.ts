import axios, { AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import type {
  ApiResponse,
  ApiError,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  UpdateStatusRequest,
  TaskQuery,
  UserQuery,
  SetupResponse,
  StatusResponse,
  TimeTestResponse,
  TaskStats,
  UserStats,
  StatsQuery,
  TimeExtensionRequest,
  CreateExtensionRequest,
  ReviewExtensionRequest,
  ExtendTaskDurationRequest
} from '@/types/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 30000, // 增加到30秒
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<any>>) => {
    return response;
  },
  (error) => {
    // 详细的错误日志
    console.error('API Error Details:', {
      url: error.config?.url,
      fullUrl: error.config?.baseURL + error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      code: error.code,
      timeout: error.code === 'ECONNABORTED',
      timestamp: new Date().toISOString(),
      responseData: error.response?.data,
      requestData: error.config?.data,
      headers: error.config?.headers
    });

    // 额外的错误上下文
    if (error.response?.status) {
      console.error(`HTTP ${error.response.status} Error:`, error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request setup error:', error.message);
    }

    // Handle common errors
    if (error.code === 'ECONNABORTED') {
      console.warn(`Request timeout: ${error.config?.url} exceeded ${api.defaults.timeout}ms`);
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.log('Unauthorized access, clearing auth data');
      Cookies.remove('token');
      Cookies.remove('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Helper function to handle API responses
const handleResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'API request failed');
};

// Authentication API
export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
    return handleResponse(response);
  },

  async register(data: RegisterRequest): Promise<{ userId: number; username: string; role: string }> {
    const response = await api.post<ApiResponse<{ userId: number; username: string; role: string }>>('/auth/register', data);
    return handleResponse(response);
  },

  async verify(): Promise<{ user: User }> {
    // 使用较短的超时时间用于认证验证
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/verify', {
      timeout: 10000 // 10秒超时
    });
    return handleResponse(response);
  },
};

// Tasks API
export const tasksApi = {
  async create(taskData: CreateTaskRequest): Promise<Task> {
    const response = await api.post<ApiResponse<Task>>('/tasks', taskData);
    return handleResponse(response);
  },

  async getAll(query?: TaskQuery): Promise<Task[]> {
    const response = await api.get<ApiResponse<Task[]>>('/tasks', { params: query });
    return handleResponse(response);
  },

  async getById(id: number): Promise<Task> {
    const response = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
    return handleResponse(response);
  },

  async update(id: number, updateData: UpdateTaskRequest): Promise<Task> {
    const response = await api.put<ApiResponse<Task>>(`/tasks/${id}`, updateData);
    return handleResponse(response);
  },

  async accept(id: number): Promise<Task> {
    const response = await api.put<ApiResponse<Task>>(`/tasks/${id}/accept`);
    return handleResponse(response);
  },

  async start(id: number): Promise<Task> {
    const response = await api.put<ApiResponse<Task>>(`/tasks/${id}/start`);
    return handleResponse(response);
  },

  async complete(id: number): Promise<Task> {
    const response = await api.put<ApiResponse<Task>>(`/tasks/${id}/complete`);
    return handleResponse(response);
  },

  async pause(id: number): Promise<Task> {
    const response = await api.put<ApiResponse<Task>>(`/tasks/${id}/pause`);
    return handleResponse(response);
  },

  async resume(id: number): Promise<Task> {
    const response = await api.put<ApiResponse<Task>>(`/tasks/${id}/resume`);
    return handleResponse(response);
  },

  async cancel(id: number): Promise<Task> {
    const response = await api.put<ApiResponse<Task>>(`/tasks/${id}/cancel`);
    return handleResponse(response);
  },

  // 时间延长相关API
  async requestExtension(data: CreateExtensionRequest): Promise<TimeExtensionRequest> {
    const response = await api.post<ApiResponse<TimeExtensionRequest>>(`/tasks/${data.task_id}/request-extension`, data);
    return handleResponse(response);
  },

  async extendDuration(id: number, data: ExtendTaskDurationRequest): Promise<Task> {
    const response = await api.put<ApiResponse<Task>>(`/tasks/${id}/extend-duration`, data);
    return handleResponse(response);
  },

  // 获取排队任务
  async getQueuedTasks(playerId?: number): Promise<Task[]> {
    const params = playerId ? { playerId } : {};
    const response = await api.get<ApiResponse<Task[]>>('/tasks/queued', { params });
    return handleResponse(response);
  },

  // 重新指派任务
  async reassignTask(id: number, data: { player_id: number }): Promise<Task> {
    const response = await api.put<ApiResponse<Task>>(`/tasks/${id}/reassign`, data);
    return handleResponse(response);
  },
};

// Users API
export const usersApi = {
  async getPlayers(): Promise<User[]> {
    const response = await api.get<ApiResponse<User[]>>('/users/players');
    return handleResponse(response);
  },

  async getIdlePlayers(): Promise<User[]> {
    const response = await api.get<ApiResponse<User[]>>('/users/players/idle');
    return handleResponse(response);
  },

  async updateStatus(status: UpdateStatusRequest): Promise<{ status: string }> {
    const response = await api.put<ApiResponse<{ status: string }>>('/users/status', status);
    return handleResponse(response);
  },

  async getProfile(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/users/profile');
    return handleResponse(response);
  },

  // Admin functions
  async getAll(query?: UserQuery): Promise<User[]> {
    const response = await api.get<ApiResponse<User[]>>('/users', { params: query });
    return handleResponse(response);
  },

  async getById(id: number): Promise<User> {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    return handleResponse(response);
  },

  async update(id: number, userData: Partial<User>): Promise<User> {
    const response = await api.put<ApiResponse<User>>(`/users/${id}`, userData);
    return handleResponse(response);
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};

// Setup API
export const setupApi = {
  async init(): Promise<SetupResponse> {
    const response = await api.post<ApiResponse<SetupResponse>>('/setup/init');
    return handleResponse(response);
  },

  async status(): Promise<StatusResponse> {
    const response = await api.get<ApiResponse<StatusResponse>>('/setup/status');
    return handleResponse(response);
  },

  async timeTest(): Promise<TimeTestResponse> {
    const response = await api.get<ApiResponse<TimeTestResponse>>('/setup/time-test');
    return handleResponse(response);
  },
};

// Stats API
export const statsApi = {
  async getTasks(query?: StatsQuery): Promise<TaskStats> {
    const response = await api.get<ApiResponse<TaskStats>>('/stats/tasks', { params: query });
    return handleResponse(response);
  },

  async getUsers(query?: { role?: string }): Promise<UserStats> {
    const response = await api.get<ApiResponse<UserStats>>('/stats/users', { params: query });
    return handleResponse(response);
  },
};

// Health check
export const healthApi = {
  async check(): Promise<{ status: string; timestamp: string; database: string }> {
    const response = await api.get('/health');
    return response.data;
  },
};

// 时间延长申请API
export const extensionApi = {
  async getExtensionRequests(taskId?: number): Promise<TimeExtensionRequest[]> {
    const response = await api.get<ApiResponse<TimeExtensionRequest[]>>('/tasks/extension-requests', {
      params: taskId ? { task_id: taskId } : {}
    });
    return handleResponse(response);
  },

  async reviewExtensionRequest(id: number, data: ReviewExtensionRequest): Promise<TimeExtensionRequest> {
    const response = await api.put<ApiResponse<TimeExtensionRequest>>(`/tasks/extension-requests/${id}/review`, data);
    return handleResponse(response);
  },

  async getMyExtensionRequests(): Promise<TimeExtensionRequest[]> {
    const response = await api.get<ApiResponse<TimeExtensionRequest[]>>('/tasks/extension-requests/my');
    return handleResponse(response);
  },
};

export default api;