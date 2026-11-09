import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, onUnauthorized, setToken } from "./api";

interface AuthValue {
  /** null enquanto confere o token salvo */
  isAdmin: boolean | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(getToken() ? null : false);

  useEffect(() => {
    if (!getToken()) return;
    api<{ admin: boolean }>("/api/auth/me")
      .then((r) => {
        if (!r.admin) setToken(null);
        setIsAdmin(r.admin);
      })
      // backend fora do ar: confia no token por enquanto; a API recusa se não valer
      .catch(() => setIsAdmin(true));
  }, []);

  useEffect(
    () =>
      onUnauthorized(() => {
        setToken(null);
        setIsAdmin(false);
      }),
    [],
  );

  const login = useCallback(async (username: string, password: string) => {
    const r = await api<{ token: string; expiresAt: number }>("/api/auth/login", {
      method: "POST",
      body: { username, password },
    });
    setToken(r.token);
    setIsAdmin(true);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo(() => ({ isAdmin, login, logout }), [isAdmin, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}
