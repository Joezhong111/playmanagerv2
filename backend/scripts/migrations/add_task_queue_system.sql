-- 排单功能数据库迁移
-- 添加 queued 任务状态和排队相关字段

-- 1. 扩展任务状态枚举，添加 queued 状态
ALTER TABLE tasks 
MODIFY COLUMN status ENUM('pending', 'accepted', 'queued', 'in_progress', 'paused', 'completed', 'cancelled') 
DEFAULT 'pending' 
COMMENT '任务状态：pending=待接受, accepted=已接受, queued=排队中, in_progress=进行中, paused=已暂停, completed=已完成, cancelled=已取消';

-- 2. 添加排队相关字段
ALTER TABLE tasks 
ADD COLUMN queue_order INT DEFAULT NULL COMMENT '队列顺序，数字越小优先级越高',
ADD COLUMN queued_at TIMESTAMP NULL DEFAULT NULL COMMENT '加入队列的时间';

-- 3. 添加索引优化排队任务查询性能
ALTER TABLE tasks ADD INDEX idx_player_queue_order (player_id, queue_order);
ALTER TABLE tasks ADD INDEX idx_status_queued_at (status, queued_at);
ALTER TABLE tasks ADD INDEX idx_player_status_queue (player_id, status, queue_order);

-- 4. 更新现有任务状态相关索引 (TiDB兼容版本)
-- 注意：如果索引已存在会报错，但不影响功能
ALTER TABLE tasks ADD INDEX idx_status_player_queue (status, player_id, queue_order);

COMMIT;