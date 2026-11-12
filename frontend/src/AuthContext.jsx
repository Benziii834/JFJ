import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState(null);
  const [checking, setChecking] = useState(true);

  async function loadUser() {
    const me = await api("/users/me");
    setUser(me);
  }

  async function login(email, password) {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.accessToken);
    setMode(data.mode);
    await loadUser();
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (err) {
      // even if this fails, we still log out on screen
    }
    setToken(null);
    setUser(null);
    setMode(null);
  }

    async function switchMode(target) {
    const newMode = target || (mode === "WORKER" ? "PROVIDER" : "WORKER");
    const data = await api("/auth/switch-mode", {
      method: "POST",
      body: JSON.stringify({ mode: newMode }),
    });
    setToken(data.accessToken);
    setMode(data.mode || newMode);
  }

  // when the page loads, try to restore the old session using the refresh cookie
  useEffect(() => {
    async function restore() {
      try {
        const data = await api("/auth/refresh", { method: "POST" });
        setToken(data.accessToken);
        setMode(data.mode);
        await loadUser();
      } catch (err) {
        // not logged in, that's fine
      } finally {
        setChecking(false);
      }
    }
    restore();
  }, []);

  return (
    <AuthContext.Provider value={{ user, mode, checking, login, logout, switchMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}