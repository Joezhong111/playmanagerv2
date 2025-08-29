-- 基础表结构创建脚本
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('player', 'dispatcher', 'admin', 'super_admin') DEFAULT 'player',
    status ENUM('idle', 'busy', 'offline') DEFAULT 'idle',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    login_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- 创建任务表
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_contact VARCHAR(50) NOT NULL,
    game_name VARCHAR(100) NOT NULL,
    game_mode VARCHAR(100),
    duration INT NOT NULL COMMENT '任务时长(分钟)',
    estimated_duration INT COMMENT '预估任务时长(分钟)',
    actual_duration INT COMMENT '实际任务时长(分钟)',
    original_duration INT COMMENT '原始任务时长(分钟)',
    price DECIMAL(10,2) NOT NULL,
    requirements TEXT,
    dispatcher_id INT NOT NULL,
    player_id INT NULL,
    status ENUM('pending', 'accepted', 'in_progress', 'paused', 'completed', 'cancelled', 'overtime') DEFAULT 'pending',
    overtime_at DATETIME NULL COMMENT '任务超时时间',
    completion_rate DECIMAL(5,2) COMMENT '完成率评分(1-5)',
    dispatcher_notes TEXT COMMENT '派单员备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_dispatcher_id (dispatcher_id),
    INDEX idx_player_id (player_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_status_player (status, player_id),
    INDEX idx_dispatcher_status (dispatcher_id, status),
    INDEX idx_created_status (created_at, status),
    INDEX idx_date_status (DATE(created_at), status),
    
    FOREIGN KEY (dispatcher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 创建任务日志表
CREATE TABLE IF NOT EXISTS task_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

-- 插入初始数据
INSERT INTO users (username, password, role, is_active, status) 
VALUES ('super_admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', TRUE, 'idle')
ON DUPLICATE KEY UPDATE username = username;