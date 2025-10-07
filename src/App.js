import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';

function App() {
  const [theme, setTheme] = useState('dark');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Load saved theme from localStorage, default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Check authentication status (will be replaced with actual backend check)
    const savedAuthStatus = localStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(savedAuthStatus);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogin = () => {
    // Placeholder for login logic - will be replaced with actual backend integration
    console.log('Login clicked');
    // For testing purposes, you can uncomment the line below to simulate login
    // setIsAuthenticated(true);
    // localStorage.setItem('isAuthenticated', 'true');
  };

  const handleSignUp = () => {
    // Placeholder for signup logic - will be replaced with actual backend integration
    console.log('Sign Up clicked');
    // For testing purposes, you can uncomment the line below to simulate signup
    // setIsAuthenticated(true);
    // localStorage.setItem('isAuthenticated', 'true');
  };

  const handleLogout = () => {
    // Placeholder for logout logic - will be replaced with actual backend integration
    console.log('Logout clicked');
    setIsAuthenticated(false);
    localStorage.setItem('isAuthenticated', 'false');
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
      <HeroSection />
    </div>
  );
}

export default App;
