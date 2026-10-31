import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import { setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session on mount via silent refresh/cookie
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Try refreshing access token using HttpOnly cookie
        const tokenData = await authService.refreshToken();
        if (tokenData?.access) {
          const profile = await authService.getCurrentUser();
          if (isMounted) {
            setUser(profile);
          }
        }
      } catch (err) {
        // Not logged in or expired session
        setAccessToken(null);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for unauthorized events emitted by Axios interceptor
    const handleUnauthorized = () => {
      setUser(null);
      setAccessToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password, rememberMe = false) => {
    const data = await authService.login({ email, password, remember_me: rememberMe });
    setUser(data.user);
    return data;
  };

  const register = async (formData) => {
    const data = await authService.register(formData);
    return data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  const refreshUser = async () => {
    try {
      const profile = await authService.getCurrentUser();
      setUser(profile);
      return profile;
    } catch (err) {
      setUser(null);
      throw err;
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

