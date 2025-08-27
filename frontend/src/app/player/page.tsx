'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { tasksApi, usersApi } from '@/lib/api';
import type { Task } from '@/types/api';

export default function PlayerPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isTaskActionLoading, setIsTaskActionLoading] = useState(false);

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
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      setIsLoadingTasks(true);
      const allTasks = await tasksApi.getAll();
      
      // Filter tasks for player
      const available = allTasks.filter(task => 
        task.status === 'pending' && (!task.player_id || task.player_id === null)
      );
      const mine = allTasks.filter(task => 
        task.player_id === user?.id && task.status !== 'completed' && task.status !== 'cancelled'
      );
      const current = mine.find(task => task.status === 'in_progress' || task.status === 'paused') || null;

      setAvailableTasks(available);
      setMyTasks(mine);
      setCurrentTask(current);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      toast.error('加载任务失败');
    } finally {
      setIsLoadingTasks(false);
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
      await tasksApi.complete(taskId);
      toast.success('任务完成！');
      await loadTasks();
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
      in_progress: 'bg-purple-100 text-purple-800',
      paused: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: Task['status']) => {
    const texts = {
      pending: '待接受',
      accepted: '已接受',
      in_progress: '进行中',
      paused: '已暂停',
      completed: '已完成',
      cancelled: '已取消',
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

  const completedTasksCount = myTasks.filter(task => task.status === 'completed').length;

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
                : 'bg-orange-600 hover:bg-orange-700 text-white'
              }
            >
              {isUpdatingStatus ? '更新中...' : (user.status === 'idle' ? '空闲中' : '忙碌中')}
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已完成</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedTasksCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">可接任务</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{availableTasks.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总收入</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">¥{calculateEarnings(myTasks)}</div>
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
                    {/* 进入专注页面按钮 - 只在任务进行中或暂停时显示 */}
                    {(currentTask.status === 'in_progress' || currentTask.status === 'paused') && (
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
        </div>
      </div>
    </AppLayout>
  );
}