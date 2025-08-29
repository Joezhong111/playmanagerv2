-- 更新用户表结构，添加超级管理员角色
-- 这个脚本需要在使用 setup/reset 功能之前运行

USE dispatch_system;

-- 修改用户表的角色枚举，添加 super_admin 角色
ALTER TABLE users 
MODIFY COLUMN role ENUM('dispatcher', 'player', 'super_admin') NOT NULL COMMENT '用户角色';

-- 添加超级管理员用户（如果不存在）
INSERT IGNORE INTO users (username, password, role, status) 
VALUES ('superadmin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', 'idle');

-- 更新现有admin用户为超级管理员（可选）
-- UPDATE users SET role = 'super_admin' WHERE username = 'admin';

SELECT 'User table updated successfully with super_admin role' as message;