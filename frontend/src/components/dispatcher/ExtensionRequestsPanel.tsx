'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Clock, 
  User,
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { extensionApi } from '@/lib/api';
import type { TimeExtensionRequest } from '@/types/api';

interface ExtensionRequestsPanelProps {
  onRequestsUpdate?: () => void;
}

export default function ExtensionRequestsPanel({ onRequestsUpdate }: ExtensionRequestsPanelProps) {
  const [requests, setRequests] = useState<TimeExtensionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await extensionApi.getExtensionRequests();
      setRequests(data);
    } catch (error: any) {
      console.error('Error loading extension requests:', error);
      toast.error('加载延长申请失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleReview = async (requestId: number, status: 'approved' | 'rejected', reason?: string) => {
    setReviewingId(requestId);
    try {
      await extensionApi.reviewExtensionRequest(requestId, {
        status,
        review_reason: reason
      });
      
      const statusText = status === 'approved' ? '通过' : '拒绝';
      toast.success(`已${statusText}延长申请`);
      
      // 重新加载列表
      await loadRequests();
      onRequestsUpdate?.();
    } catch (error: any) {
      console.error('Error reviewing extension request:', error);
      toast.error(error.response?.data?.message || '审核失败');
    } finally {
      setReviewingId(null);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
    }
    return `${minutes}分钟`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
    };
    return texts[status as keyof typeof texts] || status;
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const reviewedRequests = requests.filter(req => req.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* 待审核申请 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
                待审核的延长申请
                {pendingRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {pendingRequests.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                陪玩员申请的任务时间延长需要您的审核
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRequests}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无待审核的延长申请
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务信息</TableHead>
                  <TableHead>陪玩员</TableHead>
                  <TableHead>申请延长</TableHead>
                  <TableHead>申请理由</TableHead>
                  <TableHead>申请时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.task?.game_name}</p>
                        <p className="text-sm text-gray-500">{request.task?.customer_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {request.player_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-blue-600" />
                        <span className="font-medium text-blue-600">
                          +{formatTime(request.requested_minutes)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {request.reason && (
                          <div className="flex items-start">
                            <MessageSquare className="w-3 h-3 mr-1 mt-0.5 text-gray-400" />
                            <span className="text-sm text-gray-600 truncate">
                              {request.reason}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleReview(request.id, 'approved', '派单员审核通过')}
                          disabled={reviewingId === request.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {reviewingId === request.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          通过
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(request.id, 'rejected', '派单员拒绝延长')}
                          disabled={reviewingId === request.id}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="w-3 h-3" />
                          拒绝
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 审核历史 */}
      {reviewedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              审核历史
            </CardTitle>
            <CardDescription>
              最近审核的延长申请记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务信息</TableHead>
                  <TableHead>陪玩员</TableHead>
                  <TableHead>申请延长</TableHead>
                  <TableHead>审核结果</TableHead>
                  <TableHead>审核时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewedRequests.slice(0, 10).map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.task?.game_name}</p>
                        <p className="text-sm text-gray-500">{request.task?.customer_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {request.player_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-blue-600" />
                        <span className="text-blue-600">
                          +{formatTime(request.requested_minutes)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(request.status)} variant="secondary">
                        {getStatusText(request.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {request.reviewed_at ? 
                        new Date(request.reviewed_at).toLocaleString('zh-CN') : 
                        '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}