import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'USER';
  avatarUrl?: string;
}

export interface RestaurantTenant {
  id: string;
  name: string;
  slug: string;
  role: 'ADMIN' | 'STAFF';
  localCurrencyCode: string;
  localCurrencySymbol: string;
}

interface AuthContextType {
  user: UserProfile | null;
  restaurants: RestaurantTenant[];
  activeRestaurant: RestaurantTenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginBypass: (email: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  switchRestaurant: (id: string) => void;
  logout: () => void;
  setError: (err: string | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantTenant[]>([]);
  const [activeRestaurant, setActiveRestaurant] = useState<RestaurantTenant | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const switchRestaurant = (id: string) => {
    const found = restaurants.find(r => r.id === id);
    if (found) {
      localStorage.setItem('activeRestaurantId', id);
      setActiveRestaurant(found);
      // Reload pages to refresh active contexts
      window.location.reload();
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('activeRestaurantId');
    setUser(null);
    setRestaurants([]);
    setActiveRestaurant(null);
    setIsAuthenticated(false);
    setError(null);
    window.location.href = '/login';
  };

  const loginBypass = async (email: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.loginBypass(email);

      localStorage.setItem('accessToken', res.accessToken);

      setUser(res.user);
      setRestaurants(res.restaurants || []);
      setIsAuthenticated(true);

      if (res.restaurants && res.restaurants.length > 0) {
        const storedActiveId = localStorage.getItem('activeRestaurantId');
        const active = res.restaurants.find((r: any) => r.id === storedActiveId) || res.restaurants[0];
        localStorage.setItem('activeRestaurantId', active.id);
        setActiveRestaurant(active);
      } else {
        localStorage.removeItem('activeRestaurantId');
        setActiveRestaurant(null);
      }
    } catch (err: any) {
      console.error('Bypass login failed:', err);
      setError(err?.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.loginWithGoogle(idToken);

      localStorage.setItem('accessToken', res.accessToken);

      setUser(res.user);
      setRestaurants(res.restaurants || []);
      setIsAuthenticated(true);

      if (res.restaurants && res.restaurants.length > 0) {
        const storedActiveId = localStorage.getItem('activeRestaurantId');
        const active = res.restaurants.find((r: any) => r.id === storedActiveId) || res.restaurants[0];
        localStorage.setItem('activeRestaurantId', active.id);
        setActiveRestaurant(active);
      } else {
        localStorage.removeItem('activeRestaurantId');
        setActiveRestaurant(null);
      }
    } catch (err: any) {
      console.error('Google login failed:', err);
      setError(err?.message || 'Google login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      setUser(res.user);
      setRestaurants(res.restaurants || []);
      setIsAuthenticated(true);

      if (res.restaurants && res.restaurants.length > 0) {
        const storedActiveId = localStorage.getItem('activeRestaurantId');
        const active = res.restaurants.find((r: any) => r.id === storedActiveId) || res.restaurants[0];
        localStorage.setItem('activeRestaurantId', active.id);
        setActiveRestaurant(active);
      } else {
        localStorage.removeItem('activeRestaurantId');
        setActiveRestaurant(null);
      }
    } catch (err: any) {
      console.error('Failed to restore auth session:', err);
      if (err?.error === 'ONBOARDING_REQUIRED') {
        // User exists but has no tenants. Still authenticated, just unassigned
        setUser(err.user || { email: localStorage.getItem('lastEmail'), name: 'User', role: 'USER' });
        setRestaurants([]);
        setActiveRestaurant(null);
        setIsAuthenticated(true);
      } else {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        restaurants,
        activeRestaurant,
        isAuthenticated,
        isLoading,
        error,
        loginBypass,
        loginWithGoogle,
        switchRestaurant,
        logout,
        setError,
        refreshUser,
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
