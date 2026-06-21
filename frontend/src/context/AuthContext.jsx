import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const r = await api.get("/auth/me");
      setUser(r.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("eco_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };
  const register = async (email, password, name) => {
    const r = await api.post("/auth/register", { email, password, name });
    localStorage.setItem("eco_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };
  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (err) { console.error("Logout request failed:", err); }
    localStorage.removeItem("eco_token");
    setUser(null);
  };
  const refresh = checkAuth;

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}
export const useAuth = () => useContext(AuthCtx);
