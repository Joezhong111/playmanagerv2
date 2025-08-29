#!/usr/bin/env node

/**
 * 统一工具库
 * 所有测试和调试脚本的通用工具函数
 */

import axios from 'axios';
import { 
  API_CONFIG, 
  TEST_CONFIG, 
  STYLE_CONFIG, 
  LOG_CONFIG,
  API_ENDPOINTS 
} from '../config/config.js';

// 颜色输出工具
export const colors = {
  success: (text) => `${STYLE_CONFIG.COLORS.SUCCESS}${text}${STYLE_CONFIG.COLORS.RESET}`,
  error: (text) => `${STYLE_CONFIG.COLORS.ERROR}${text}${STYLE_CONFIG.COLORS.RESET}`,
  warning: (text) => `${STYLE_CONFIG.COLORS.WARNING}${text}${STYLE_CONFIG.COLORS.RESET}`,
  info: (text) => `${STYLE_CONFIG.COLORS.INFO}${text}${STYLE_CONFIG.COLORS.RESET}`,
  debug: (text) => `${STYLE_CONFIG.COLORS.INFO}${text}${STYLE_CONFIG.COLORS.RESET}`
};

// 符号输出工具
export const symbols = {
  success: STYLE_CONFIG.SYMBOLS.SUCCESS,
  error: STYLE_CONFIG.SYMBOLS.ERROR,
  warning: STYLE_CONFIG.SYMBOLS.WARNING,
  info: STYLE_CONFIG.SYMBOLS.INFO,
  loading: STYLE_CONFIG.SYMBOLS.LOADING,
  debug: STYLE_CONFIG.SYMBOLS.DEBUG
};

// 日志工具
export const logger = {
  error: (message, data = null) => {
    if (LOG_CONFIG.CURRENT_LEVEL >= LOG_CONFIG.LEVELS.ERROR) {
      console.error(`${symbols.error} ${colors.error(message)}`);
      if (data) console.error('   ', data);
    }
  },
  
  warn: (message, data = null) => {
    if (LOG_CONFIG.CURRENT_LEVEL >= LOG_CONFIG.LEVELS.WARN) {
      console.warn(`${symbols.warning} ${colors.warning(message)}`);
      if (data) console.warn('   ', data);
    }
  },
  
  info: (message, data = null) => {
    if (LOG_CONFIG.CURRENT_LEVEL >= LOG_CONFIG.LEVELS.INFO) {
      console.info(`${symbols.info} ${colors.info(message)}`);
      if (data) console.info('   ', data);
    }
  },
  
  debug: (message, data = null) => {
    if (LOG_CONFIG.CURRENT_LEVEL >= LOG_CONFIG.LEVELS.DEBUG) {
      console.debug(`${symbols.debug} ${colors.debug(message)}`);
      if (data) console.debug('   ', data);
    }
  },
  
  success: (message, data = null) => {
    console.log(`${symbols.success} ${colors.success(message)}`);
    if (data) console.log('   ', data);
  }
};

// API客户端
export class ApiClient {
  constructor(baseURL = API_CONFIG.BASE_URL) {
    this.baseURL = baseURL;
    this.token = null;
    this.client = axios.create({
      baseURL,
      timeout: API_CONFIG.TIMEOUT,
      headers: API_CONFIG.HEADERS
    });
  }

  setToken(token) {
    this.token = token;
    this.client.defaults.headers.Authorization = `Bearer ${token}`;
  }

  async request(method, endpoint, data = null, config = {}) {
    try {
      const response = await this.client.request({
        method,
        url: endpoint,
        data,
        ...config
      });
      return response.data;
    } catch (error) {
      logger.error(`API请求失败: ${endpoint}`, error.response?.data || error.message);
      throw error;
    }
  }

  async get(endpoint, config = {}) {
    return this.request('GET', endpoint, null, config);
  }

