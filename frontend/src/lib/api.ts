import axios, { AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import type {
  ApiResponse,
  ApiError,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  PlayerDetail,
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
  retry: 3, // 添加重试配置
  retryDelay: 1000, // 重试间隔1秒
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

// Response interceptor for error handling with retry logic
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<any>>) => {
    return response;
  },
  async (error) => {
    const config = error.config;
    
    // 如果请求配置中有重试次数，并且还没有达到最大重试次数
    if (!config.retryCount) {
      config.retryCount = 0;
    }
    
    const maxRetry = config.retry || 3;
    const retryDelay = config.retryDelay || 1000;
    
    // 只在网络错误或5xx错误时重试
    if (config.retryCount < maxRetry && (
      error.code === 'ECONNABORTED' || 
      error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT' ||
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600)
    )) {
      config.retryCount += 1;
      
      console.warn(`Retrying request (${config.retryCount}/${maxRetry}): ${config.method?.toUpperCase()} ${config.url}`);
      
      // 等待指定时间后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      return api(config);
    }
    
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
      retryCount: config.retryCount,
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

  async complete(id: number): Promise<CompleteTaskResponse> {
    const response = await api.put<ApiResponse<CompleteTaskResponse>>(`/tasks/${id}/complete`);
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

  async getPlayerDetails(): Promise<PlayerDetail[]> {
    const response = await api.get<ApiResponse<PlayerDetail[]>>('/users/players/details');
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

// Super Admin API
export const superAdminApi = {
  // User management
  async getUsers(query?: { role?: string; status?: string; search?: string }): Promise<User[]> {
    const response = await api.get<ApiResponse<User[]>>('/super-admin/users', { params: query });
    return handleResponse(response);
  },

  async getUserById(id: number): Promise<User> {
    const response = await api.get<ApiResponse<User>>(`/super-admin/users/${id}`);
    return handleResponse(response);
  },

  async createUser(userData: { username: string; password: string; role: string }): Promise<User> {
    const response = await api.post<ApiResponse<User>>('/super-admin/users', userData);
    return handleResponse(response);
  },

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const response = await api.put<ApiResponse<User>>(`/super-admin/users/${id}`, userData);
    return handleResponse(response);
  },

  async deleteUser(id: number): Promise<void> {
    await api.delete(`/super-admin/users/${id}`);
  },

  async batchUpdateUsers(data: { userIds: number[]; action: string; value?: any }): Promise<void> {
    await api.put('/super-admin/users/batch', data);
  },

  async resetPassword(id: number, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<ApiResponse<{ message: string }>>(`/super-admin/users/${id}/reset-password`, { newPassword });
    return handleResponse(response);
  },

  // Statistics
  async getSystemOverview(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/super-admin/stats/overview');
    return handleResponse(response);
  },

  async getTrendAnalysis(period: string = '7d'): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/super-admin/stats/trends`, { params: { period } });
    return handleResponse(response);
  },

  async getRevenueAnalysis(period: string = '30d'): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/super-admin/stats/revenue/analysis`, { params: { period } });
    return handleResponse(response);
  },

  async getSystemHealth(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/super-admin/stats/health');
    return handleResponse(response);
  },

  // Export functionality
  async exportUsers(format: string = 'csv'): Promise<Blob> {
    const response = await api.get(`/super-admin/export/users`, { 
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  },

  async exportStats(period: string = '30d', format: string = 'csv'): Promise<Blob> {
    const response = await api.get(`/super-admin/export/stats`, { 
      params: { period, format },
      responseType: 'blob'
    });
    return response.data;
  },
  async getPerformanceRankings(params?: { role?: string; period?: string; limit?: number }): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/super-admin/stats/performance/rankings', { params });
    return handleResponse(response);
  },
};

// Player stats API
export const playerStatsApi = {
  async getDashboardOverview(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/player/stats/dashboard');
    return handleResponse(response);
  },
  async getMyTasks(filters?: { status?: string; page?: number; limit?: number }): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/player/stats/tasks/my', { params: filters });
    return handleResponse(response);
  },
  async getAvailableTasks(filters?: { gameType?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number }): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/player/stats/tasks/available', { params: filters });
    return handleResponse(response);
  },
  async getEarningsStats(period?: string): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/player/stats/earnings', { params: { period } });
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

// Game Dictionary API
export const gameDictionaryApi = {
  async getActiveDictionary(): Promise<GameDictionary> {
    const response = await api.get<ApiResponse<GameDictionary>>('/game-dictionary/active');
    return handleResponse(response);
  },

  async getGameModes(gameNameId?: number): Promise<GameMode[]> {
    const response = await api.get<ApiResponse<GameMode[]>>('/game-dictionary/modes', {
      params: gameNameId ? { gameNameId } : {}
    });
    return handleResponse(response);
  },

  // Super Admin functions
  async getAllGameNames(): Promise<GameName[]> {
    const response = await api.get<ApiResponse<GameName[]>>('/game-dictionary/names');
    return handleResponse(response);
  },

  async createGameName(data: CreateGameNameRequest): Promise<GameName> {
    const response = await api.post<ApiResponse<GameName>>('/game-dictionary/names', data);
    return handleResponse(response);
  },

  async updateGameName(id: number, data: UpdateGameNameRequest): Promise<GameName> {
    const response = await api.put<ApiResponse<GameName>>(`/game-dictionary/names/${id}`, data);
    return handleResponse(response);
  },

  async deleteGameName(id: number): Promise<DeleteDictionaryResponse> {
    const response = await api.delete<ApiResponse<DeleteDictionaryResponse>>(`/game-dictionary/names/${id}`);
    return handleResponse(response);
  },

  async getAllGameModes(): Promise<GameMode[]> {
    const response = await api.get<ApiResponse<GameMode[]>>('/game-dictionary/modes/all');
    return handleResponse(response);
  },

  async createGameMode(data: CreateGameModeRequest): Promise<GameMode> {
    const response = await api.post<ApiResponse<GameMode>>('/game-dictionary/modes', data);
    return handleResponse(response);
  },

  async updateGameMode(id: number, data: UpdateGameModeRequest): Promise<GameMode> {
    const response = await api.put<ApiResponse<GameMode>>(`/game-dictionary/modes/${id}`, data);
    return handleResponse(response);
  },

  async deleteGameMode(id: number): Promise<DeleteDictionaryResponse> {
    const response = await api.delete<ApiResponse<DeleteDictionaryResponse>>(`/game-dictionary/modes/${id}`);
    return handleResponse(response);
  },
};

export default api;