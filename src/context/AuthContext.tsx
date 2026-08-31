'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  coverImage: string;
  bio: string;
  course: string;
  faculty: string;
  yearOfStudy: number;
  interests: string[];
  hobbies: string[];
  isOnline: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

interface SignupData {
  name: string;
  username: string;
  email: string;
  password: string;
  course?: string;
  faculty?: string;
  yearOfStudy?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for session
    try {
      const stored = localStorage.getItem('campus_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the stored user has the minimum required fields
        if (parsed && typeof parsed === 'object' && parsed.id) {
          // Normalize any missing fields so downstream code never crashes
          setUser({
            id: parsed.id,
            name: parsed.name || '',
            username: parsed.username || '',
            email: parsed.email || '',
            avatar: parsed.avatar || '',
            coverImage: parsed.coverImage || '',
            bio: parsed.bio || '',
            course: parsed.course || '',
            faculty: parsed.faculty || '',
            yearOfStudy: parsed.yearOfStudy || 1,
            interests: Array.isArray(parsed.interests) ? parsed.interests : [],
            hobbies: Array.isArray(parsed.hobbies) ? parsed.hobbies : [],
            isOnline: true,
          });
        } else {
          // Corrupt/old data — clear it
          localStorage.removeItem('campus_user');
        }
      }
    } catch {
      // Invalid JSON — clear it
      try { localStorage.removeItem('campus_user'); } catch {}
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      const normalized: AuthUser = {
        id: data.user.id,
        name: data.user.name || '',
        username: data.user.username || '',
        email: data.user.email || '',
        avatar: data.user.avatar || '',
        coverImage: data.user.coverImage || '',
        bio: data.user.bio || '',
        course: data.user.course || '',
        faculty: data.user.faculty || '',
        yearOfStudy: data.user.yearOfStudy || 1,
        interests: Array.isArray(data.user.interests) ? data.user.interests : [],
        hobbies: Array.isArray(data.user.hobbies) ? data.user.hobbies : [],
        isOnline: true,
      };
      setUser(normalized);
      localStorage.setItem('campus_user', JSON.stringify(normalized));
      return { success: true };
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  const signup = async (signupData: SignupData) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      // Auto-login after signup
      const loginResult = await login(signupData.email, signupData.password);
      return loginResult;
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('campus_user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
