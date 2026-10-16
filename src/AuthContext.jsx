import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API } from "./pages/tax/taxApi";

const AuthContext = createContext({
  user: null,
  login: () => {},
  logout: () => {},
  loading: true,
  access: null,
  can: () => false,
  refreshAccess: () => {},
});

// What the account may do, from the API - the role saved at login is only a
// label; permissions can change at any time from the super admin's screen.
async function fetchAccess(token) {
  const res = await fetch(`${API}/permissions/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401 || res.status === 403) return { expired: true };
  if (!res.ok) throw new Error(`permissions ${res.status}`);
  const data = await res.json();
  return { role: data.role, isSuperAdmin: !!data.isSuperAdmin, permissions: new Set(data.permissions || []) };
}

// Utility functions for localStorage operations
const getLocalStorageItem = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return null;
  }
};

const setLocalStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
};

const removeLocalStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState(null);

  const loadAccess = useCallback(async (token) => {
    try {
      const result = await fetchAccess(token);
      if (result.expired) {
        clearSession();
        return;
      }
      setAccess(result);
    } catch (error) {
      console.error("Could not load permissions:", error);
      setAccess({ role: "", isSuperAdmin: false, permissions: new Set() });
    }
  }, []);

  useEffect(() => {
    const token = getLocalStorageItem("token");
    const role = getLocalStorageItem("role");
    const user_id = getLocalStorageItem("user_id");
    const name = getLocalStorageItem("name");
    const companyName = getLocalStorageItem("companyName");


    if (token && role && user_id) {
      setUser({ token, role, user_id, name,companyName });
      loadAccess(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadAccess]);

  const login = (token, role, user_id, name, companyName) => {
    setLocalStorageItem("token", token);
    setLocalStorageItem("role", role);
    setLocalStorageItem("user_id", user_id);
    setLocalStorageItem("name", name);
    setLocalStorageItem("companyName", companyName);
    setUser({ token, role, user_id, name,companyName });
    setAccess(null);
    setLoading(true);
    loadAccess(token).finally(() => setLoading(false));
  };

  function clearSession() {
    removeLocalStorageItem("token");
    removeLocalStorageItem("role");
    removeLocalStorageItem("user_id");
    removeLocalStorageItem("name");
    removeLocalStorageItem("companyName");
    setUser(null);
    setAccess(null);
  }
  const logout = clearSession;

  const can = useCallback(
    (key) => !!access && (access.isSuperAdmin || access.permissions.has(key)),
    [access]
  );
  const refreshAccess = useCallback(() => {
    const token = getLocalStorageItem("token");
    if (token) return loadAccess(token);
  }, [loadAccess]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, access, can, refreshAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);