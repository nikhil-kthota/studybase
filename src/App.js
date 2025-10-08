import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import Login from './components/Login';
import Signup from './components/Signup';
import MyAccount from './components/MyAccount';
import NewBase from './components/NewBase';
import MyBases from './components/MyBases';
import BaseView from './components/BaseView';
import EditBase from './components/EditBase';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const [theme, setTheme] = useState('dark');
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const { isAuthenticated, signOut } = useAuth();

  useEffect(() => {
    // Load saved theme from localStorage, default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogin = () => {
    setShowLogin(true);
  };

  const handleSignUp = () => {
    setShowSignup(true);
  };

  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      console.log('Successfully logged out');
    } else {
      console.error('Logout failed:', result.message);
    }
  };

  const closeAuthModal = () => {
    setShowLogin(false);
    setShowSignup(false);
  };

  const switchToSignup = () => {
    setShowLogin(false);
    setShowSignup(true);
  };

  const switchToLogin = () => {
    setShowSignup(false);
    setShowLogin(true);
  };

  return (
    <div className="app">
      <Navbar 
        theme={theme} 
        toggleTheme={toggleTheme}
        isAuthenticated={isAuthenticated}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
        onLogout={handleLogout}
      />
      
      <Routes>
        <Route path="/" element={<HeroSection />} />
        <Route path="/my-account" element={<MyAccount />} />
        <Route path="/new-base" element={<NewBase />} />
        <Route path="/my-bases" element={<MyBases />} />
        <Route path="/base/:baseId" element={<BaseView />} />
        <Route path="/edit-base/:baseId" element={<EditBase />} />
      </Routes>
      
      {/* Authentication Modals */}
      {showLogin && (
        <Login 
          onSwitchToSignup={switchToSignup}
          onClose={closeAuthModal}
        />
      )}
      
      {showSignup && (
        <Signup 
          onSwitchToLogin={switchToLogin}
          onClose={closeAuthModal}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
