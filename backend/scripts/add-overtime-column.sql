-- 添加超时时间列到任务表
ALTER TABLE tasks 
ADD COLUMN overtime_at DATETIME NULL COMMENT '任务超时时间';

-- 修改任务表的状态枚举，添加 overtime 状态
ALTER TABLE tasks 
MODIFY COLUMN status ENUM('pending', 'accepted', 'in_progress', 'paused', 'completed', 'cancelled', 'overtime') 
DEFAULT 'pending' 
COMMENT '任务状态';