import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearToken, getToken, setToken } from "./api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const loadMe = useCallback(async () => {
    try {
      setUser(await api.me());
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getToken()) loadMe();
    const onLogout = () => setUser(null);
    window.addEventListener("stockflow:logout", onLogout);
    return () => window.removeEventListener("stockflow:logout", onLogout);
  }, [loadMe]);

  const authenticate = async (fn, payload) => {
    const { access_token } = await fn(payload);
    setToken(access_token);
    await loadMe();
  };

  const value = {
    user,
    loading,
    login: (p) => authenticate(api.login, p),
    signup: (p) => authenticate(api.signup, p),
    logout: () => {
      clearToken();
      setUser(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
