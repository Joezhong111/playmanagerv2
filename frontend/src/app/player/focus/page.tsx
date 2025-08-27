'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Timer,
  User,
  Clock,
  DollarSign,
  Gamepad2,
  Pause,
  Play,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { tasksApi } from '@/lib/api';
import type { Task } from '@/types/api';

export default function FocusPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Load task data
  useEffect(() => {
    if (!taskId) {
      toast.error('任务ID不存在');
      router.push('/player');
      return;
    }

    const loadTask = async () => {
      try {
        setIsLoading(true);
        const allTasks = await tasksApi.getAll();
        const currentTask = allTasks.find(t => t.id === parseInt(taskId) && t.player_id === user?.id);
        
        if (!currentTask) {
          toast.error('未找到任务或无权访问');
          router.push('/player');
          return;
        }
        
        setTask(currentTask);
        
        // 从localStorage获取开始时间
        const savedStartTime = localStorage.getItem(`task_${taskId}_start_time`);
        if (savedStartTime && currentTask.status === 'in_progress') {
          const startTimeMs = parseInt(savedStartTime);
          setStartTime(startTimeMs);
          setTimeElapsed(Date.now() - startTimeMs);
        }
      } catch (error) {
        console.error('Error loading task:', error);
        toast.error('加载任务失败');
        router.push('/player');
      } finally {
        setIsLoading(false);
      }
    };

    loadTask();
  }, [taskId, user?.id, router]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (startTime && task?.status === 'in_progress') {
      interval = setInterval(() => {
        setTimeElapsed(Date.now() - startTime);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [startTime, task?.status]);

  const handlePauseTask = async () => {
    if (!task || isActionLoading) return;
    
    setIsActionLoading(true);
    try {
      await tasksApi.pause(task.id);
      setTask({ ...task, status: 'paused' });
      // 清除开始时间记录
      localStorage.removeItem(`task_${task.id}_start_time`);
      setStartTime(null);
      toast.success('任务已暂停');
    } catch (error: any) {
      console.error('Error pausing task:', error);
      toast.error(error.response?.data?.message || '暂停任务失败');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResumeTask = async () => {
    if (!task || isActionLoading) return;
    
    setIsActionLoading(true);
    try {
      await tasksApi.resume(task.id);
      const newStartTime = Date.now() - timeElapsed; // 考虑已过时间
      setTask({ ...task, status: 'in_progress' });
      setStartTime(newStartTime);
      localStorage.setItem(`task_${task.id}_start_time`, newStartTime.toString());
      toast.success('任务已恢复');
    } catch (error: any) {
      console.error('Error resuming task:', error);
      toast.error(error.response?.data?.message || '恢复任务失败');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!task || isActionLoading) return;
    
    setIsActionLoading(true);
    try {
      await tasksApi.complete(task.id);
      // 清除开始时间记录
      localStorage.removeItem(`task_${task.id}_start_time`);
      toast.success('任务完成！');
      router.push('/player');
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast.error(error.response?.data?.message || '完成任务失败');
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days}天${remainingHours}小时` : `${days}天`;
    }
    return `${hours}小时`;
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/player')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回工作台
          </Button>
          <Badge className={getStatusColor(task.status)} variant="secondary">
            {getStatusText(task.status)}
          </Badge>
        </div>

        {/* Main Focus Card */}
        <Card className="border-2 border-indigo-200 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl text-indigo-800 flex items-center justify-center">
              <Timer className="w-6 h-6 mr-2" />
              专注模式
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Timer Display */}
            <div className="text-center mb-8">
              <div className="text-6xl font-mono font-bold text-indigo-600 mb-4">
                {formatTime(timeElapsed)}
              </div>
              <p className="text-gray-600">
                {task.status === 'in_progress' ? '任务进行中...' : '任务已暂停'}
              </p>
            </div>

            {/* Task Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{task.game_name}</h3>
                  <p className="text-gray-600 flex items-center">
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    {task.game_mode}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <User className="w-3 h-3 mr-1" />
                      客户
                    </div>
                    <div className="font-semibold">{task.customer_name}</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <Clock className="w-3 h-3 mr-1" />
                      时长
                    </div>
                    <div className="font-semibold">{formatDuration(task.duration)}</div>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center text-sm text-green-600 mb-1">
                    <DollarSign className="w-3 h-3 mr-1" />
                    报酬
                  </div>
                  <div className="font-semibold text-green-700 text-lg">¥{task.price}</div>
                </div>
              </div>
              
              {task.requirements && (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 mb-2">特殊要求</h4>
                    <p className="text-sm text-yellow-700">{task.requirements}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              {task.status === 'in_progress' ? (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handlePauseTask}
                  disabled={isActionLoading}
                  className="px-8"
                >
                  {isActionLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                  ) : (
                    <Pause className="w-4 h-4 mr-2" />
                  )}
                  暂停任务
                </Button>
              ) : task.status === 'paused' ? (
                <Button
                  size="lg"
                  onClick={handleResumeTask}
                  disabled={isActionLoading}
                  className="px-8 bg-indigo-600 hover:bg-indigo-700"
                >
                  {isActionLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  继续任务
                </Button>
              ) : null}
              
              <Button
                size="lg"
                onClick={handleCompleteTask}
                disabled={task.status === 'paused' || isActionLoading}
                className="px-8 bg-green-600 hover:bg-green-700"
              >
                {isActionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                完成任务
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}