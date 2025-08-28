'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Users, 
  Clock, 
  Search,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Timer,
  Edit,
  CheckCircle,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { tasksApi, usersApi } from '@/lib/api';
import { useSocket } from '@/lib/socket';
import type { Task, User, PlayerDetail } from '@/types/api';
import ExtensionRequestsPanel from '@/components/dispatcher/ExtensionRequestsPanel';
import ExtendTaskDurationDialog from '@/components/dispatcher/ExtendTaskDurationDialog';
import EditTaskDialog from '@/components/dispatcher/EditTaskDialog';

export default function DispatcherPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const socketManager = useSocket();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [players, setPlayers] = useState<User[]>([]);
  const [playerDetails, setPlayerDetails] = useState<PlayerDetail[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [isLoadingPlayerDetails, setIsLoadingPlayerDetails] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showExtensionRequests, setShowExtensionRequests] = useState(false);
  const [extendingTask, setExtendingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Check authentication and role
  useEffect(() => {
    if (!isLoading && !user) {
      toast.error('请先登录');
      router.push('/login');
      return;
    }
    
    // Allow access for dispatcher role or super admin (permission inheritance)
    if (!isLoading && user && user.role !== 'dispatcher' && user.role !== 'super_admin') {
      toast.error('无权访问此页面');
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load data
  useEffect(() => {
    if (user && (user.role === 'dispatcher' || user.role === 'super_admin')) {
      loadTasks();
      loadPlayers();
      loadPlayerDetails();
    }
  }, [user]);

  // 定时更新任务进度
  useEffect(() => {
    if (!user || (user.role !== 'dispatcher' && user.role !== 'super_admin')) return;

    const progressUpdateInterval = setInterval(async () => {
      // 只在有进行中任务时才更新
      const hasInProgressTasks = tasks.some(task => task.status === 'in_progress');
      if (hasInProgressTasks) {
        try {
          await loadPlayerDetails(); // 更新陪玩员详细信息以刷新任务进度
        } catch (error) {
          console.error('Progress update failed:', error);
          // 静默处理错误，避免干扰用户体验
        }
      }
    }, 30000); // 每30秒更新一次

    return () => {
      clearInterval(progressUpdateInterval);
    };
  }, [user, tasks]);

  // Socket 事件监听
  useEffect(() => {
    if (user && (user.role === 'dispatcher' || user.role === 'super_admin')) {
      const socket = socketManager.connect();
      console.log('[前端] Socket连接状态:', socket?.connected);
      if (socket) {
        // 监听任务状态变更
        const handleTaskStatusChange = (task: Task) => {
          setTasks(prevTasks => 
            prevTasks.map(t => t.id === task.id ? task : t)
          );
          
          // 任务状态变更时，重新加载陪玩员详细信息以更新任务统计
          try {
            loadPlayerDetails();
          } catch (error) {
            console.error('Failed to load player details after task status change:', error);
          }
        };

        // 监听陪玩员状态变更
        const handlePlayerStatusChange = (data: { userId: number; username: string; status: string; isOnline?: boolean }) => {
          console.log('[前端] 收到陪玩员状态变更事件:', data);
          
          setPlayers(prevPlayers => {
            const updated = prevPlayers.map(p => {
              if (p.id === data.userId) {
                // 如果用户离线且不是忙碌状态，显示为离线；否则保持原状态
                const newStatus = data.isOnline === false && data.status !== 'busy' ? 'offline' : data.status;
                return { ...p, status: newStatus as any };
              }
              return p;
            });
            console.log('[前端] 更新后的陪玩员列表:', updated);
            return updated;
          });
          
          // 同时更新陪玩员详细信息
          setPlayerDetails(prevDetails => {
            const updated = prevDetails.map(p => {
              if (p.id === data.userId) {
                // 如果用户离线且不是忙碌状态，显示为离线；否则保持原状态
                const newStatus = data.isOnline === false && data.status !== 'busy' ? 'offline' : data.status;
                return { ...p, status: newStatus as any };
              }
              return p;
            });
            return updated;
          });
          
          // 显示状态变更通知
          if (data.isOnline === false) {
            const statusText = data.status === 'busy' ? '忙碌中' : '离线';
            toast.info(`${data.username} 已离线 (${statusText})`);
          } else if (data.isOnline === true) {
            const statusText = data.status === 'idle' ? '空闲' : data.status === 'busy' ? '忙碌' : '离线';
            toast.info(`${data.username} 已上线，状态：${statusText}`);
          } else {
            // 纯状态变更，没有在线状态变化
            const statusText = data.status === 'idle' ? '空闲' : data.status === 'busy' ? '忙碌' : '离线';
            toast.info(`${data.username} 状态更新为：${statusText}`);
          }
        };

        // 监听新任务
        const handleNewTask = (task: Task) => {
          setTasks(prevTasks => [task, ...prevTasks]);
          
          // 新任务创建时，重新加载陪玩员详细信息
          try {
            loadPlayerDetails();
          } catch (error) {
            console.error('Failed to load player details after new task:', error);
          }
        };

        // 监听任务开始事件（用于启动进度更新）
        const handleTaskStarted = (task: Task) => {
          console.log('[前端] 任务开始事件:', task);
          setTasks(prevTasks => 
            prevTasks.map(t => t.id === task.id ? task : t)
          );
          // 立即更新陪玩员详细信息
          try {
            loadPlayerDetails();
          } catch (error) {
            console.error('Failed to load player details after task started:', error);
          }
        };

        // 监听任务完成事件
        const handleTaskCompleted = (task: Task) => {
          console.log('[前端] 任务完成事件:', task);
          setTasks(prevTasks => 
            prevTasks.map(t => t.id === task.id ? task : t)
          );
          // 更新陪玩员统计信息
          try {
            loadPlayerDetails();
          } catch (error) {
            console.error('Failed to load player details after task completed:', error);
          }
        };

        socket.on('task_status_changed', handleTaskStatusChange);
        socket.on('new_task', handleNewTask);
        socket.on('player_status_changed', handlePlayerStatusChange);
        socket.on('task_started', handleTaskStarted);
        socket.on('task_completed', handleTaskCompleted);

        // 监听任务超时事件
        const handleTaskOvertime = (task: Task) => {
          console.log('[前端] 任务超时事件:', task);
          setTasks(prevTasks => 
            prevTasks.map(t => t.id === task.id ? task : t)
          );
          loadPlayerDetails(); // 更新陪玩员统计信息
          toast.warning(`任务 "${task.customer_name}" 已超时`);
        };

        socket.on('task_overtime', handleTaskOvertime);

        return () => {
          socket.off('task_status_changed', handleTaskStatusChange);
          socket.off('new_task', handleNewTask);
          socket.off('player_status_changed', handlePlayerStatusChange);
          socket.off('task_started', handleTaskStarted);
          socket.off('task_completed', handleTaskCompleted);
          socket.off('task_overtime', handleTaskOvertime);
        };
      }
    }
  }, [user, socketManager]);

  const loadTasks = async () => {
    try {
      setIsLoadingTasks(true);
      const allTasks = await tasksApi.getAll();
      setTasks(allTasks);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      // 如果是网络错误，显示更友好的错误信息
      if (error.code === 'ECONNABORTED' || error.code === 'ECONNRESET' || !error.response) {
        toast.error('网络连接问题，请检查网络连接');
      } else {
        toast.error('加载任务失败');
      }
      // 设置空数组避免界面崩溃
      setTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const loadPlayers = async () => {
    try {
      setIsLoadingPlayers(true);
      const allPlayers = await usersApi.getPlayers();
      setPlayers(allPlayers);
    } catch (error: any) {
      console.error('Error loading players:', error);
      // 如果是网络错误，显示更友好的错误信息
      if (error.code === 'ECONNABORTED' || error.code === 'ECONNRESET' || !error.response) {
        toast.error('网络连接问题，请检查网络连接');
      } else {
        toast.error('加载陪玩员失败');
      }
      // 设置空数组避免界面崩溃
      setPlayers([]);
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  const loadPlayerDetails = async () => {
    try {
      setIsLoadingPlayerDetails(true);
      const details = await usersApi.getPlayerDetails();
      setPlayerDetails(details);
    } catch (error: any) {
      console.error('Error loading player details:', error);
      // 如果是网络错误，显示更友好的错误信息
      if (error.code === 'ECONNABORTED' || error.code === 'ECONNRESET' || !error.response) {
        toast.error('网络连接问题，请检查网络连接');
      } else {
        toast.error('加载陪玩员详情失败');
      }
      // 设置空数组避免界面崩溃
      setPlayerDetails([]);
    } finally {
      setIsLoadingPlayerDetails(false);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      const result = await tasksApi.complete(taskId);
      toast.success('任务已完成！');
      await loadTasks();
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast.error(error.response?.data?.message || '完成任务失败');
    }
  };

  const getStatusColor = (status: Task['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      queued: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-purple-100 text-purple-800',
      paused: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      overtime: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: Task['status']) => {
    const texts = {
      pending: '待接受',
      accepted: '已接受',
      queued: '排队中',
      in_progress: '进行中',
      paused: '已暂停',
      completed: '已完成',
      cancelled: '已取消',
      overtime: '已超时',
    };
    return texts[status] || status;
  };

  const getPlayerName = (playerId: number | null) => {
    if (!playerId) return '未指派';
    const player = players.find(p => p.id === playerId);
    return player?.username || `用户${playerId}`;
  };

  const getPlayerStatusColor = (status: string) => {
    switch (status) {
      case 'idle':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.game_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const idlePlayers = playerDetails.filter(player => player.status === 'idle');

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress' || t.status === 'paused').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || (user.role !== 'dispatcher' && user.role !== 'super_admin')) {
    return null;
  }

  return (
    <AppLayout title="派单员工作台">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
            <p className="text-gray-600">管理和分配游戏陪玩任务</p>
          </div>
          <div className="flex space-x-3">
            {/* Super Admin return button */}
            {user.role === 'super_admin' && (
              <Button
                variant="outline"
                onClick={() => router.push('/super-admin')}
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Shield className="w-4 h-4 mr-2" />
                返回管理控制台
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowExtensionRequests(!showExtensionRequests)}
              className={showExtensionRequests ? "bg-orange-50 text-orange-700 border-orange-200" : ""}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              {showExtensionRequests ? '隐藏' : '查看'}延长申请
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                loadTasks();
                loadPlayers();
                loadPlayerDetails();
              }}
              disabled={isLoadingTasks || isLoadingPlayers || isLoadingPlayerDetails}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(isLoadingTasks || isLoadingPlayers || isLoadingPlayerDetails) ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button 
              onClick={() => router.push('/dispatcher/create-task')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建任务
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总任务数</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待接受</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{taskStats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">进行中</CardTitle>
              <Clock className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{taskStats.in_progress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已完成</CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tasks List */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>任务列表</CardTitle>
                  <div className="flex space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="搜索客户名或游戏名..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">所有状态</option>
                      <option value="pending">待接受</option>
                      <option value="accepted">已接受</option>
                      <option value="queued">排队中</option>
                      <option value="in_progress">进行中</option>
                      <option value="paused">已暂停</option>
                      <option value="completed">已完成</option>
                      <option value="cancelled">已取消</option>
                      <option value="overtime">已超时</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTasks ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无任务数据
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>客户信息</TableHead>
                          <TableHead>游戏信息</TableHead>
                          <TableHead>时长/价格</TableHead>
                          <TableHead>指派陪玩员</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>创建时间</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{task.customer_name}</div>
                                <div className="text-sm text-gray-500">{task.customer_contact}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{task.game_name}</div>
                                <div className="text-sm text-gray-500">{task.game_mode}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{Math.floor(task.duration / 60) > 0 ? `${Math.floor(task.duration / 60)}小时` : ''}{task.duration % 60 > 0 ? `${task.duration % 60}分钟` : ''}</div>
                                <div className="text-sm text-green-600">¥{task.price}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{getPlayerName(task.player_id)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(task.status)}>
                                {getStatusText(task.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-500">
                                {new Date(task.created_at).toLocaleDateString('zh-CN')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingTask(task)}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  编辑
                                </Button>
                                {['accepted', 'in_progress', 'paused', 'overtime'].includes(task.status) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setExtendingTask(task)}
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                  >
                                    <Timer className="w-3 h-3 mr-1" />
                                    延长
                                  </Button>
                                )}
                                {['in_progress', 'paused', 'overtime'].includes(task.status) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCompleteTask(task.id)}
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    完成
                                  </Button>
                                )}
                                {task.status === 'queued' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingTask(task)}
                                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                  >
                                    <Users className="w-3 h-3 mr-1" />
                                    重新指派
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Players Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  陪玩员状态 ({playerDetails.length})
                </CardTitle>
                <CardDescription>
                  所有陪玩员的工作状态和任务进度
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPlayerDetails ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : playerDetails.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    暂无陪玩员数据
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 按状态分组显示陪玩员 */}
                    {['busy', 'idle', 'offline'].map((status) => {
                      const statusPlayers = playerDetails.filter(p => p.status === status);
                      if (statusPlayers.length === 0) return null;

                      const statusConfig = {
                        busy: { label: '忙碌中', color: 'bg-orange-50 border-orange-200', badgeColor: 'bg-orange-100 text-orange-800' },
                        idle: { label: '空闲', color: 'bg-green-50 border-green-200', badgeColor: 'bg-green-100 text-green-800' },
                        offline: { label: '离线', color: 'bg-gray-50 border-gray-200', badgeColor: 'bg-gray-100 text-gray-800' }
                      };

                      const config = statusConfig[status as keyof typeof statusConfig];

                      return (
                        <div key={status}>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            {config.label} ({statusPlayers.length})
                          </h4>
                          <div className="space-y-2">
                            {statusPlayers.map((player) => (
                              <div key={player.id} className={`p-3 rounded-lg border ${config.color}`}>
                                {/* 用户基本信息 */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <div className="font-medium text-sm">{player.username}</div>
                                    <Badge className={config.badgeColor} variant="secondary">
                                      {config.label}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {player.updated_at ? new Date(player.updated_at).toLocaleDateString('zh-CN') : ''}
                                  </div>
                                </div>

                                {/* 任务统计 */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">活跃任务:</span>
                                    <span className="font-medium">{player.active_tasks}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">总任务:</span>
                                    <span className="font-medium">{player.total_tasks}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">排队:</span>
                                    <span className="font-medium">{player.queued_tasks}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">完成:</span>
                                    <span className="font-medium">{player.completed_tasks}</span>
                                  </div>
                                </div>

                                {/* 当前任务进度 */}
                                {player.current_task_id && player.status === 'busy' && (
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <div className="text-xs text-gray-600 mb-1">
                                      {player.current_game_name} - {player.current_customer_name}
                                    </div>
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span>任务进度</span>
                                      <span>{player.current_task_progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div 
                                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                                        style={{ width: `${player.current_task_progress}%` }}
                                      ></div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      剩余时间: {player.current_task_time_remaining}分钟
                                    </div>
                                  </div>
                                )}

                                {/* 排队任务提示 */}
                                {player.queued_tasks > 0 && player.status === 'idle' && (
                                  <div className="mt-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                    📋 {player.queued_tasks}个任务在排队中
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 延长申请面板 */}
        {showExtensionRequests && (
          <ExtensionRequestsPanel 
            onRequestsUpdate={() => {
              loadTasks();
            }}
          />
        )}

        {/* 延长任务时长弹窗 */}
        {extendingTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <ExtendTaskDurationDialog
              task={extendingTask}
              onSuccess={(updatedTask) => {
                // 更新任务列表中的任务信息
                setTasks(prev => 
                  prev.map(task => 
                    task.id === updatedTask.id ? updatedTask : task
                  )
                );
                setExtendingTask(null);
              }}
              onClose={() => setExtendingTask(null)}
            />
          </div>
        )}

        {/* 编辑任务弹窗 */}
        {editingTask && (
          <EditTaskDialog
            task={editingTask}
            players={players}
            onSuccess={(updatedTask) => {
              // 更新任务列表中的任务信息
              setTasks(prev => 
                prev.map(task => 
                  task.id === updatedTask.id ? updatedTask : task
                )
              );
              setEditingTask(null);
            }}
            onClose={() => setEditingTask(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}