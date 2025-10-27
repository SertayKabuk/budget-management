/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { config } from '../config/runtime';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string | null;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAnyGroupAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface JWTPayload {
  id: string;
  email: string;
  name: string;
  picture?: string | null;
  role?: string;
  exp: number;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAnyGroupAdmin, setIsAnyGroupAdmin] = useState<boolean>(false);

  // Check if user is admin of any group
  const checkGroupAdminStatus = useCallback(async (userId: string, authToken: string) => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/groups`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const groups = response.data;
      
      // Check if user is admin in any group
      for (const group of groups) {
        const membersResponse = await axios.get(`${config.apiUrl}/api/groups/${group.id}/members`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        const members = membersResponse.data;
        const userMember = members.find((m: { userId: string; role: string }) => m.userId === userId);
        
        if (userMember?.role === 'admin') {
          setIsAnyGroupAdmin(true);
          return;
        }
      }
      setIsAnyGroupAdmin(false);
    } catch (error) {
      console.error('Error checking group admin status:', error);
      setIsAnyGroupAdmin(false);
    }
  }, []);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      try {
        const decoded = jwtDecode<JWTPayload>(storedToken);
        
        // Check if token is expired
        if (decoded.exp * 1000 > Date.now()) {
          setToken(storedToken);
          setUser({
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture,
            role: decoded.role,
          });
          
          // Check if user is admin of any group (unless they're already global admin)
          if (decoded.role !== 'admin') {
            checkGroupAdminStatus(decoded.id, storedToken);
          } else {
            setIsAnyGroupAdmin(false); // Global admins don't need group admin flag
          }
        } else {
          // Token expired
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('auth_token');
      }
    }
  }, [checkGroupAdminStatus]);

  const login = useCallback((newToken: string) => {
    try {
      const decoded = jwtDecode<JWTPayload>(newToken);
      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
      setUser({
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        role: decoded.role,
      });
      
      // Check if user is admin of any group (unless they're already global admin)
      if (decoded.role !== 'admin') {
        checkGroupAdminStatus(decoded.id, newToken);
      } else {
        setIsAnyGroupAdmin(false); // Global admins don't need group admin flag
      }
    } catch (error) {
      console.error('Invalid token:', error);
    }
  }, [checkGroupAdminStatus]);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    setIsAnyGroupAdmin(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        isAdmin: user?.role === 'admin',
        isAnyGroupAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
