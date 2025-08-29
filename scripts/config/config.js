#!/usr/bin/env node

/**
 * 统一配置文件
 * 所有测试和调试脚本的配置中心
 */

// API配置
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3003/api',
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json'
  }
};

// 数据库配置
export const DB_CONFIG = {
  HOST: 'localhost',
  PORT: 3306,
  USERNAME: 'root',
  PASSWORD: '',
  DATABASE: 'dispatch_system',
  TIMEZONE: '+08:00'
};

// 测试用户配置
export const TEST_USERS = {
  PLAYER: {
    username: 'player1',
    password: 'admin123',
    role: 'player'
  },
  DISPATCHER: {
    username: 'dispatcher1', 
    password: 'admin123',
    role: 'dispatcher'
  },
  ADMIN: {
    username: 'admin',
    password: 'admin123',
    role: 'admin'
  },
  SUPER_ADMIN: {
    username: 'super_admin',
    password: 'admin123',
    role: 'super_admin'
  }
};

// API端点配置
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY: '/auth/verify'
  },
  TASKS: {
    BASE: '/tasks',
    PLAYER: '/player/tasks',
    PLAYER_STATS: '/player/stats',
    DISPATCHER: '/dispatcher/tasks'
  },
  USERS: {
    BASE: '/users',
    PLAYERS: '/users/players',
    PLAYER_DETAILS: '/users/players/details',
    DISPATCHERS: '/users/dispatchers'
  },
  STATS: {
    PLAYER: '/player/stats',
    SUPER_ADMIN: '/super-admin/stats'
  },
  SETUP: {
    RESET: '/setup/reset',
    RESET_SUPERADMIN: '/setup/reset-superadmin',
    HEALTH: '/setup/health'
  }
};

// 任务状态配置
export const TASK_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  OVERTIME: 'overtime',
  QUEUED: 'queued'
};

// 用户状态配置
export const USER_STATUSES = {
  IDLE: 'idle',
  BUSY: 'busy',
  OFFLINE: 'offline'
};

// 用户角色配置
export const USER_ROLES = {
  PLAYER: 'player',
  DISPATCHER: 'dispatcher',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
};

// 测试配置
export const TEST_CONFIG = {
  PAGINATION: {
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },
  TIMEOUT: {
    SHORT: 5000,
    MEDIUM: 15000,
    LONG: 30000
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000
  }
};

// 颜色和样式配置
export const STYLE_CONFIG = {
  COLORS: {
    SUCCESS: '\x1b[32m',
    ERROR: '\x1b[31m',
    WARNING: '\x1b[33m',
    INFO: '\x1b[36m',
    RESET: '\x1b[0m'
  },
  SYMBOLS: {
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: 'ℹ️',
    LOADING: '⏳',
    DEBUG: '🔍'
  }
};

// 日志配置
export const LOG_CONFIG = {
  LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  },
  CURRENT_LEVEL: 2 // INFO
};