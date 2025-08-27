
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

export const errorHandler = (
  error,
  req,
  res,
  next
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  }

  // 记录日志
  logger.error('Application error', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.username
  });

  const response = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString()
  };

  // 在开发环境中提供更详细的堆栈信息
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};
