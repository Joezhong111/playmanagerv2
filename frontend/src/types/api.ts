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
  role: 'dispatcher' | 'player' | 'admin' | 'super_admin';
  status: 'idle' | 'busy' | 'offline';
  created_at?: string;
  updated_at?: string;
}

// 陪玩员详细信息接口
export interface PlayerDetail extends User {
  active_tasks: number;           // 活跃任务数量
  total_tasks: number;           // 总任务数量
  queued_tasks: number;          // 排队任务数量
  completed_tasks: number;       // 已完成任务数量
  current_task_id?: number;      // 当前任务ID
  current_game_name?: string;    // 当前游戏名称
  current_customer_name?: string;// 当前客户名称
  current_duration?: number;     // 当前任务时长（分钟）
  current_started_at?: string;   // 当前任务开始时间
  current_task_progress?: number;// 当前任务进度（0-100）
  current_task_time_remaining?: number; // 当前任务剩余时间（分钟）
}

export interface Task {
  id: number;
  customer_name: string;
  customer_contact: string;
  game_name: string;
  game_mode: string;
  duration: number; // minutes
  original_duration?: number; // minutes - 原始时长
  price: number;
  requirements?: string;
  dispatcher_id: number;
  player_id?: number | null;
  status: 'pending' | 'accepted' | 'queued' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'overtime';
  queue_order?: number | null;
  queued_at?: string | null;
  created_at: string;
  accepted_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  overtime_at?: string | null; // 任务超时时间
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
  status?: 'pending' | 'accepted' | 'queued' | 'in_progress' | 'completed' | 'cancelled';
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

// 时间延长申请相关类型
export interface TimeExtensionRequest {
  id: number;
  task_id: number;
  player_id: number;
  dispatcher_id: number;
  requested_minutes: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  review_reason?: string;
  created_at: string;
  updated_at: string;
  // 关联数据
  task?: Task;
  player_name?: string;
  reviewer_name?: string;
}

export interface CreateExtensionRequest {
  task_id: number;
  requested_minutes: number;
  reason?: string;
}

export interface ReviewExtensionRequest {
  status: 'approved' | 'rejected';
  review_reason?: string;
}

export interface ExtendTaskDurationRequest {
  additional_minutes: number;
  reason?: string;
}