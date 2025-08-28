'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  BarChart3, 
  Settings, 
  Shield,
  Activity,
  TrendingUp,
  DollarSign,
  Download,
  Plus,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Clock,
  ArrowRight,
  Edit,
  Trash2,
  KeyRound
} from 'lucide-react';
import { toast } from 'sonner';
import { superAdminApi } from '@/lib/api';
import type { User } from '@/types/api';

export default function SuperAdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [systemOverview, setSystemOverview] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('users');
  
  // User management modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form states
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'player',
    status: 'idle'
  });
  
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check authentication and role
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'super_admin')) {
      toast.error('无权访问此页面');
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load data
  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadSystemOverview();
      loadUsers();
    }
  }, [user]);

  const loadSystemOverview = async () => {
    try {
      setIsLoadingOverview(true);
      const overview = await superAdminApi.getSystemOverview();
      setSystemOverview(overview);
    } catch (error: any) {
      console.error('Error loading system overview:', error);
      toast.error('加载系统概览失败');
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedRole !== 'all') params.role = selectedRole;
      
      const usersList = await superAdminApi.getUsers(params);
      setUsers(usersList);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error('加载用户列表失败');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSearch = () => {
    loadUsers();
  };

  const handleGoToDispatcher = () => {
    router.push('/dispatcher');
  };

  // User management handlers
  const handleCreateUser = async () => {
    // Form validation
    if (!userForm.username.trim()) {
      toast.error('请填写用户名');
      return;
    }
    
    if (userForm.username.length < 3 || userForm.username.length > 20) {
      toast.error('用户名长度必须在3-20个字符之间');
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(userForm.username)) {
      toast.error('用户名只能包含字母、数字和下划线');
      return;
    }
    
    if (!userForm.password.trim()) {
      toast.error('请填写密码');
      return;
    }
    
    if (userForm.password.length < 6) {
      toast.error('密码长度不能少于6个字符');
      return;
    }

    setIsSubmitting(true);
    try {
      await superAdminApi.createUser({
        username: userForm.username,
        password: userForm.password,
        role: userForm.role
      });
      
      toast.success('用户创建成功');
      setIsCreateModalOpen(false);
      setUserForm({ username: '', password: '', role: 'player', status: 'idle' });
      loadUsers(); // 刷新用户列表
    } catch (error: any) {
      console.error('Create user error:', error);
      toast.error(error.response?.data?.message || '创建用户失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    // Form validation
    if (!userForm.username.trim()) {
      toast.error('请填写用户名');
      return;
    }
    
    if (userForm.username.length < 3 || userForm.username.length > 20) {
      toast.error('用户名长度必须在3-20个字符之间');
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(userForm.username)) {
      toast.error('用户名只能包含字母、数字和下划线');
      return;
    }

    setIsSubmitting(true);
    try {
      await superAdminApi.updateUser(selectedUser.id, {
        username: userForm.username,
        role: userForm.role,
        status: userForm.status
      });
      
      toast.success('用户更新成功');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      loadUsers(); // 刷新用户列表
    } catch (error: any) {
      console.error('Update user error:', error);
      toast.error(error.response?.data?.message || '更新用户失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await superAdminApi.deleteUser(selectedUser.id);
      
      toast.success('用户删除成功');
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      loadUsers(); // 刷新用户列表
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast.error(error.response?.data?.message || '删除用户失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    
    // Form validation
    if (!newPassword.trim()) {
      toast.error('请输入新密码');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('新密码长度不能少于6个字符');
      return;
    }

    setIsSubmitting(true);
    try {
      await superAdminApi.resetPassword(selectedUser.id, newPassword);
      
      toast.success('密码重置成功');
      setIsResetPasswordModalOpen(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.response?.data?.message || '密码重置失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setUserForm({ username: '', password: '', role: 'player', status: 'idle' });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      username: user.username,
      password: '',
      role: user.role,
      status: user.status
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsResetPasswordModalOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'dispatcher':
        return 'bg-blue-100 text-blue-800';
      case 'player':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '超级管理员';
      case 'dispatcher':
        return '派单员';
      case 'player':
        return '陪玩员';
      default:
        return role;
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'idle':
        return '空闲';
      case 'busy':
        return '忙碌';
      case 'offline':
        return '离线';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">超级管理员控制台</h1>
            <p className="text-gray-600">系统管理和数据统计中心</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge 
              variant="secondary" 
              className="bg-purple-100 text-purple-800 px-3 py-1"
            >
              <Shield className="w-4 h-4 mr-1" />
              超级管理员
            </Badge>
            <Button
              onClick={handleGoToDispatcher}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              前往派单工作台
            </Button>
          </div>
        </div>

        {/* System Overview Cards */}
        {!isLoadingOverview && systemOverview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总用户数</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemOverview.overview?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  活跃用户: {systemOverview.overview?.activeUsers || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总任务数</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemOverview.tasks?.totalTasks || 0}</div>
                <p className="text-xs text-muted-foreground">
                  今日新增: {systemOverview.tasks?.todayTasks || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">系统收入</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">¥{systemOverview.revenue?.totalRevenue || 0}</div>
                <p className="text-xs text-muted-foreground">
                  今日收入: ¥{systemOverview.revenue?.todayRevenue || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">系统健康度</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemOverview.health?.score || 100}%</div>
                <p className="text-xs text-muted-foreground">
                  运行时间: {systemOverview.health?.uptime || 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">用户管理</TabsTrigger>
            <TabsTrigger value="statistics">数据统计</TabsTrigger>
            <TabsTrigger value="system">系统监控</TabsTrigger>
            <TabsTrigger value="settings">系统设置</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* User Management */}
            <Card>
              <CardHeader>
                <CardTitle>用户管理</CardTitle>
                <CardDescription>管理系统中的所有用户账户</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="搜索用户名..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                  </div>
                  <select
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <option value="all">所有角色</option>
                    <option value="super_admin">超级管理员</option>
                    <option value="dispatcher">派单员</option>
                    <option value="player">陪玩员</option>
                  </select>
                  <Button onClick={handleSearch}>
                    <Search className="w-4 h-4 mr-2" />
                    搜索
                  </Button>
                  <Button onClick={loadUsers}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    刷新
                  </Button>
                  <Button onClick={openCreateModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加用户
                  </Button>
                </div>

                {/* Users Table */}
                <div className="border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户信息</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注册时间</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {isLoadingUsers ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                                <span className="ml-2">加载中...</span>
                              </div>
                            </td>
                          </tr>
                        ) : users.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                              暂无用户数据
                            </td>
                          </tr>
                        ) : (
                          users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                      <span className="text-purple-600 font-medium">
                                        {user.username.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                    <div className="text-sm text-gray-500">ID: {user.id}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className={getRoleColor(user.role)}>
                                  {getRoleDisplayName(user.role)}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className={getStatusColor(user.status)}>
                                  {getStatusDisplayName(user.status)}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(user.created_at).toLocaleDateString('zh-CN')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => openEditModal(user)}
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    编辑
                                  </Button>
                                  {user.role !== 'super_admin' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => openResetPasswordModal(user)}
                                    >
                                      <KeyRound className="w-3 h-3 mr-1" />
                                      重置密码
                                    </Button>
                                  )}
                                  {user.role !== 'super_admin' && (
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => openDeleteModal(user)}
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      删除
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>数据统计</CardTitle>
                <CardDescription>系统运行数据和统计分析</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">统计功能开发中</h3>
                  <p className="mt-1 text-sm text-gray-500">详细的统计分析功能即将推出</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>系统监控</CardTitle>
                <CardDescription>系统运行状态和性能监控</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Activity className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">系统监控功能开发中</h3>
                  <p className="mt-1 text-sm text-gray-500">详细的系统监控功能即将推出</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>系统设置</CardTitle>
                <CardDescription>系统配置和管理</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">系统设置功能开发中</h3>
                  <p className="mt-1 text-sm text-gray-500">详细的系统设置功能即将推出</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create User Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新用户</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="create-username">用户名</Label>
                <Input
                  id="create-username"
                  type="text"
                  placeholder="输入用户名"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="create-password">密码</Label>
                <Input
                  id="create-password"
                  type="password"
                  placeholder="输入密码"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="create-role">用户角色</Label>
                <Select 
                  value={userForm.role} 
                  onValueChange={(value) => setUserForm({ ...userForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">陪玩员</SelectItem>
                    <SelectItem value="dispatcher">派单员</SelectItem>
                    <SelectItem value="super_admin">超级管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
                <Button 
                  onClick={handleCreateUser}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '创建中...' : '创建用户'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑用户信息</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-username">用户名</Label>
                <Input
                  id="edit-username"
                  type="text"
                  placeholder="输入用户名"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">用户角色</Label>
                <Select 
                  value={userForm.role} 
                  onValueChange={(value) => setUserForm({ ...userForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">陪玩员</SelectItem>
                    <SelectItem value="dispatcher">派单员</SelectItem>
                    <SelectItem value="super_admin">超级管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">用户状态</Label>
                <Select 
                  value={userForm.status} 
                  onValueChange={(value) => setUserForm({ ...userForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idle">空闲</SelectItem>
                    <SelectItem value="busy">忙碌</SelectItem>
                    <SelectItem value="offline">离线</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
                <Button 
                  onClick={handleEditUser}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '更新中...' : '更新用户'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除用户</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                确定要删除用户 <span className="font-medium text-gray-900">{selectedUser?.username}</span> 吗？
                此操作不可撤销。
              </p>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDeleteUser}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '删除中...' : '确认删除'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Password Modal */}
        <Dialog open={isResetPasswordModalOpen} onOpenChange={setIsResetPasswordModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>重置用户密码</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                为用户 <span className="font-medium text-gray-900">{selectedUser?.username}</span> 重置密码
              </p>
              <div>
                <Label htmlFor="new-password">新密码</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="输入新密码"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
                <Button 
                  onClick={handleResetPassword}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '重置中...' : '重置密码'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}