'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  DollarSign,
  Play,
  Pause,
  CheckCircle,
  RefreshCw,
  User,
  Gamepad2,
  Timer,
  Star,
  TrendingUp,
  History,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { tasksApi, usersApi, playerStatsApi } from '@/lib/api';
import type { Task } from '@/types/api';

export default function PlayerPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [queuedTasks, setQueuedTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isTaskActionLoading, setIsTaskActionLoading] = useState(false);
  
  // Statistics state
  const [stats, setStats] = useState<any>({
    overview: null,
    earnings: null
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Completed tasks history state
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [showCompletedHistory, setShowCompletedHistory] = useState(true);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(false);
  const [completedPagination, setCompletedPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Check authentication and role
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'player')) {
      toast.error('无权访问此页面');
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load data
  useEffect(() => {
    if (user?.role === 'player') {
      loadTasks();
      loadCompletedTasks(1, true);
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      setIsLoadingTasks(true);
      setIsLoadingStats(true);
      
      const [allTasks, queuedTasksData, dashboardStats] = await Promise.all([
        tasksApi.getAll(),
        tasksApi.getQueuedTasks(),
        playerStatsApi.getDashboardOverview()
      ]);
      
      // Filter tasks for player
      const available = allTasks.filter(task => 
        task.status === 'pending' && (!task.player_id || task.player_id === null)
      );
      
      // 包含所有与陪玩员相关的任务状态
      const mine = allTasks.filter(task => 
        task.player_id === user?.id && [
          'accepted', 'in_progress', 'paused', 'overtime', 'queued'
        ].includes(task.status)
      );
      
      // 当前任务包括进行中、暂停和超时的任务
      const current = mine.find(task => 
        ['in_progress', 'paused', 'overtime'].includes(task.status)
      ) || null;

      setAvailableTasks(available);
      setMyTasks(mine);
      setQueuedTasks(queuedTasksData);
      setCurrentTask(current);
      setStats({
        overview: dashboardStats,
        earnings: null
      });
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      toast.error('加载任务失败');
    } finally {
      setIsLoadingTasks(false);
      setIsLoadingStats(false);
    }
  };

  const loadCompletedTasks = async (page = 1, reset = false) => {
    try {
      setIsLoadingCompleted(true);
      
      const result = await playerStatsApi.getMyTasks({
        status: 'completed',
        page,
        limit: parseInt(completedPagination.limit) || 10
      });
      
      if (reset) {
        setCompletedTasks(result.tasks || []);
      } else {
        setCompletedTasks(prev => [...prev, ...(result.tasks || [])]);
      }
      
      setCompletedPagination(prev => ({
        ...prev,
        page,
        total: result.pagination?.total || 0,
        totalPages: result.pagination?.totalPages || 0
      }));
    } catch (error: any) {
      console.error('Error loading completed tasks:', error);
      toast.error('加载已完成任务失败');
    } finally {
      setIsLoadingCompleted(false);
    }
  };

  const toggleCompletedHistory = () => {
    const willShow = !showCompletedHistory;
    setShowCompletedHistory(willShow);
    
    if (willShow && completedTasks.length === 0) {
      loadCompletedTasks(1, true);
    }
  };

  const handleAcceptTask = async (taskId: number) => {
    if (isTaskActionLoading) return;
    
    setIsTaskActionLoading(true);
    try {
      await tasksApi.accept(taskId);
      toast.success('任务接受成功');
      await loadTasks();
    } catch (error: any) {
      console.error('Error accepting task:', error);
      toast.error(error.response?.data?.message || '接受任务失败');
    } finally {
      setIsTaskActionLoading(false);
    }
  };

  const handleStartTask = async (taskId: number) => {
    if (isTaskActionLoading) return;
    
    setIsTaskActionLoading(true);
    try {
      await tasksApi.start(taskId);
      // 保存任务开始时间到localStorage
      const startTime = Date.now();
      localStorage.setItem(`task_${taskId}_start_time`, startTime.toString());
      toast.success('任务已开始');
      // 跳转到专注页面
      router.push(`/player/focus?taskId=${taskId}`);
    } catch (error: any) {
      console.error('Error starting task:', error);
      toast.error(error.response?.data?.message || '开始任务失败');
    } finally {
      setIsTaskActionLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    if (isTaskActionLoading) return;
    
    setIsTaskActionLoading(true);
    try {
      const result = await tasksApi.complete(taskId);
      
      // 检查是否有下一个任务被激活
      if (result.nextTask) {
        toast.success(`任务完成！下一个任务"${result.nextTask.game_name}"已准备就绪`);
      } else {
        toast.success('任务完成！');
      }
      
      await loadTasks();
      
      // 如果历史记录是展开状态，也刷新已完成任务列表
      if (showCompletedHistory) {
        await loadCompletedTasks(1, true);
      }
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast.error(error.response?.data?.message || '完成任务失败');
    } finally {
      setIsTaskActionLoading(false);
    }
  };

  const handlePauseTask = async (taskId: number) => {
    if (isTaskActionLoading) return;
    
    setIsTaskActionLoading(true);
    try {
      // 先更新本地状态以提供即时反馈
      if (currentTask && currentTask.id === taskId) {
        setCurrentTask({ ...currentTask, status: 'paused' });
      }
      
      await tasksApi.pause(taskId);
      toast.success('任务已暂停');
      await loadTasks();
    } catch (error: any) {
      console.error('Error pausing task:', error);
      toast.error(error.response?.data?.message || '暂停任务失败');
      // 如果失败，恢复原状态
      await loadTasks();
    } finally {
      setIsTaskActionLoading(false);
    }
  };

  const handleResumeTask = async (taskId: number) => {
    if (isTaskActionLoading) return;
    
    setIsTaskActionLoading(true);
    try {
      // 先更新本地状态以提供即时反馈
      if (currentTask && currentTask.id === taskId) {
        setCurrentTask({ ...currentTask, status: 'in_progress' });
      }
      
      await tasksApi.resume(taskId);
      toast.success('任务已恢复');
      await loadTasks();
    } catch (error: any) {
      console.error('Error resuming task:', error);
      toast.error(error.response?.data?.message || '恢复任务失败');
      // 如果失败，恢复原状态
      await loadTasks();
    } finally {
      setIsTaskActionLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!user) return;
    
    // offline状态不能直接切换，需要先变为idle
    if (user.status === 'offline') {
      const newStatus = 'idle';
      setIsUpdatingStatus(true);
      
      try {
        await usersApi.updateStatus({ status: newStatus });
        await refreshUser();
        toast.success(`状态已更新为空闲`);
      } catch (error: any) {
        console.error('Error updating status:', error);
        toast.error('更新状态失败');
      } finally {
        setIsUpdatingStatus(false);
      }
      return;
    }
    
    const newStatus = user.status === 'idle' ? 'busy' : 'idle';
    setIsUpdatingStatus(true);
    
    try {
      await usersApi.updateStatus({ status: newStatus });
      await refreshUser();
      toast.success(`状态已更新为${newStatus === 'idle' ? '空闲' : '忙碌'}`);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('更新状态失败');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: Task['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      queued: 'bg-orange-100 text-orange-800',
      in_progress: 'bg-purple-100 text-purple-800',
      paused: 'bg-gray-100 text-gray-800',
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

  const calculateEarnings = (tasks: Task[]) => {
    return tasks
      .filter(task => task.status === 'completed')
      .reduce((sum, task) => sum + task.price, 0);
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      const remainingMinutes = minutes % 1440;
      const hours = Math.floor(remainingMinutes / 60);
      const mins = remainingMinutes % 60;
      if (hours > 0 && mins > 0) {
        return `${days}天${hours}小时${mins}分钟`;
      } else if (hours > 0) {
        return `${days}天${hours}小时`;
      } else if (mins > 0) {
        return `${days}天${mins}分钟`;
      } else {
        return `${days}天`;
      }
    }
    
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
    }
    
    return `${minutes}分钟`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'player') {
    return null;
  }

  const completedTasksCount = stats.overview?.taskStats?.completedTasks || 0;
  const totalEarnings = stats.overview?.taskStats?.totalEarnings || 0;
  const todayEarnings = stats.overview?.todayStats?.todayEarnings || 0;
  const availableTasksCount = stats.overview?.availableTasks || availableTasks.length;

  return (
    <AppLayout title="陪玩员工作台">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的工作台</h1>
            <p className="text-gray-600">管理您的陪玩任务和状态</p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={loadTasks}
              disabled={isLoadingTasks}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingTasks ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button
              variant={user.status === 'idle' ? 'default' : 'secondary'}
              onClick={toggleStatus}
              disabled={isUpdatingStatus}
              className={user.status === 'idle' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : user.status === 'busy' 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }
            >
              {isUpdatingStatus ? '更新中...' : (
                user.status === 'idle' ? '空闲中' : 
                user.status === 'busy' ? '忙碌中' : '离线'
              )}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">我的任务</CardTitle>
              <Gamepad2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myTasks.length}</div>
              <p className="text-xs text-muted-foreground">当前活跃任务</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已完成</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedTasksCount}</div>
              <p className="text-xs text-muted-foreground">历史完成任务</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">可接任务</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{availableTasksCount}</div>
              <p className="text-xs text-muted-foreground">待接受任务</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总收入</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">¥{totalEarnings}</div>
              <p className="text-xs text-muted-foreground">今日 ¥{todayEarnings}</p>
            </CardContent>
          </Card>
        </div>

        {/* Current Task */}
        {currentTask && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-800">
                <Timer className="w-5 h-5 mr-2" />
                当前任务
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{currentTask.game_name}</h3>
                    <p className="text-gray-600">{currentTask.game_mode}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1 text-gray-400" />
                      <span className="text-sm">{currentTask.customer_name}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1 text-gray-400" />
                      <span className="text-sm">{formatDuration(currentTask.duration)}</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                      <span className="text-sm">¥{currentTask.price}</span>
                    </div>
                  </div>
                  {currentTask.requirements && (
                    <div className="p-3 bg-white rounded border">
                      <p className="text-sm"><strong>特殊要求：</strong>{currentTask.requirements}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center space-y-3">
                  <div className="text-center">
                    <Badge className={getStatusColor(currentTask.status)} variant="secondary">
                      {getStatusText(currentTask.status)}
                    </Badge>
                  </div>
                  <div className="flex justify-center space-x-2">
                    {/* 进入专注页面按钮 - 在任务进行中、暂停或超时时显示 */}
                    {['in_progress', 'paused', 'overtime'].includes(currentTask.status) && (
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/player/focus?taskId=${currentTask.id}`)}
                        className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                      >
                        <Timer className="w-4 h-4 mr-1" />
                        专注模式
                      </Button>
                    )}
                    
                    {currentTask.status === 'in_progress' ? (
                      <Button
                        variant="outline"
                        onClick={() => handlePauseTask(currentTask.id)}
                        disabled={isTaskActionLoading}
                      >
                        {isTaskActionLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-1"></div>
                        ) : (
                          <Pause className="w-4 h-4 mr-1" />
                        )}
                        {isTaskActionLoading ? '暂停中...' : '暂停'}
                      </Button>
                    ) : currentTask.status === 'paused' ? (
                      <Button
                        variant="outline"
                        onClick={() => handleResumeTask(currentTask.id)}
                        className="border-green-500 text-green-600 hover:bg-green-50"
                        disabled={isTaskActionLoading}
                      >
                        {isTaskActionLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400 mr-1"></div>
                        ) : (
                          <Play className="w-4 h-4 mr-1" />
                        )}
                        {isTaskActionLoading ? '恢复中...' : '继续'}
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => handleCompleteTask(currentTask.id)}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={currentTask.status === 'paused' || isTaskActionLoading}
                    >
                      {isTaskActionLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      {isTaskActionLoading ? '完成中...' : '完成任务'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Queued Tasks - 只在有排队任务时显示 */}
        {queuedTasks.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-800">
                <Clock className="w-5 h-5 mr-2" />
                排队等待的任务 ({queuedTasks.length})
              </CardTitle>
              <CardDescription>
                这些任务正在等待您完成当前任务后开始
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {queuedTasks.map((task, index) => (
                  <div key={task.id} className="p-3 bg-white border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{task.game_name}</div>
                          <div className="text-xs text-gray-600">{task.game_mode}</div>
                        </div>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800">
                        排队中
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {task.customer_name}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDuration(task.duration)}
                        </span>
                      </div>
                      <span className="font-semibold text-green-600">¥{task.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>可接任务 ({availableTasks.length})</CardTitle>
              <CardDescription>点击接受您感兴趣的任务</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : availableTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无可接任务
                </div>
              ) : (
                <div className="space-y-4">
                  {availableTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{task.game_name}</h4>
                          <p className="text-sm text-gray-600">{task.game_mode}</p>
                        </div>
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusText(task.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {task.customer_name}
                          </span>
                          <span className="text-sm flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDuration(task.duration)}
                          </span>
                        </div>
                        <span className="font-semibold text-green-600">¥{task.price}</span>
                      </div>
                      {task.requirements && (
                        <p className="text-xs text-gray-500 mb-3">{task.requirements}</p>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleAcceptTask(task.id)}
                        className="w-full"
                        disabled={user.status === 'busy' || currentTask !== null || isTaskActionLoading}
                      >
                        {isTaskActionLoading ? '处理中...' : '接受任务'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>我的任务 ({myTasks.length})</CardTitle>
              <CardDescription>您已接受的任务列表</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : myTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无任务
                </div>
              ) : (
                <div className="space-y-4">
                  {myTasks.map((task) => (
                    <div key={task.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{task.game_name}</h4>
                          <p className="text-sm text-gray-600">{task.game_mode}</p>
                        </div>
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusText(task.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {task.customer_name}
                          </span>
                          <span className="text-sm flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDuration(task.duration)}
                          </span>
                        </div>
                        <span className="font-semibold text-green-600">¥{task.price}</span>
                      </div>
                      {task.status === 'accepted' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartTask(task.id)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          disabled={isTaskActionLoading}
                        >
                          {isTaskActionLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                          ) : (
                            <Play className="w-4 h-4 mr-1" />
                          )}
                          {isTaskActionLoading ? '开始中...' : '开始任务'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed Tasks History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <History className="w-5 h-5 mr-2" />
                    已完成任务历史记录
                  </CardTitle>
                  <CardDescription>
                    查看您已完成的任务历史 {completedPagination.total > 0 && `(${completedPagination.total}个任务)`}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={toggleCompletedHistory}
                  className="flex items-center space-x-2"
                >
                  {showCompletedHistory ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span>隐藏历史</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span>查看历史</span>
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            {showCompletedHistory && (
              <CardContent>
                {isLoadingCompleted && completedTasks.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : completedTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无已完成任务</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-green-800">已完成任务</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600 mt-1">
                          {completedPagination.total}
                        </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">总收入</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600 mt-1">
                          ¥{totalEarnings}
                        </div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-5 h-5 text-purple-600" />
                          <span className="text-sm font-medium text-purple-800">平均单价</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-600 mt-1">
                          ¥{completedTasksCount > 0 ? Math.round(totalEarnings / completedTasksCount) : 0}
                        </div>
                      </div>
                    </div>

                    {/* Task List */}
                    <div className="space-y-3">
                      {completedTasks.map((task) => (
                        <div key={task.id} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-green-800">{task.game_name}</h4>
                              <p className="text-sm text-green-600">{task.game_mode}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-green-100 text-green-800">
                                已完成
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {formatDate(task.completed_at)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm flex items-center text-green-700">
                                <User className="w-3 h-3 mr-1" />
                                {task.customer_name}
                              </span>
                              <span className="text-sm flex items-center text-green-700">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatDuration(task.duration)}
                              </span>
                            </div>
                            <span className="font-semibold text-green-600">¥{task.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Load More */}
                    {completedPagination.page < completedPagination.totalPages && (
                      <div className="text-center pt-4">
                        <Button
                          variant="outline"
                          onClick={() => loadCompletedTasks(completedPagination.page + 1)}
                          disabled={isLoadingCompleted}
                        >
                          {isLoadingCompleted ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                              加载中...
                            </>
                          ) : (
                            '加载更多'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}