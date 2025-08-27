// API Response types based on backend-api-guide.md
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  timestamp?: string;
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
  timestamp: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  role: 'dispatcher' | 'player';
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface User {
  id: number;
  username: string;
  role: 'dispatcher' | 'player' | 'admin';
  status: 'idle' | 'busy';
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  customer_name: string;
  customer_contact: string;
  game_name: string;
  game_mode: string;
  duration: number; // hours
  price: number;
  requirements?: string;
  dispatcher_id: number;
  player_id?: number | null;
  status: 'pending' | 'accepted' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  created_at: string;
  accepted_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface CreateTaskRequest {
  customer_name: string;
  customer_contact: string;
  game_name: string;
  game_mode: string;
  duration: number;
  price: number;
  requirements?: string;
  player_id?: number;
}

export interface UpdateTaskRequest {
  customer_name?: string;
  customer_contact?: string;
  game_name?: string;
  game_mode?: string;
  duration?: number;
  price?: number;
  requirements?: string;
  player_id?: number;
}

export interface UpdateStatusRequest {
  status: 'idle' | 'busy';
}

export interface TaskQuery {
  status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  player_id?: number;
  dispatcher_id?: number;
  page?: number;
  limit?: number;
}

export interface UserQuery {
  role?: 'dispatcher' | 'player' | 'admin';
  status?: 'idle' | 'busy';
}

export interface SetupResponse {
  userCount: number;
  taskCount: number;
}

export interface StatusResponse {
  initialized: boolean;
  tables: string[];
  data?: {
    userCount: number;
    taskCount: number;
  };
}

export interface TimeTestResponse {
  database_now: string;
  javascript: {
    local_time: string;
    utc_time: string;
    timestamp: number;
    timezone_offset: number;
  };
}

export interface StatsQuery {
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface TaskStats {
  total: number;
  pending: number;
  accepted: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

export interface UserStats {
  total: number;
  dispatchers: number;
  players: number;
  idle: number;
  busy: number;
}