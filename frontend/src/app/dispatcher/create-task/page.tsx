'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, User as User, DollarSign, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { tasksApi, usersApi, gameDictionaryApi } from '@/lib/api';
import type { User as UserType, CreateTaskRequest, GameMode, GameDictionary } from '@/types/api';

export default function CreateTaskPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<UserType[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameDictionary, setGameDictionary] = useState<GameDictionary | null>(null);
  const [availableGameModes, setAvailableGameModes] = useState<GameMode[]>([]);
  const [isLoadingDictionary, setIsLoadingDictionary] = useState(true);
  
  const [formData, setFormData] = useState<CreateTaskRequest>({
    customer_name: '',
    customer_contact: '',
    game_name: '',
    game_mode: '',
    duration: 60,
    price: 0,
    requirements: '',
    player_id: undefined,
  });

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

  // Load players and game dictionary
  useEffect(() => {
    if (user && (user.role === 'dispatcher' || user.role === 'super_admin')) {
      loadPlayers();
      loadGameDictionary();
    }
  }, [user]);

  const loadPlayers = async () => {
    try {
      setIsLoadingPlayers(true);
      const allPlayers = await usersApi.getPlayers();
      setPlayers(allPlayers);
    } catch (error: unknown) {
      console.error('Error loading players:', error);
      toast.error('加载陪玩员列表失败');
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  const loadGameDictionary = async () => {
    try {
      setIsLoadingDictionary(true);
      const dictionary = await gameDictionaryApi.getActiveDictionary();
      setGameDictionary(dictionary);
      // Load all common modes initially
      setAvailableGameModes(dictionary.commonModes || []);
    } catch (error: unknown) {
      console.error('Error loading game dictionary:', error);
      toast.error('加载游戏字典失败');
    } finally {
      setIsLoadingDictionary(false);
    }
  };

  const handleInputChange = (field: keyof CreateTaskRequest, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGameNameChange = (gameName: string) => {
    handleInputChange('game_name', gameName);
    // Clear game mode when game name changes
    handleInputChange('game_mode', '');
    
    // Find the selected game and update available modes
    const selectedGame = gameDictionary?.gameNames.find(g => g.name === gameName);
    if (selectedGame && selectedGame.modes) {
      setAvailableGameModes(selectedGame.modes);
    } else {
      // If no specific modes for this game, show common modes
      setAvailableGameModes(gameDictionary?.commonModes || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.customer_name.trim()) {
      toast.error('请输入客户姓名');
      return;
    }
    if (!formData.customer_contact.trim()) {
      toast.error('请输入客户联系方式');
      return;
    }
    if (!formData.game_name.trim()) {
      toast.error('请输入游戏名称');
      return;
    }
    if (!formData.game_mode.trim()) {
      toast.error('请输入游戏模式');
      return;
    }
    if (formData.duration < 30) {
      toast.error('任务时长至少为30分钟');
      return;
    }
    if (formData.price <= 0) {
      toast.error('请输入有效的价格');
      return;
    }

    setIsSubmitting(true);
    try {
      const taskData: CreateTaskRequest = {
        ...formData,
        player_id: formData.player_id || undefined,
      };

      await tasksApi.create(taskData);
      toast.success('任务创建成功');
      router.push('/dispatcher');
    } catch (error: unknown) {
      console.error('Error creating task:', error);
      toast.error(error instanceof Error ? error.message : '创建任务失败');
    } finally {
      setIsSubmitting(false);
    }
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

  const getPlayerStatusText = (status: string) => {
    switch (status) {
      case 'idle':
        return '空闲';
      case 'busy':
        return '忙碌';
      default:
        return '未知';
    }
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
    <AppLayout title="创建任务">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dispatcher')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">创建新任务</h1>
            <p className="text-gray-600">填写任务信息并分配给合适的陪玩员</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>任务信息</CardTitle>
                <CardDescription>
                  请填写完整的任务信息，确保陪玩员能够了解客户需求
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Customer Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">客户信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer_name">客户姓名 *</Label>
                        <Input
                          id="customer_name"
                          value={formData.customer_name}
                          onChange={(e) => handleInputChange('customer_name', e.target.value)}
                          placeholder="请输入客户姓名"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer_contact">联系方式 *</Label>
                        <Input
                          id="customer_contact"
                          value={formData.customer_contact}
                          onChange={(e) => handleInputChange('customer_contact', e.target.value)}
                          placeholder="手机号/QQ/微信"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Game Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">游戏信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="game_name">游戏名称 *</Label>
                        {isLoadingDictionary ? (
                          <div className="h-10 border rounded-md flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        ) : (
                          <Select value={formData.game_name} onValueChange={handleGameNameChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="请选择游戏名称" />
                            </SelectTrigger>
                            <SelectContent>
                              {gameDictionary?.gameNames.map((game) => (
                                <SelectItem key={game.id} value={game.name}>
                                  {game.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="game_mode">游戏模式 *</Label>
                        {isLoadingDictionary ? (
                          <div className="h-10 border rounded-md flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        ) : (
                          <Select value={formData.game_mode} onValueChange={(value) => handleInputChange('game_mode', value)} disabled={!formData.game_name}>
                            <SelectTrigger>
                              <SelectValue placeholder={!formData.game_name ? "请先选择游戏名称" : "请选择游戏模式"} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableGameModes.map((mode) => (
                                <SelectItem key={mode.id} value={mode.name}>
                                  {mode.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">任务详情</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="duration">预计时长 (分钟) *</Label>
                        <Input
                          id="duration"
                          type="number"
                          min="30"
                          step="15"
                          value={formData.duration}
                          onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                          placeholder="60"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">任务价格 (元) *</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                          placeholder="120.00"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requirements">特殊要求</Label>
                      <textarea
                        id="requirements"
                        value={formData.requirements}
                        onChange={(e) => handleInputChange('requirements', e.target.value)}
                        placeholder="请描述具体要求，如技能水平、上分目标等..."
                        className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/dispatcher')}
                    >
                      取消
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSubmitting ? '创建中...' : '创建任务'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Player Selection Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  选择陪玩员
                </CardTitle>
                <CardDescription>
                  可选择直接分配给指定陪玩员，或留空让陪玩员自由接取。忙碌中的陪玩员任务将进入排队等待。
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPlayers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        !formData.player_id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleInputChange('player_id', undefined)}
                    >
                      <div className="font-medium text-sm">不指定陪玩员</div>
                      <div className="text-xs text-gray-500">让陪玩员自由接取任务</div>
                    </div>
                    
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.player_id === player.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleInputChange('player_id', player.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-sm">{player.username}</div>
                          <Badge className={getPlayerStatusColor(player.status)} variant="secondary">
                            {getPlayerStatusText(player.status)}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {player.status === 'busy' ? (
                            <div className="space-y-1">
                              <div>正在执行任务中，新任务将排队等待</div>
                              <div>{player.updated_at ? 
                                `最后活跃：${new Date(player.updated_at).toLocaleDateString('zh-CN')}` : 
                                '活跃状态未知'
                              }</div>
                            </div>
                          ) : (
                            <div>
                              {player.updated_at ? 
                                `最后活跃：${new Date(player.updated_at).toLocaleDateString('zh-CN')}` : 
                                '活跃状态未知'
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Task Preview */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>任务预览</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm">{formData.customer_name || '客户姓名'}</span>
                  </div>
                  <div className="font-medium">{formData.game_name || '游戏名称'}</div>
                  <div className="text-sm text-gray-600">{formData.game_mode || '游戏模式'}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1 text-gray-400" />
                      <span className="text-sm">{Math.floor(formData.duration / 60) > 0 ? `${Math.floor(formData.duration / 60)}小时` : ''}{formData.duration % 60 > 0 ? `${formData.duration % 60}分钟` : ''}</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                      <span className="text-sm font-semibold text-green-600">¥{formData.price}</span>
                    </div>
                  </div>
                  {formData.requirements && (
                    <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                      {formData.requirements}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}