  async post(endpoint, data = null, config = {}) {
    return this.request('POST', endpoint, data, config);
  }

  async put(endpoint, data = null, config = {}) {
    return this.request('PUT', endpoint, data, config);
  }

  async delete(endpoint, config = {}) {
    return this.request('DELETE', endpoint, null, config);
  }
}

// 重试工具
export async function retry(fn, maxAttempts = TEST_CONFIG.RETRY.MAX_ATTEMPTS, delay = TEST_CONFIG.RETRY.DELAY) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        logger.debug(`第 ${attempt} 次尝试失败，${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// 延迟工具
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 格式化时间
export function formatDate(date) {
  return new Date(date).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 格式化货币
export function formatCurrency(amount) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount);
}

// 格式化持续时间
export function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}分钟`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days}天${hours}小时` : `${days}天`;
  }
}

// 表格显示工具
export function displayTable(headers, rows) {
  const columnWidths = headers.map(header => 
    Math.max(header.length, ...rows.map(row => String(row[header]).length))
  );
  
  const separator = '+' + columnWidths.map(width => '-'.repeat(width + 2)).join('+') + '+';
  
  console.log(separator);
  console.log('| ' + headers.map((header, i) => header.padEnd(columnWidths[i])).join(' | ') + ' |');
  console.log(separator);
  
  rows.forEach(row => {
    console.log('| ' + headers.map((header, i) => 
      String(row[header]).padEnd(columnWidths[i])
    ).join(' | ') + ' |');
  });
  
  console.log(separator);
}

// 进度条工具
export function showProgress(current, total, width = 50) {
  const percentage = Math.floor((current / total) * 100);
  const filled = Math.floor((current / total) * width);
  const empty = width - filled;
  
  const bar = '[' + '='.repeat(filled) + ' '.repeat(empty) + ']';
  process.stdout.write(`\r${bar} ${percentage}% (${current}/${total})`);
  
  if (current === total) {
    console.log();
  }
}

// 验证工具
export const validators = {
  isEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  isPhone: (phone) => /^1[3-9]\d{9}$/.test(phone),
  isNumber: (value) => !isNaN(value) && isFinite(value),
  isPositiveNumber: (value) => validators.isNumber(value) && value > 0,
  isInteger: (value) => Number.isInteger(Number(value))
};

// 数据生成工具
export const generators = {
  randomId: () => Math.floor(Math.random() * 1000000),
  randomName: () => `测试用户${Math.floor(Math.random() * 1000)}`,
  randomPhone: () => `1${3 + Math.floor(Math.random() * 7)}${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
  randomEmail: () => `test${Math.floor(Math.random() * 1000)}@example.com`,
  randomGame: () => ['英雄联盟', '王者荣耀', '绝地求生', '原神', 'CS:GO'][Math.floor(Math.random() * 5)],
  randomGameMode: () => ['排位赛', '匹配赛', '娱乐模式', '专业模式'][Math.floor(Math.random() * 4)]
};

// 测试结果统计
export class TestStats {
  constructor() {
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  addResult(testName, passed, error = null) {
    this.total++;
    if (passed) {
      this.passed++;
      logger.success(`测试通过: ${testName}`);
    } else {
      this.failed++;
      logger.error(`测试失败: ${testName}`);
      if (error) {
        this.errors.push({ test: testName, error });
        logger.debug('错误详情:', error);
      }
    }
  }

  summary() {
    const success = this.total === 0 ? 0 : (this.passed / this.total * 100).toFixed(2);
    logger.info(`测试总结: ${this.passed}/${this.total} 通过 (${success}%)`);
    
    if (this.failed > 0) {
      logger.error(`失败测试数: ${this.failed}`);
    }
    
    return {
      total: this.total,
      passed: this.passed,
      failed: this.failed,
      success: parseFloat(success),
      errors: this.errors
    };
  }
}

// 导出常用实例
export const apiClient = new ApiClient();
export const testStats = new TestStats();