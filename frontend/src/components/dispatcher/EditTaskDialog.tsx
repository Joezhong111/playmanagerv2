'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Edit,
  User as UserIcon,
  CheckCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { tasksApi } from '@/lib/api';
import type { Task } from '@/types/api';

interface EditTaskDialogProps {
  task: Task;
  players: Array<{
    id: number;
    username: string;
    status: 'idle' | 'busy' | 'offline';
  }>;
  onSuccess?: (updatedTask: Task) => void;
  onClose?: () => void;
}

export default function EditTaskDialog({ 
  task, 
  players, 
  onSuccess, 
  onClose 
}: EditTaskDialogProps) {
  const [formData, setFormData] = useState({
    customer_name: task.customer_name,
    customer_contact: task.customer_contact,
    game_name: task.game_name,
    game_mode: task.game_mode,
    duration: task.duration,
    price: task.price,
    requirements: task.requirements || '',
    player_id: task.player_id,
    status: task.status
  });

  const [selectedPlayerForReassign, setSelectedPlayerForReassign] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'reassign'>('edit');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
    }
    return `${minutes}分钟`;
  };

  const getStatusText = (status: Task['status']) => {
    const texts: Record<Task['status'], string> = {
      pending: '待接受',
      accepted: '已接受',
      queued: '排队中',
      in_progress: '进行中',
      paused: '已暂停',
      completed: '已完成',
      cancelled: '已取消',
      overtime: '已超时'
    };
    return texts[status] || status;
  };

  const getStatusColor = (status: Task['status']) => {
    const colors: Record<Task['status'], string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      queued: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-purple-100 text-purple-800',
      paused: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      overtime: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateTask = async () => {
    // 验证表单
    if (!formData.customer_name.trim()) {
      toast.error('客户姓名不能为空');
      return;
    }
    if (!formData.customer_contact.trim()) {
      toast.error('客户联系方式不能为空');
      return;
    }
    if (!formData.game_name.trim()) {
      toast.error('游戏名称不能为空');
      return;
    }
    if (!formData.game_mode.trim()) {
      toast.error('游戏模式不能为空');
      return;
    }
    if (formData.duration < 1 || formData.duration > 1440) {
      toast.error('时长必须在1-1440分钟之间');
      return;
    }
    if (formData.price < 0) {
      toast.error('价格不能为负数');
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        customer_name: formData.customer_name.trim(),
        customer_contact: formData.customer_contact.trim(),
        game_name: formData.game_name.trim(),
        game_mode: formData.game_mode.trim(),
        duration: formData.duration,
        price: formData.price,
        requirements: formData.requirements.trim() || undefined,
        player_id: formData.player_id || undefined
      };

      const updatedTask = await tasksApi.update(task.id, updateData);
      toast.success('任务更新成功');
      onSuccess?.(updatedTask);
      onClose?.();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error((error as Error & { response?: { data?: { message?: string } } }).response?.data?.message || '更新任务失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReassignTask = async () => {
    if (!selectedPlayerForReassign) {
      toast.error('请选择要指派的陪玩员');
      return;
    }

    setIsLoading(true);
    try {
      const updatedTask = await tasksApi.reassignTask(task.id, {
        player_id: selectedPlayerForReassign
      });
      toast.success('任务重新指派成功');
      onSuccess?.(updatedTask);
      onClose?.();
    } catch (error) {
      console.error('Error reassigning task:', error);
      toast.error((error as Error & { response?: { data?: { message?: string } } }).response?.data?.message || '重新指派任务失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTask = async () => {
    setIsLoading(true);
    try {
      const updatedTask = await tasksApi.cancel(task.id);
      toast.success('任务已取消');
      onSuccess?.(updatedTask);
      onClose?.();
    } catch (error) {
      console.error('Error cancelling task:', error);
      toast.error((error as Error & { response?: { data?: { message?: string } } }).response?.data?.message || '取消任务失败');
    } finally {
      setIsLoading(false);
    }
  };

  const idlePlayers = players.filter(player => player.status === 'idle');

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="w-5 h-5 mr-2 text-blue-600" />
            编辑任务 - {task.game_name}
          </DialogTitle>
          <DialogDescription>
            修改任务信息、重新指派陪玩员或取消任务
          </DialogDescription>
        </DialogHeader>

        {/* 标签页切换 */}
        <div className="flex space-x-1 border-b">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'edit'
                ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            编辑任务
          </button>
          {task.status === 'queued' && (
            <button
              onClick={() => setActiveTab('reassign')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'reassign'
                  ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              重新指派
            </button>
          )}
        </div>

        {activeTab === 'edit' && (
          <div className="space-y-6">
            {/* 当前任务状态 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">当前状态</span>
                <Badge className={getStatusColor(task.status)}>
                  {getStatusText(task.status)}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">当前陪玩员</span>
                <span className="font-medium">
                  {task.player_id ? players.find(p => p.id === task.player_id)?.username || `用户${task.player_id}` : '未指派'}
                </span>
              </div>
            </div>

            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">客户姓名 *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="customer_contact">客户联系方式 *</Label>
                <Input
                  id="customer_contact"
                  value={formData.customer_contact}
                  onChange={(e) => handleInputChange('customer_contact', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* 游戏信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="game_name">游戏名称 *</Label>
                <Input
                  id="game_name"
                  value={formData.game_name}
                  onChange={(e) => handleInputChange('game_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="game_mode">游戏模式 *</Label>
                <Input
                  id="game_mode"
                  value={formData.game_mode}
                  onChange={(e) => handleInputChange('game_mode', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* 时长和价格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">时长 (分钟) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="1440"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  当前: {formatTime(formData.duration)}
                </p>
              </div>
              <div>
                <Label htmlFor="price">价格 (元) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* 任务要求 */}
            <div>
              <Label htmlFor="requirements">任务要求 (可选)</Label>
              <textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => handleInputChange('requirements', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                maxLength={1000}
                placeholder="输入任务的具体要求..."
              />
              <p className="text-xs text-gray-500 mt-1">
                最多1000个字符
              </p>
            </div>
          </div>
        )}

        {activeTab === 'reassign' && (
          <div className="space-y-6">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-start">
                <RotateCcw className="w-5 h-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-purple-900">重新指派任务</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    将此排队中的任务重新指派给其他空闲陪玩员
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">选择新陪玩员</Label>
              <div className="mt-2 space-y-2">
                {idlePlayers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    暂无空闲陪玩员可供指派
                  </div>
                ) : (
                  idlePlayers.map(player => (
                    <div
                      key={player.id}
                      onClick={() => setSelectedPlayerForReassign(player.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPlayerForReassign === player.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{player.username}</div>
                          <div className="text-sm text-gray-500">用户ID: {player.id}</div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          空闲
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedPlayerForReassign && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <UserIcon className="w-4 h-4 text-blue-600 mr-2" />
                  <span className="text-sm text-blue-800">
                    将任务指派给: {idlePlayers.find(p => p.id === selectedPlayerForReassign)?.username}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex space-x-2">
          {activeTab === 'edit' && (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                取消
              </Button>
              
              {task.status !== 'completed' && task.status !== 'cancelled' && (
                <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={isLoading}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      取消任务
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认取消任务</AlertDialogTitle>
                      <AlertDialogDescription>
                        此操作将取消任务 &ldquo;{task.game_name}&rdquo;，且不可恢复。确定要继续吗？
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelTask}>
                        确认取消
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <Button
                onClick={handleUpdateTask}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                保存修改
              </Button>
            </>
          )}

          {activeTab === 'reassign' && (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button
                onClick={handleReassignTask}
                disabled={isLoading || !selectedPlayerForReassign || idlePlayers.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                重新指派
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}