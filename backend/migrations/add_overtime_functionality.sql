-- 添加任务超时功能
-- 添加overtime_at字段用于记录任务超时时间

ALTER TABLE tasks 
ADD COLUMN overtime_at DATETIME NULL COMMENT '任务超时时间';

-- 为现有进行中的任务计算超时时间
UPDATE tasks 
SET overtime_at = DATE_ADD(started_at, INTERVAL duration MINUTE)
WHERE status = 'in_progress' AND started_at IS NOT NULL AND overtime_at IS NULL;

-- 创建索引以提高查询性能
CREATE INDEX idx_tasks_overtime_at ON tasks(overtime_at);

-- 添加注释说明
ALTER TABLE tasks 
MODIFY COLUMN overtime_at DATETIME NULL COMMENT '任务超时时间（started_at + duration）';