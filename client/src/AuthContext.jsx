import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, clearToken, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000;
        if (Date.now() >= exp) {
          clearToken();
        } else {
          setUser({ email: payload.email || '', token });
        }
      } catch { clearToken(); }
    }
    setLoading(false);
  }, []);

  function loginWithToken(token) {
    setToken(token);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({ email: payload.email || '', token });
    } catch { clearToken(); }
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isAuth: !!user, loading, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
