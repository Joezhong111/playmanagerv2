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
  CheckCircle,
  Plus,
  Bell,
  BellOff,
  Volume2,
  VolumeX
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
  const [isOvertime, setIsOvertime] = useState(false);
  
  // 声音提醒相关状态
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsSent, setNotificationsSent] = useState<{[key: number]: boolean}>({});
  const [showExtensionButtons, setShowExtensionButtons] = useState(false);
  const [isExtensionRequesting, setIsExtensionRequesting] = useState(false);

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

  // 播放提醒音效
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio('/notification-sound.wav');
      audio.volume = 0.7;
      audio.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
        // 如果MP3加载失败，使用Web Audio API生成简单提示音
        generateBeepSound();
      });
    } catch (error) {
      console.warn('Error creating audio element:', error);
      generateBeepSound();
    }
  };

  // 备用的蜂鸣音生成器
  const generateBeepSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
    } catch (error) {
      console.warn('Failed to generate beep sound:', error);
    }
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (startTime && task?.status === 'in_progress') {
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setTimeElapsed(elapsed);
        
        // 检查是否超时（任务时长以分钟为单位）
        const taskDurationMs = (task?.duration || 0) * 60 * 1000;
        const remainingMs = taskDurationMs - elapsed;
        const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
        
        // 声音提醒逻辑：剩余15分0秒和5分0秒时提醒（精确到秒）
        if (remainingMs > 0) {
          const remainingSeconds = Math.floor(remainingMs / 1000);
          const exactMinutes = Math.floor(remainingSeconds / 60);
          const exactSeconds = remainingSeconds % 60;
          
          // 15分0秒提醒（±2秒容差）
          if (exactMinutes === 15 && exactSeconds <= 2 && !notificationsSent[15]) {
            playNotificationSound();
            toast.info('⏰ 剩余15分钟，可询问客户是否需要加钟', { duration: 5000 });
            setShowExtensionButtons(true);
            setNotificationsSent(prev => ({ ...prev, 15: true }));
          }
          // 5分0秒提醒（±2秒容差）
          else if (exactMinutes === 5 && exactSeconds <= 2 && !notificationsSent[5]) {
            playNotificationSound();
            toast.info('⏰ 剩余5分钟，请询问客户是否需要加钟', { duration: 5000 });
            setShowExtensionButtons(true);
            setNotificationsSent(prev => ({ ...prev, 5: true }));
          }
        }
        
        setIsOvertime(elapsed >= taskDurationMs);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [startTime, task?.status, task?.duration]);

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

  const handleExtensionRequest = async (minutes: number) => {
    if (!task || isExtensionRequesting) return;
    
    setIsExtensionRequesting(true);
    try {
      console.log('发送延长申请:', {
        task_id: task.id,
        requested_minutes: minutes,
        reason: `陪玩员申请延长${minutes}分钟`
      });

      const result = await tasksApi.requestExtension({
        task_id: task.id,
        requested_minutes: minutes,
        reason: `陪玩员申请延长${minutes}分钟`
      });

      console.log('延长申请成功:', result);
      toast.success(`已申请延长${minutes}分钟，等待派单员审核`);
      setShowExtensionButtons(false);
    } catch (error: any) {
      console.error('延长申请失败 - 详细错误:', {
        error,
        response: error.response,
        request: error.request,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      let errorMessage = '申请延长失败';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 500) {
        errorMessage = '服务器内部错误，请检查后端日志';
      } else if (error.response?.status === 404) {
        errorMessage = 'API接口未找到，请检查后端服务';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsExtensionRequesting(false);
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(Math.abs(milliseconds) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getDisplayTime = () => {
    if (!task || !startTime) return '00:00:00';
    
    const taskDurationMs = task.duration * 60 * 1000; // 任务时长毫秒
    
    if (isOvertime) {
      // 超时后显示正计时（超时时间）
      return formatTime(timeElapsed - taskDurationMs);
    } else {
      // 未超时显示倒计时（剩余时间）
      return formatTime(taskDurationMs - timeElapsed);
    }
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
          
          <div className="flex items-center space-x-2">
            {/* 声音设置按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            
            <Badge className={getStatusColor(task.status)} variant="secondary">
              {getStatusText(task.status)}
            </Badge>
          </div>
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
              <div className={`text-6xl font-mono font-bold mb-4 ${isOvertime ? 'text-red-600' : 'text-indigo-600'}`}>
                {getDisplayTime()}
              </div>
              <div className="flex items-center justify-center space-x-2">
                <p className="text-gray-600">
                  {task.status === 'in_progress' 
                    ? (isOvertime ? '任务超时中...' : '任务进行中...') 
                    : '任务已暂停'
                  }
                </p>
                {isOvertime && task.status === 'in_progress' && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                    已超时
                  </span>
                )}
              </div>
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

            {/* 手动申请加钟按钮 */}
            {!showExtensionButtons && task.status === 'in_progress' && (
              <div className="mb-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowExtensionButtons(true)}
                  className="text-amber-600 border-amber-300 hover:bg-amber-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  申请延长时间
                </Button>
              </div>
            )}

            {/* 加钟申请按钮组 */}
            {showExtensionButtons && task.status === 'in_progress' && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-center mb-3">
                  <h4 className="font-semibold text-amber-800 mb-2 flex items-center justify-center">
                    <Plus className="w-4 h-4 mr-2" />
                    申请延长时间
                  </h4>
                  <p className="text-sm text-amber-700">可点击快速申请延长，需派单员审核</p>
                </div>
                <div className="flex justify-center space-x-3">
                  <Button
                    size="sm"
                    onClick={() => handleExtensionRequest(15)}
                    disabled={isExtensionRequesting}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    +15分钟
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleExtensionRequest(30)}
                    disabled={isExtensionRequesting}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    +30分钟
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleExtensionRequest(60)}
                    disabled={isExtensionRequesting}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    +1小时
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowExtensionButtons(false)}
                    disabled={isExtensionRequesting}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}

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