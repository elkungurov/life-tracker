import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, clearToken, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ email: payload.email || '', token });
      } catch { clearToken(); }
    }
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
    <AuthContext.Provider value={{ user, isAuth: !!user, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
