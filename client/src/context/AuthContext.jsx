import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('econudge_token');
    const email = localStorage.getItem('econudge_email');
    const userId = localStorage.getItem('econudge_userId');
    if (token && email) {
      setUser({ token, email, userId });
    }
    setLoading(false);
  }, []);
  const login = (token, email, userId, onboarding_done) => {
  localStorage.setItem('ecotrack_token', token);
  localStorage.setItem('ecotrack_email', email);
  localStorage.setItem('ecotrack_userId', userId);
  localStorage.setItem('ecotrack_onboarding', onboarding_done ? '1' : '0');
  setUser({ token, email, userId, onboarding_done });
};

  

  const logout = () => {
    localStorage.removeItem('econudge_token');
    localStorage.removeItem('econudge_email');
    localStorage.removeItem('econudge_userId');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
