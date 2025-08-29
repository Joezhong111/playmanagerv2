-- 添加超级管理员功能和优化数据统计的数据库迁移
-- 添加超级管理员角色到users表
ALTER TABLE users 
MODIFY COLUMN role ENUM('player', 'dispatcher', 'admin', 'super_admin') DEFAULT 'player';

-- 添加用户状态管理字段
ALTER TABLE users 
ADD COLUMN is_active BOOLEAN DEFAULT TRUE COMMENT '用户是否激活' AFTER status,
ADD COLUMN last_login_at TIMESTAMP NULL COMMENT '最后登录时间' AFTER is_active,
ADD COLUMN login_count INT DEFAULT 0 COMMENT '登录次数' AFTER last_login_at;

-- 创建用户会话管理表
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL COMMENT 'JWT token hash',
    expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active)
);

-- 创建系统统计汇总表
CREATE TABLE IF NOT EXISTS system_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL COMMENT '统计日期',
    total_users INT DEFAULT 0 COMMENT '总用户数',
    active_users INT DEFAULT 0 COMMENT '活跃用户数',
    total_tasks INT DEFAULT 0 COMMENT '总任务数',
    completed_tasks INT DEFAULT 0 COMMENT '完成任务数',
    cancelled_tasks INT DEFAULT 0 COMMENT '取消任务数',
    total_revenue DECIMAL(10,2) DEFAULT 0.00 COMMENT '总收入',
    average_task_duration INT DEFAULT 0 COMMENT '平均任务时长(分钟)',
    peak_active_players INT DEFAULT 0 COMMENT '峰值活跃陪玩员',
    peak_active_tasks INT DEFAULT 0 COMMENT '峰值进行中任务',
    
    INDEX idx_date (date),
    UNIQUE KEY uk_date (date)
);

-- 创建用户统计表
CREATE TABLE IF NOT EXISTS user_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL COMMENT '统计日期',
    tasks_completed INT DEFAULT 0 COMMENT '完成任务数',
    tasks_cancelled INT DEFAULT 0 COMMENT '取消任务数',
    total_earnings DECIMAL(10,2) DEFAULT 0.00 COMMENT '总收入',
    total_duration INT DEFAULT 0 COMMENT '总工作时长(分钟)',
    average_duration INT DEFAULT 0 COMMENT '平均任务时长(分钟)',
    active_minutes INT DEFAULT 0 COMMENT '活跃时长(分钟)',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user_date (user_id, date),
    INDEX idx_date (date),
    UNIQUE KEY uk_user_date (user_id, date)
);

-- 添加任务统计字段
ALTER TABLE tasks 
ADD COLUMN estimated_duration INT COMMENT '预估任务时长(分钟)' AFTER duration,
ADD COLUMN actual_duration INT COMMENT '实际任务时长(分钟)' AFTER estimated_duration,
ADD COLUMN completion_rate DECIMAL(5,2) COMMENT '完成率评分(1-5)' AFTER actual_duration,
ADD COLUMN dispatcher_notes TEXT COMMENT '派单员备注' AFTER completion_rate;

-- 为已有任务设置默认值
UPDATE tasks SET estimated_duration = duration WHERE estimated_duration IS NULL;

-- 添加索引优化查询性能
ALTER TABLE tasks ADD INDEX idx_created_status (created_at, status);
ALTER TABLE tasks ADD INDEX idx_player_status (player_id, status);
ALTER TABLE tasks ADD INDEX idx_date_status (DATE(created_at), status);

-- 创建触发器：自动更新用户最后登录时间
DELIMITER //
CREATE TRIGGER update_user_last_login
AFTER INSERT ON user_sessions
FOR EACH ROW
BEGIN
    UPDATE users 
    SET last_login_at = NOW(),
        login_count = login_count + 1
    WHERE id = NEW.user_id;
END//
DELIMITER ;

-- 创建存储过程：清理过期会话
DELIMITER //
CREATE PROCEDURE CleanExpiredSessions()
BEGIN
    -- 标记过期会话为非活跃
    UPDATE user_sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW();
    
    -- 删除30天前的非活跃会话记录
    DELETE FROM user_sessions 
    WHERE is_active = FALSE AND last_activity < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- 更新离线用户状态
    UPDATE users u
    LEFT JOIN user_sessions s ON u.id = s.user_id AND s.is_active = TRUE AND s.expires_at > NOW()
    SET u.status = 'offline'
    WHERE u.role = 'player' AND s.id IS NULL AND u.status != 'offline';
END//
DELIMITER ;

-- 创建事件：每天凌晨执行会话清理
CREATE EVENT IF NOT EXISTS daily_session_cleanup
ON SCHEDULE EVERY 1 DAY
STARTS TIMESTAMP(DATE(NOW()) + INTERVAL 1 DAY)
DO
    CALL CleanExpiredSessions();

-- 初始化超级管理员账户（密码需要在应用层设置）
INSERT INTO users (username, password, role, is_active) 
VALUES ('super_admin', '$2b$10$placeholder_hash_for_super_admin', 'super_admin', TRUE)
ON DUPLICATE KEY UPDATE username = username;