-- Basic table structure creation script - Simple version for MariaDB

-- Create users table
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_contact VARCHAR(50) NOT NULL,
    game_name VARCHAR(100) NOT NULL,
    game_mode VARCHAR(100),
    duration INT NOT NULL,
    estimated_duration INT,
    actual_duration INT,
    original_duration INT,
    price DECIMAL(10,2) NOT NULL,
    requirements TEXT,
    dispatcher_id INT NOT NULL,
    player_id INT NULL,
    status ENUM('pending', 'accepted', 'in_progress', 'paused', 'completed', 'cancelled', 'overtime') DEFAULT 'pending',
    overtime_at DATETIME NULL,
    completion_rate DECIMAL(5,2),
    dispatcher_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create task_logs table
CREATE TABLE IF NOT EXISTS task_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Create indexes for tasks table
CREATE INDEX IF NOT EXISTS idx_tasks_dispatcher_id ON tasks(dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_tasks_player_id ON tasks(player_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Create indexes for task_logs table
CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_user_id ON task_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_action ON task_logs(action);
CREATE INDEX IF NOT EXISTS idx_task_logs_created_at ON task_logs(created_at);

-- Create indexes for user_sessions table
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);

-- Add foreign key constraints (skip if already exist)
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
                  WHERE constraint_schema = DATABASE() 
                  AND constraint_name = 'fk_tasks_dispatcher' 
                  AND table_name = 'tasks');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE tasks ADD CONSTRAINT fk_tasks_dispatcher FOREIGN KEY (dispatcher_id) REFERENCES users(id) ON DELETE CASCADE', 
    'SELECT "Foreign key already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints 
                  WHERE constraint_schema = DATABASE() 
                  AND constraint_name = 'fk_tasks_player' 
                  AND table_name = 'tasks');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE tasks ADD CONSTRAINT fk_tasks_player FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE SET NULL', 
    'SELECT "Foreign key already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Insert initial super admin user
INSERT IGNORE INTO users (username, password, role, is_active, status) 
VALUES ('super_admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', TRUE, 'idle');