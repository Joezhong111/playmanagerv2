'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { tasksApi } from '@/lib/api';
import type { Task } from '@/types/api';

interface ExtendTaskDurationDialogProps {
  task: Task;
  onSuccess?: (updatedTask: Task) => void;
  onClose?: () => void;
}

export default function ExtendTaskDurationDialog({ 
  task, 
  onSuccess, 
  onClose 
}: ExtendTaskDurationDialogProps) {
  const [additionalMinutes, setAdditionalMinutes] = useState<number>(30);
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
    }
    return `${minutes}分钟`;
  };

  const handleExtend = async () => {
    if (additionalMinutes < 5 || additionalMinutes > 480) {
      toast.error('延长时间必须在5分钟到8小时之间');
      return;
    }

    setIsLoading(true);
    try {
      const updatedTask = await tasksApi.extendDuration(task.id, {
        additional_minutes: additionalMinutes,
        reason: reason || `派单员直接延长${additionalMinutes}分钟`
      });

      toast.success(`任务时长已延长${formatTime(additionalMinutes)}`);
      onSuccess?.(updatedTask);
      onClose?.();
    } catch (error: unknown) {
      console.error('Error extending task duration:', error);
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || '延长任务时长失败');
    } finally {
      setIsLoading(false);
    }
  };

  const quickAddOptions = [15, 30, 60, 120];

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-600" />
          延长任务时间
        </CardTitle>
        <CardDescription>
          直接为任务 &ldquo;{task.game_name}&rdquo; 延长时间
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 当前任务信息 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">当前时长:</span>
            <span className="font-medium">{formatTime(task.duration)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">延长后:</span>
            <span className="font-medium text-blue-600">
              {formatTime(task.duration + additionalMinutes)}
            </span>
          </div>
        </div>

        {/* 快速选择按钮 */}
        <div>
          <Label className="text-sm font-medium">快速选择延长时间</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {quickAddOptions.map((minutes) => (
              <Button
                key={minutes}
                variant={additionalMinutes === minutes ? "default" : "outline"}
                size="sm"
                onClick={() => setAdditionalMinutes(minutes)}
                className="text-xs"
              >
                +{formatTime(minutes)}
              </Button>
            ))}
          </div>
        </div>

        {/* 自定义时间输入 */}
        <div>
          <Label htmlFor="additional-minutes" className="text-sm font-medium">
            自定义延长时间 (分钟)
          </Label>
          <Input
            id="additional-minutes"
            type="number"
            min="5"
            max="480"
            value={additionalMinutes}
            onChange={(e) => setAdditionalMinutes(Number(e.target.value))}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            最少5分钟，最多8小时（480分钟）
          </p>
        </div>

        {/* 延长理由 */}
        <div>
          <Label htmlFor="reason" className="text-sm font-medium">
            延长理由 (可选)
          </Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例如：客户要求延长服务时间"
            className="mt-1"
            maxLength={100}
          />
        </div>

        {/* 警告提示 */}
        <div className="flex items-start p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">注意</p>
            <p className="mt-1">延长后的时间将立即生效，陪玩员的倒计时会相应调整。</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex space-x-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={handleExtend}
            disabled={isLoading || additionalMinutes < 5 || additionalMinutes > 480}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            确认延长
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}