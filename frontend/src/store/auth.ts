import type { User } from '../api/auth';

// Simple auth state management
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

let state: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

const listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function getAuthState(): AuthState {
  return state;
}

export function subscribeToAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setUser(user: User | null) {
  state = {
    ...state,
    user,
    isAuthenticated: user !== null,
    isLoading: false,
  };
  notifyListeners();
}

export function updateUserBalance(balance: number) {
  if (state.user && state.user.wallet) {
    state = {
      ...state,
      user: {
        ...state.user,
        wallet: {
          ...state.user.wallet,
          balance,
        },
      },
    };
    notifyListeners();
  }
}

export function setLoading(isLoading: boolean) {
  state = { ...state, isLoading };
  notifyListeners();
}

export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
}

export function getTokens(): { accessToken: string | null; refreshToken: string | null } {
  return {
    accessToken: localStorage.getItem('access_token'),
    refreshToken: localStorage.getItem('refresh_token'),
  };
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function clearAuth() {
  clearTokens();
  state = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
  };
  notifyListeners();
}
