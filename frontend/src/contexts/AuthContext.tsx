'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';
import { useSocket } from '@/lib/socket';
import type { User, LoginRequest } from '@/types/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const socketManager = useSocket();

  const isAuthenticated = !!user;

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Listen for user status changes via Socket
  useEffect(() => {
    if (user && isAuthenticated) {
      const socket = socketManager.connect();
      if (socket) {
        const handleUserStatusChange = (data: { userId: number; username: string; status: 'idle' | 'busy' | 'offline' }) => {
          console.log('[AuthContext] 收到用户状态变更事件:', data);
          // 只更新当前用户的状态
          if (user.id === data.userId) {
            console.log(`[AuthContext] 更新当前用户状态从 ${user.status} 到 ${data.status}`);
            const updatedUser = { ...user, status: data.status };
            setUser(updatedUser);
            // 同步更新 Cookie
            Cookies.set('user', JSON.stringify(updatedUser), { 
              expires: 1,
              sameSite: 'strict',
              secure: process.env.NODE_ENV === 'production'
            });
          }
        };

        socket.on('player_status_changed', handleUserStatusChange);

        return () => {
          socket.off('player_status_changed', handleUserStatusChange);
        };
      }
    }
  }, [user, isAuthenticated, socketManager]);

  const initializeAuth = async () => {
    try {
      const token = Cookies.get('token');
      const savedUser = Cookies.get('user');

      if (token && savedUser) {
        try {
          // Parse saved user data
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);

          // Verify token is still valid with timeout protection
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Token verification timeout')), 10000); // 10秒超时
          });
          
          await Promise.race([
            authApi.verify(),
            timeoutPromise
          ]);
          
          console.log('Token verification successful');
        } catch (error) {
          // Token is invalid or verification failed, clear auth data
          console.error('Token verification failed:', error);
          if ((error as Error).message === 'Token verification timeout') {
            console.warn('Auth verification timed out, clearing auth state');
          }
          clearAuth();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      const response = await authApi.login(credentials);
      
      // Save token and user data
      Cookies.set('token', response.token, { 
        expires: 1, // 1 day
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
      });
      
      Cookies.set('user', JSON.stringify(response.user), { 
        expires: 1, // 1 day
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
      });
      
      setUser(response.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuth();
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.verify();
      const updatedUser = response.user;
      
      setUser(updatedUser);
      Cookies.set('user', JSON.stringify(updatedUser), { 
        expires: 1,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
      });
    } catch (error) {
      console.error('User refresh error:', error);
      clearAuth();
      throw error;
    }
  };

  const clearAuth = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    setUser(null);
  };


  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};