-- 添加时间延长功能的数据库迁移
-- 创建时间延长申请表
CREATE TABLE IF NOT EXISTS time_extension_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    player_id INT NOT NULL,
    dispatcher_id INT NOT NULL,
    requested_minutes INT NOT NULL COMMENT '申请延长的分钟数',
    reason VARCHAR(500) COMMENT '申请理由',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reviewed_by INT COMMENT '审核人ID',
    reviewed_at TIMESTAMP NULL,
    review_reason VARCHAR(500) COMMENT '审核理由/备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (dispatcher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_task_id (task_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- 为tasks表添加original_duration字段来记录原始时长
ALTER TABLE tasks 
ADD COLUMN original_duration INT COMMENT '原始任务时长(分钟)' AFTER duration;

-- 为已有任务设置original_duration
UPDATE tasks SET original_duration = duration WHERE original_duration IS NULL;

-- 扩展task_logs表，添加新的操作类型
ALTER TABLE task_logs MODIFY COLUMN action VARCHAR(50);

-- 添加索引优化查询性能
ALTER TABLE tasks ADD INDEX idx_status_player (status, player_id);
ALTER TABLE tasks ADD INDEX idx_dispatcher_status (dispatcher_id, status);