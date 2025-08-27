'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Users, 
  Clock, 
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Timer,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { tasksApi, usersApi } from '@/lib/api';
import type { Task, User } from '@/types/api';
import ExtensionRequestsPanel from '@/components/dispatcher/ExtensionRequestsPanel';
import ExtendTaskDurationDialog from '@/components/dispatcher/ExtendTaskDurationDialog';

export default function DispatcherPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [players, setPlayers] = useState<User[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showExtensionRequests, setShowExtensionRequests] = useState(false);
  const [extendingTask, setExtendingTask] = useState<Task | null>(null);

  // Check authentication and role
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'dispatcher')) {
      toast.error('无权访问此页面');
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load data
  useEffect(() => {
    if (user?.role === 'dispatcher') {
      loadTasks();
      loadPlayers();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      setIsLoadingTasks(true);
      const allTasks = await tasksApi.getAll();
      setTasks(allTasks);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      toast.error('加载任务失败');
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
      toast.error('加载陪玩员失败');
    } finally {
      setIsLoadingPlayers(false);
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

  const idlePlayers = players.filter(player => player.status === 'idle');

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

  if (!user || user.role !== 'dispatcher') {
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
              }}
              disabled={isLoadingTasks || isLoadingPlayers}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(isLoadingTasks || isLoadingPlayers) ? 'animate-spin' : ''}`} />
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
                      <option value="in_progress">进行中</option>
                      <option value="paused">已暂停</option>
                      <option value="completed">已完成</option>
                      <option value="cancelled">已取消</option>
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
                                  onClick={() => router.push(`/dispatcher/task/${task.id}`)}
                                >
                                  详情
                                </Button>
                                {['accepted', 'in_progress', 'paused'].includes(task.status) && (
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
                  空闲陪玩员 ({idlePlayers.length})
                </CardTitle>
                <CardDescription>
                  当前可接任务的陪玩员
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPlayers ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : idlePlayers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    暂无空闲陪玩员
                  </div>
                ) : (
                  <div className="space-y-3">
                    {idlePlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
                        <div>
                          <div className="font-medium text-sm">{player.username}</div>
                          <Badge className={getPlayerStatusColor(player.status)} variant="secondary">
                            空闲
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {player.updated_at ? new Date(player.updated_at).toLocaleDateString('zh-CN') : ''}
                        </div>
                      </div>
                    ))}
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
      </div>
    </AppLayout>
  );
}