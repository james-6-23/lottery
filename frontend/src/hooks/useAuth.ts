import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, logout as apiLogout, refreshToken as apiRefreshToken } from '../api/auth';
import type { User } from '../api/auth';
import {
  getAuthState,
  subscribeToAuth,
  setUser,
  setLoading,
  saveTokens,
  getTokens,
  clearAuth,
} from '../store/auth';

export function useAuth() {
  const [state, setState] = useState(getAuthState());

  useEffect(() => {
    return subscribeToAuth(() => {
      setState(getAuthState());
    });
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string, user: User) => {
    saveTokens(accessToken, refreshToken);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try {
      const { refreshToken } = getTokens();
      if (refreshToken) {
        await apiLogout(refreshToken);
      }
    } catch {
      // Ignore logout errors
    } finally {
      clearAuth();
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const { accessToken, refreshToken } = getTokens();
    
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      const user = await getCurrentUser();
      setUser(user);
    } catch {
      // Try to refresh token
      if (refreshToken) {
        try {
          const response = await apiRefreshToken(refreshToken);
          saveTokens(response.access_token, response.refresh_token);
          setUser(response.user);
        } catch {
          clearAuth();
        }
      } else {
        clearAuth();
      }
    }
  }, []);

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    logout,
    checkAuth,
  };
}
