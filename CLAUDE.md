# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PlayManagerV2 is a comprehensive task dispatch and management system for gaming companions (陪玩管理系统). It features a modern full-stack architecture with real-time communication, task management, and user role-based access control.

The system supports two main user roles:
- **Dispatchers** (派单员): Create and manage gaming tasks, assign them to players
- **Players** (陪玩员): Accept and complete gaming tasks, manage their availability status

## Architecture

### Technology Stack
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, React 19
- **Backend**: Node.js with Express, Socket.IO for real-time communication
- **Database**: MySQL with connection pooling and timezone support (UTC+8)
- **Authentication**: JWT-based authentication with role-based access control
- **Real-time**: Socket.IO for live task updates and notifications

### Project Structure
```
playmanagerv2/
├── backend/                 # Node.js/Express API server
│   ├── config/             # Database and application configuration
│   ├── controllers/        # Request handlers (MVC pattern)
│   ├── services/           # Business logic layer
│   ├── repositories/       # Data access layer
│   ├── routes/            # API route definitions
│   ├── middleware/        # Express middleware (auth, validation, error handling)
│   ├── sockets/           # Socket.IO event handlers
│   ├── utils/             # Utility functions and helpers
│   ├── dto/               # Data Transfer Objects for validation
│   └── server.js          # Main application entry point
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # Reusable React components
│   │   ├── contexts/      # React contexts for state management
│   │   ├── lib/           # Utility libraries (API, socket, utils)
│   │   └── types/         # TypeScript type definitions
│   └── public/            # Static assets
├── scripts/                # Development and maintenance scripts
│   ├── test/              # Testing and diagnostic scripts
│   ├── database/          # Database management scripts
│   └── utils/             # Utility scripts
└── docs/                  # Comprehensive project documentation
```

## Development Commands

### Backend Development
```bash
cd backend

# Development with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start

# Database initialization (complete setup)
node scripts/database-setup.js

# Database management tool
node scripts/db-manager.js init      # Initialize database
node scripts/db-manager.js status    # Check database status
node scripts/db-manager.js clean     # Clean expired data

# Timezone testing
npm run test-timezone
```

### Frontend Development
```bash
cd frontend

# Development with Turbopack
npm run dev

# Production build with Turbopack
npm run build

# Start production server
npm start

# Linting
npm run lint
```

### Scripts and Utilities
```bash
# Database management (统一管理)
cd backend
node scripts/database-setup.js               # Complete database initialization
node scripts/db-manager.js init              # Initialize database
node scripts/db-manager.js status            # Check database status
node scripts/db-manager.js reset             # Reset database (clear all data)
node scripts/db-manager.js clean             # Clean expired data

# Super admin management
node scripts/check-super-admin.js            # Check super admin status
node scripts/verify-super-admin.js           # Verify super admin account
node scripts/super-admin-manager.js          # Manage super admin

# Testing and diagnostics
node scripts/diagnose-database.js            # Database diagnostic tool
```

## Key Features

### Task Management System
- **Task Creation**: Dispatchers create gaming tasks with customer details, game info, duration, and pricing
- **Task Assignment**: Tasks can be directly assigned to players or left for players to accept
- **Status Management**: Tasks flow through states: pending → accepted → in_progress → completed
- **Real-time Updates**: Socket.IO provides live task status updates across all connected clients
- **Task Editing**: Dispatchers can modify task details and reassign tasks
- **Time Extensions**: Players can request time extensions with dispatcher approval

### User Management
- **Role-based Access**: Different UI and permissions for dispatchers vs players
- **Status Management**: Players can set their availability (idle/busy/offline)
- **Authentication**: JWT-based with secure session management
- **User Profiles**: Track user statistics and task history

### Real-time Features
- **Live Notifications**: Instant updates for task assignments, status changes, and time extension requests
- **Presence Management**: Real-time user online/offline status
- **Task Timer**: Live countdown timer for active tasks with audio alerts
- **Dashboard Updates**: Real-time dashboard updates for both roles

## Database Schema

### Core Tables
- **users**: User accounts with roles (dispatcher/player) and status
- **tasks**: Task records with customer info, game details, and status tracking
- **task_logs**: Audit trail for all task status changes
- **user_sessions**: JWT session management
- **statistics**: Daily performance metrics and analytics

### Key Relationships
- Tasks belong to dispatchers (created_by) and optionally assigned to players
- Task status changes are logged in task_logs with user attribution
- Statistics are aggregated daily per user and globally

## API Architecture

### RESTful Endpoints
- `/api/auth/*` - Authentication (login, register, verify)
- `/api/users/*` - User management and profile operations
- `/api/tasks/*` - Task CRUD operations and status management
- `/api/stats/*` - Analytics and reporting
- `/api/setup/*` - System initialization and health checks

### Response Format
All API responses follow a consistent format:
```json
{
  "success": true,
  "message": "Operation description",
  "data": { /* response data */ }
}
```

### WebSocket Events
- `task:created` - New task created
- `task:updated` - Task status or details changed
- `task:assigned` - Task assigned to player
- `user:status_changed` - User availability updated
- `extension:requested` - Time extension requested
- `extension:approved` - Time extension approved

## Environment Configuration

### Backend Environment Variables (.env)
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=dispatch_system
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend Environment Variables (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

## Development Workflow

### Code Patterns
- **Backend**: Follows Controller-Service-Repository pattern
- **Frontend**: Uses functional components with hooks and TypeScript
- **Validation**: Comprehensive input validation using express-validator and Zod
- **Error Handling**: Centralized error handling with custom error classes
- **Logging**: Structured logging with Winston for debugging and monitoring

### Testing
- Currently using manual testing via Postman/curl
- Database initialization scripts provide test data
- Timezone validation ensures consistent datetime handling

### Git Workflow
- Feature branches: `feature/feature-name`
- Bug fixes: `bugfix/description`
- Conventional commit messages: `type(scope): description`

## Important Implementation Details

### Timezone Handling
- All datetime operations use UTC+8 (Beijing time)
- Database connections are configured with proper timezone settings
- Validation functions ensure timezone consistency

### Security
- JWT tokens for authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- CORS configuration for cross-origin requests
- Rate limiting for API endpoints

### Real-time Communication
- Socket.IO rooms for task-specific notifications
- Connection management with proper cleanup
- Event-driven architecture for state synchronization

## Common Development Tasks

### Adding New Task Status
1. Update the `status` ENUM in the database tasks table
2. Add the new status to TypeScript types
3. Update frontend status indicators and transitions
4. Add corresponding API endpoints and socket events

### Creating New User Role
1. Add role to the users table ENUM
2. Update authentication middleware
3. Create role-specific UI components
4. Add role-based API access controls

### Adding New Game Type
1. Update game validation schemas
2. Add game-specific configuration options
3. Update frontend game selection components
4. Consider game-specific task requirements

## Troubleshooting

### Database Connection Issues
- Verify MySQL service is running
- Check environment variables in .env files
- Ensure database user has proper permissions
- Run timezone validation script

### Frontend Build Issues
- Clear Next.js cache: `rm -rf .next`
- Verify all dependencies are installed
- Check TypeScript configuration
- Ensure environment variables are properly set

### Socket.IO Connection Problems
- Verify CORS configuration matches frontend origin
- Check that WebSocket port is accessible
- Ensure proper authentication token handling
- Monitor socket connection logs in backend