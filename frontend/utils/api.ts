import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";
const TOKEN_KEY = "auth_token";

// Cross-platform token storage (web: localStorage, native: SecureStore, SSR: null)
export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") return window.localStorage?.getItem(TOKEN_KEY) || null;
      return null; // SSR
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch { return null; }
}

export async function setToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage?.setItem(TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {}
}

export async function clearToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage?.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
}

async function authFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  get: (path: string) => authFetch(path),
  post: (path: string, body: any) =>
    authFetch(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path: string, body: any) =>
    authFetch(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => authFetch(path, { method: "DELETE" }),
};

export default api;
