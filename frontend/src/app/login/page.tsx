'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Lock, GamepadIcon } from 'lucide-react';

interface TestAccount {
  username: string;
  password: string;
  role: string;
  description: string;
}

const testAccounts: TestAccount[] = [
  { username: 'super_admin', password: 'admin123', role: 'super_admin', description: '超级管理员' },
  { username: 'admin', password: 'admin123', role: 'dispatcher', description: '主要派单员' },
  { username: 'dispatcher2', password: 'admin123', role: 'dispatcher', description: '副派单员' },
  { username: 'player1', password: 'admin123', role: 'player', description: '陪玩员1 (空闲)' },
  { username: 'player2', password: 'admin123', role: 'player', description: '陪玩员2 (空闲)' },
  { username: 'player3', password: 'admin123', role: 'player', description: '陪玩员3 (忙碌)' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('请输入用户名和密码');
      return;
    }

    setIsLoading(true);
    try {
      await login({ username, password });
      toast.success('登录成功');
      router.push('/dashboard');
    } catch (error: unknown) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : '登录失败，请检查用户名和密码');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAccountLogin = async (account: TestAccount) => {
    setUsername(account.username);
    setPassword(account.password);
    
    setIsLoading(true);
    try {
      await login({ username: account.username, password: account.password });
      toast.success(`使用${account.description}登录成功`);
      router.push('/dashboard');
    } catch (error: unknown) {
      console.error('Test account login error:', error);
      toast.error(error instanceof Error ? error.message : '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'dispatcher':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'player':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Main Login Card */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <GamepadIcon className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              派单管理系统
            </CardTitle>
            <CardDescription className="text-gray-600">
              请登录您的账户继续使用系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  用户名
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  密码
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? '登录中...' : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Test Accounts Card */}
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">测试账户</CardTitle>
            <CardDescription>
              点击下方按钮快速使用测试账户登录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {testAccounts.map((account) => (
                <Button
                  key={account.username}
                  variant="outline"
                  className={`w-full justify-between p-4 h-auto ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md transition-shadow'}`}
                  onClick={() => handleTestAccountLogin(account)}
                  disabled={isLoading}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{account.username}</div>
                      <div className="text-sm text-gray-500">{account.description}</div>
                    </div>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={getRoleColor(account.role)}
                  >
                    {account.role === 'super_admin' ? '超级管理员' : 
                     account.role === 'dispatcher' ? '派单员' : '陪玩员'}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          © 2025 派单管理系统 - 基于 Next.js 构建
        </div>
      </div>
    </div>
  );
}