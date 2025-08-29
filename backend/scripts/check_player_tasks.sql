-- 检查陪玩员活跃任务的SQL查询
-- 请在MySQL数据库中执行这些查询

-- 1. 查看所有陪玩员的状态
SELECT id, username, role, status, created_at, updated_at 
FROM users 
WHERE role = 'player'
ORDER BY id;

-- 2. 查看所有任务的状态分布
SELECT 
    status,
    COUNT(*) as task_count,
    GROUP_CONCAT(id) as task_ids
FROM tasks 
GROUP BY status
ORDER BY status;

-- 3. 查看特定陪玩员 (ID: 60003) 的所有任务
SELECT 
    t.id,
    t.customer_name,
    t.game_name,
    t.game_mode,
    t.status,
    t.created_at,
    t.started_at,
    t.completed_at,
    t.player_id
FROM tasks t
WHERE t.player_id = 60003
ORDER BY t.created_at DESC;

-- 4. 查看特定陪玩员的活跃任务 (根据 findActiveTaskByPlayer 逻辑)
SELECT 
    t.id,
    t.customer_name,
    t.game_name,
    t.status,
    t.created_at,
    t.started_at
FROM tasks t
WHERE t.player_id = 60003 
  AND t.status IN ('in_progress', 'paused', 'overtime')
ORDER BY t.created_at DESC;

-- 5. 查看前端应该显示的任务 (根据前端逻辑)
SELECT 
    t.id,
    t.customer_name,
    t.game_name,
    t.status,
    t.created_at
FROM tasks t
WHERE t.player_id = 60003 
  AND t.status IN ('accepted', 'in_progress', 'paused')
ORDER BY t.created_at DESC;

-- 6. 检查是否有孤立的任务状态 (活跃但不在前端显示范围内)
SELECT 
    t.id,
    t.customer_name,
    t.game_name,
    t.status,
    t.created_at
FROM tasks t
WHERE t.player_id = 60003 
  AND t.status IN ('in_progress', 'paused', 'overtime')
  AND t.status NOT IN ('accepted', 'in_progress', 'paused')
ORDER BY t.created_at DESC;

-- 7. 检查任务状态不一致问题
SELECT 
    u.id as user_id,
    u.username,
    u.status as user_status,
    COUNT(t.id) as total_tasks,
    SUM(CASE WHEN t.status IN ('in_progress', 'paused', 'overtime') THEN 1 ELSE 0 END) as active_tasks,
    SUM(CASE WHEN t.status IN ('accepted', 'in_progress', 'paused') THEN 1 ELSE 0 END) as display_tasks
FROM users u
LEFT JOIN tasks t ON u.id = t.player_id
WHERE u.role = 'player' AND u.id = 60003
GROUP BY u.id, u.username, u.status;

-- 8. 查看最近的任务状态变更
SELECT 
    tl.*,
    u.username as player_name
FROM task_logs tl
JOIN users u ON tl.user_id = u.id
WHERE tl.user_id = 60003
ORDER BY tl.created_at DESC
LIMIT 10;