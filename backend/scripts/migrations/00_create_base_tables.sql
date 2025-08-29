-- Basic table structure creation script (MariaDB compatible version)

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('player', 'dispatcher', 'admin', 'super_admin') DEFAULT 'player',
    status ENUM('idle', 'busy', 'offline') DEFAULT 'idle',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    login_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create users table indexes
CREATE INDEX IF NOT EXISTS idx_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON users(created_at);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_contact VARCHAR(50) NOT NULL,
    game_name VARCHAR(100) NOT NULL,
    game_mode VARCHAR(100),
    duration INT NOT NULL COMMENT 'Task duration (minutes)',
    estimated_duration INT COMMENT 'Estimated duration (minutes)',
    actual_duration INT COMMENT 'Actual duration (minutes)',
    original_duration INT COMMENT 'Original duration (minutes)',
    price DECIMAL(10,2) NOT NULL,
    requirements TEXT,
    dispatcher_id INT NOT NULL,
    player_id INT NULL,
    status ENUM('pending', 'accepted', 'in_progress', 'paused', 'completed', 'cancelled', 'overtime') DEFAULT 'pending',
    overtime_at DATETIME NULL COMMENT 'Task overtime time',
    completion_rate DECIMAL(5,2) COMMENT 'Completion rate score (1-5)',
    dispatcher_notes TEXT COMMENT 'Dispatcher notes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create tasks table indexes
CREATE INDEX IF NOT EXISTS idx_dispatcher_id ON tasks(dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_player_id ON tasks(player_id);
CREATE INDEX IF NOT EXISTS idx_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_status_player ON tasks(status, player_id);
CREATE INDEX IF NOT EXISTS idx_dispatcher_status ON tasks(dispatcher_id, status);
CREATE INDEX IF NOT EXISTS idx_created_status ON tasks(created_at, status);
CREATE INDEX IF NOT EXISTS idx_date_status ON tasks(DATE(created_at), status);

-- Create tasks table foreign key constraints
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_dispatcher 
FOREIGN KEY (dispatcher_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_player 
FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE SET NULL;

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

-- Create task_logs table indexes
CREATE INDEX IF NOT EXISTS idx_task_id ON task_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_user_id ON task_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action ON task_logs(action);
CREATE INDEX IF NOT EXISTS idx_created_at ON task_logs(created_at);

-- Create task_logs table foreign key constraints
ALTER TABLE task_logs 
ADD CONSTRAINT fk_task_logs_task 
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_logs 
ADD CONSTRAINT fk_task_logs_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL COMMENT 'JWT token hash',
    expires_at TIMESTAMP NOT NULL COMMENT 'Expiration time',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create user_sessions table indexes
CREATE INDEX IF NOT EXISTS idx_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_is_active ON user_sessions(is_active);

-- Create user_sessions table foreign key constraints
ALTER TABLE user_sessions 
ADD CONSTRAINT fk_user_sessions_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Insert initial data
INSERT INTO users (username, password, role, is_active, status) 
VALUES ('super_admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', TRUE, 'idle')
ON DUPLICATE KEY UPDATE username = username;