import { apiClient } from './client';

export interface User {
  ID: number;
  linuxdo_id: string;
  username: string;
  avatar: string;
  role: string;
  wallet?: {
    ID: number;
    user_id: number;
    balance: number;
  };
}

export interface DevUser {
  id: string;
  username: string;
  role: string;
  avatar: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface AuthMode {
  mode: 'dev' | 'prod';
}

export interface DevUsersResponse {
  users: DevUser[];
}

// Get authentication mode
export async function getAuthMode(): Promise<AuthMode> {
  return apiClient.get<AuthMode>('/auth/mode');
}

// Get available dev users (dev mode only)
export async function getDevUsers(): Promise<DevUsersResponse> {
  return apiClient.get<DevUsersResponse>('/auth/dev/users');
}

// Dev mode login
export async function devLogin(userId: string): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/login/dev', { user_id: userId });
}

// Refresh token
export async function refreshToken(refreshToken: string): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/refresh', { refresh_token: refreshToken });
}

// Logout
export async function logout(refreshToken?: string): Promise<void> {
  return apiClient.post<void>('/auth/logout', { refresh_token: refreshToken });
}

// Get current user
export async function getCurrentUser(): Promise<User> {
  return apiClient.get<User>('/auth/me');
}
