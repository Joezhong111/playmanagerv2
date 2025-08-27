'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';
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

  const isAuthenticated = !!user;

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = Cookies.get('token');
      const savedUser = Cookies.get('user');

      if (token && savedUser) {
        // Parse saved user data
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        // Verify token is still valid
        try {
          await authApi.verify();
        } catch (error) {
          // Token is invalid, clear auth data
          console.error('Token verification failed:', error);
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