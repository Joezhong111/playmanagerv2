-- 添加游戏字典管理功能的数据库迁移

-- 创建游戏名称字典表
CREATE TABLE IF NOT EXISTS game_names (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '游戏名称',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    sort_order INT DEFAULT 0 COMMENT '排序权重',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order),
    UNIQUE KEY uk_name (name)
);

-- 创建游戏模式字典表  
CREATE TABLE IF NOT EXISTS game_modes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_name_id INT NULL COMMENT '关联游戏名称ID，NULL表示通用模式',
    name VARCHAR(100) NOT NULL COMMENT '游戏模式名称',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    sort_order INT DEFAULT 0 COMMENT '排序权重',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_game_name_id (game_name_id),
    INDEX idx_name (name),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order),
    UNIQUE KEY uk_game_mode (game_name_id, name),
    
    FOREIGN KEY (game_name_id) REFERENCES game_names(id) ON DELETE CASCADE
);

-- 初始数据将由Node.js脚本插入，这里不使用复杂的SQL查询

-- 添加索引优化查询性能
ALTER TABLE game_names ADD INDEX idx_active_sort (is_active, sort_order);
ALTER TABLE game_modes ADD INDEX idx_game_active_sort (game_name_id, is_active, sort_order);