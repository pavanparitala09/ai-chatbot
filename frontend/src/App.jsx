import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const App = () => {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Restore user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.clear();
      }
    }
    setAuthChecked(true);
  }, []);

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (!authChecked) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#090910',
      }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user
            ? <ChatPage user={user} onLogout={handleLogout} />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/login"
        element={
          user
            ? <Navigate to="/" replace />
            : <LoginPage onLogin={handleLogin} />
        }
      />
      <Route
        path="/register"
        element={
          user
            ? <Navigate to="/" replace />
            : <RegisterPage onLogin={handleLogin} />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
