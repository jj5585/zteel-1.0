import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { getToken, setToken, clearToken } from "../utils/api";

interface User {
  user_id: string;
  email: string;
  name: string;
  role: "customer" | "vendor";
  picture?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string, role: string) => Promise<void>;
  googleAuth: (sessionId: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = await getToken();
      if (storedToken) {
        setTokenState(storedToken);
        const userData = await api.get("/api/auth/me");
        setUser(userData);
      }
    } catch {
      await clearToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await api.post("/api/auth/login", { email, password });
    await setToken(data.token);
    setTokenState(data.token);
    setUser({ user_id: data.user_id, email, name: data.name, role: data.role, picture: data.picture });
  };

  const register = async (email: string, password: string, name: string, phone: string, role: string) => {
    const data = await api.post("/api/auth/register", { email, password, name, phone, role });
    await setToken(data.token);
    setTokenState(data.token);
    setUser({ user_id: data.user_id, email, name: data.name, role: data.role });
  };

  const googleAuth = async (sessionId: string, role: string = "customer") => {
    const data = await api.post("/api/auth/google", { session_id: sessionId, role });
    await setToken(data.token);
    setTokenState(data.token);
    setUser({ user_id: data.user_id, email: data.email || "", name: data.name, role: data.role, picture: data.picture });
  };

  const logout = async () => {
    await clearToken();
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, googleAuth, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
