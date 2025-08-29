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
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Search,
  Settings,
  Database,
  Tag,
  ToggleLeft,
  ToggleRight,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { gameDictionaryApi } from '@/lib/api';
import type { GameName, GameMode, CreateGameNameRequest, CreateGameModeRequest } from '@/types/api';

export default function DictionaryManagementPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [gameNames, setGameNames] = useState<GameName[]>([]);
  const [gameModes, setGameModes] = useState<GameMode[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'names' | 'modes'>('names');

  // State for editing
  const [editingGameName, setEditingGameName] = useState<GameName | null>(null);
  const [editingGameMode, setEditingGameMode] = useState<GameMode | null>(null);
  const [isCreatingGameName, setIsCreatingGameName] = useState(false);
  const [isCreatingGameMode, setIsCreatingGameMode] = useState(false);
  
  // Form data
  const [gameNameForm, setGameNameForm] = useState<CreateGameNameRequest>({
    name: '',
    is_active: true,
    sort_order: 0
  });
  const [gameModeForm, setGameModeForm] = useState<CreateGameModeRequest>({
    name: '',
    game_name_id: null,
    is_active: true,
    sort_order: 0
  });

  // Check authentication and role
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'super_admin')) {
      toast.error('无权访问此页面');
      window.location.href = '/login';
      return;
    }
    
    if (user && user.role === 'super_admin') {
      loadData();
    }
  }, [user, isLoading]);

  const loadData = async () => {
    try {
      setIsLoadingData(true);
      const [namesData, modesData] = await Promise.all([
        gameDictionaryApi.getAllGameNames(),
        gameDictionaryApi.getAllGameModes()
      ]);
      setGameNames(namesData);
      setGameModes(modesData);
    } catch (error) {
      console.error('Error loading dictionary data:', error);
      toast.error('加载字典数据失败');
    } finally {
      setIsLoadingData(false);
    }
  };

  const resetForms = () => {
    setGameNameForm({ name: '', is_active: true, sort_order: 0 });
    setGameModeForm({ name: '', game_name_id: null, is_active: true, sort_order: 0 });
    setEditingGameName(null);
    setEditingGameMode(null);
    setIsCreatingGameName(false);
    setIsCreatingGameMode(false);
  };

  // Game Names Management
  const handleCreateGameName = async () => {
    if (!gameNameForm.name.trim()) {
      toast.error('请输入游戏名称');
      return;
    }

    try {
      await gameDictionaryApi.createGameName(gameNameForm);
      toast.success('游戏名称创建成功');
      resetForms();
      loadData();
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || '创建失败');
    }
  };

  const handleUpdateGameName = async () => {
    if (!editingGameName || !gameNameForm.name.trim()) return;

    try {
      await gameDictionaryApi.updateGameName(editingGameName.id, {
        name: gameNameForm.name,
        is_active: gameNameForm.is_active ?? true,
        sort_order: gameNameForm.sort_order ?? 0
      });
      toast.success('游戏名称更新成功');
      resetForms();
      loadData();
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || '更新失败');
    }
  };

  const handleDeleteGameName = async (id: number) => {
    if (!confirm('确定要删除此游戏名称吗？')) return;

    try {
      const result = await gameDictionaryApi.deleteGameName(id);
      if (result.deactivated) {
        toast.success('游戏名称已停用（存在关联数据）');
      } else {
        toast.success('游戏名称删除成功');
      }
      loadData();
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || '删除失败');
    }
  };

  // Game Modes Management
  const handleCreateGameMode = async () => {
    if (!gameModeForm.name.trim()) {
      toast.error('请输入游戏模式名称');
      return;
    }

    try {
      await gameDictionaryApi.createGameMode(gameModeForm);
      toast.success('游戏模式创建成功');
      resetForms();
      loadData();
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || '创建失败');
    }
  };

  const handleUpdateGameMode = async () => {
    if (!editingGameMode || !gameModeForm.name.trim()) return;

    try {
      await gameDictionaryApi.updateGameMode(editingGameMode.id, {
        name: gameModeForm.name,
        game_name_id: gameModeForm.game_name_id!,
        is_active: gameModeForm.is_active ?? true,
        sort_order: gameModeForm.sort_order ?? 0
      });
      toast.success('游戏模式更新成功');
      resetForms();
      loadData();
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || '更新失败');
    }
  };

  const handleDeleteGameMode = async (id: number) => {
    if (!confirm('确定要删除此游戏模式吗？')) return;

    try {
      const result = await gameDictionaryApi.deleteGameMode(id);
      if (result.deactivated) {
        toast.success('游戏模式已停用（存在关联数据）');
      } else {
        toast.success('游戏模式删除成功');
      }
      loadData();
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || '删除失败');
    }
  };

  const startEditingGameName = (gameName: GameName) => {
    setEditingGameName(gameName);
    setGameNameForm({
      name: gameName.name,
      is_active: gameName.is_active,
      sort_order: gameName.sort_order
    });
  };

  const startEditingGameMode = (gameMode: GameMode) => {
    setEditingGameMode(gameMode);
    setGameModeForm({
      name: gameMode.name,
      game_name_id: gameMode.game_name_id,
      is_active: gameMode.is_active,
      sort_order: gameMode.sort_order
    });
  };

  const filteredGameNames = gameNames.filter(name => 
    name.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGameModes = gameModes.filter(mode => 
    mode.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mode.game_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return null;
  }

  return (
    <AppLayout title="字典管理">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/super-admin')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回控制台
            </Button>
            <div className="flex items-center space-x-3">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">游戏字典管理</h1>
                <p className="text-gray-600">管理游戏名称和游戏模式字典数据</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索游戏或模式..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('names')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'names'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            游戏名称
          </button>
          <button
            onClick={() => setActiveTab('modes')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'modes'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Tag className="w-4 h-4 inline mr-2" />
            游戏模式
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  {activeTab === 'names' ? '游戏名称' : '游戏模式'}管理
                </CardTitle>
                <CardDescription>
                  {isCreatingGameName || editingGameName ? '游戏名称' : isCreatingGameMode || editingGameMode ? '游戏模式' : '添加新项目'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeTab === 'names' ? (
                  <>
                    <div className="space-y-2">
                      <Label>游戏名称</Label>
                      <Input
                        value={gameNameForm.name}
                        onChange={(e) => setGameNameForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="请输入游戏名称"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>排序权重</Label>
                      <Input
                        type="number"
                        value={gameNameForm.sort_order}
                        onChange={(e) => setGameNameForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                        placeholder="排序权重（数字越小越靠前）"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>启用状态</Label>
                      <button
                        onClick={() => setGameNameForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                        className="flex items-center"
                      >
                        {gameNameForm.is_active ? (
                          <ToggleRight className="w-8 h-8 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>游戏模式名称</Label>
                      <Input
                        value={gameModeForm.name}
                        onChange={(e) => setGameModeForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="请输入游戏模式名称"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>关联游戏</Label>
                      <Select 
                        value={gameModeForm.game_name_id?.toString() || 'null'} 
                        onValueChange={(value) => setGameModeForm(prev => ({ 
                          ...prev, 
                          game_name_id: value === 'null' ? null : parseInt(value) 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择游戏（可留空表示通用模式）" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">通用模式（不关联特定游戏）</SelectItem>
                          {gameNames.map((game) => (
                            <SelectItem key={game.id} value={game.id.toString()}>
                              {game.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>排序权重</Label>
                      <Input
                        type="number"
                        value={gameModeForm.sort_order}
                        onChange={(e) => setGameModeForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                        placeholder="排序权重（数字越小越靠前）"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>启用状态</Label>
                      <button
                        onClick={() => setGameModeForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                        className="flex items-center"
                      >
                        {gameModeForm.is_active ? (
                          <ToggleRight className="w-8 h-8 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </>
                )}

                <div className="flex space-x-2 pt-4">
                  {editingGameName || editingGameMode ? (
                    <>
                      <Button 
                        onClick={editingGameName ? handleUpdateGameName : handleUpdateGameMode}
                        className="flex-1"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        保存
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={resetForms}
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={() => {
                        if (activeTab === 'names') {
                          setIsCreatingGameName(true);
                          handleCreateGameName();
                        } else {
                          setIsCreatingGameMode(true);
                          handleCreateGameMode();
                        }
                      }}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加{activeTab === 'names' ? '游戏名称' : '游戏模式'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* List Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === 'names' ? '游戏名称列表' : '游戏模式列表'}
                  <Badge variant="secondary" className="ml-2">
                    {activeTab === 'names' ? filteredGameNames.length : filteredGameModes.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeTab === 'names' ? (
                      filteredGameNames.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          暂无数据
                        </div>
                      ) : (
                        filteredGameNames.map((gameName) => (
                          <div 
                            key={gameName.id} 
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center space-x-3">
                              <div>
                                <div className="font-medium">{gameName.name}</div>
                                <div className="text-sm text-gray-500">
                                  排序: {gameName.sort_order} | 创建时间: {new Date(gameName.created_at).toLocaleDateString('zh-CN')}
                                </div>
                              </div>
                              <Badge variant={gameName.is_active ? 'default' : 'secondary'}>
                                {gameName.is_active ? '启用' : '停用'}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => startEditingGameName(gameName)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDeleteGameName(gameName.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )
                    ) : (
                      filteredGameModes.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          暂无数据
                        </div>
                      ) : (
                        filteredGameModes.map((gameMode) => (
                          <div 
                            key={gameMode.id} 
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center space-x-3">
                              <div>
                                <div className="font-medium">{gameMode.name}</div>
                                <div className="text-sm text-gray-500">
                                  {gameMode.game_name ? `关联游戏: ${gameMode.game_name}` : '通用模式'} | 
                                  排序: {gameMode.sort_order} | 
                                  创建时间: {new Date(gameMode.created_at).toLocaleDateString('zh-CN')}
                                </div>
                              </div>
                              <Badge variant={gameMode.is_active ? 'default' : 'secondary'}>
                                {gameMode.is_active ? '启用' : '停用'}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => startEditingGameMode(gameMode)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDeleteGameMode(gameMode.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}