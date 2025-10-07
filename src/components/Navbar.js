import React, { useState } from 'react';
import './Navbar.css';

const Navbar = ({ theme, toggleTheme, isAuthenticated, onLogin, onSignUp, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileAuthOpen, setIsMobileAuthOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setIsMobileAuthOpen(false); // Close auth dropdown when menu opens
  };

  const toggleMobileAuth = () => {
    setIsMobileAuthOpen(!isMobileAuthOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Left side - Logo */}
        <div className="navbar-left">
          <div className="logo">
            <span className="logo-text">StudyBase</span>
            <div className="logo-glow"></div>
          </div>
        </div>

        {/* Center - Navigation Links */}
        <div className="navbar-center">
          <ul className="nav-links">
            <li><a href="#home" className="nav-link">Home</a></li>
            <li><a href="#new-base" className="nav-link">New Base</a></li>
            <li><a href="#my-bases" className="nav-link">My Bases</a></li>
            <li><a href="#chat" className="nav-link">Chat</a></li>
          </ul>
        </div>

        {/* Right side - Authentication & Theme Toggle */}
        <div className="navbar-right">
          <div className="theme-toggle" onClick={toggleTheme}>
            <div className={`toggle-switch ${theme === 'dark' ? 'dark' : 'light'}`}>
              <div className="toggle-slider">
                <div className="toggle-icon">
                  {theme === 'dark' ? '🌙' : '☀️'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Desktop Authentication Section */}
          {isAuthenticated ? (
            // Authenticated User - Show Profile Icon
            <div className="profile-icon" onClick={onLogout}>
              <div className="profile-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
            </div>
          ) : (
            // Non-authenticated User - Show Login/Sign Up Buttons
            <div className="auth-buttons">
              <button className="auth-btn login-btn" onClick={onLogin}>
                Log In
              </button>
              <button className="auth-btn signup-btn" onClick={onSignUp}>
                Sign Up
              </button>
            </div>
          )}

          {/* Mobile Profile Icon (only visible when hamburger menu is used) */}
          <div className="mobile-profile-section">
            {!isAuthenticated && (
              <div className="mobile-profile-icon" onClick={toggleMobileAuth}>
                <div className="mobile-profile-avatar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                
                {/* Mobile Auth Dropdown */}
                <div className={`mobile-auth-dropdown ${isMobileAuthOpen ? 'active' : ''}`}>
                  <button className="mobile-dropdown-btn login-btn" onClick={() => { onLogin(); setIsMobileAuthOpen(false); }}>
                    Log In
                  </button>
                  <button className="mobile-dropdown-btn signup-btn" onClick={() => { onSignUp(); setIsMobileAuthOpen(false); }}>
                    Sign Up
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="mobile-menu-button" onClick={toggleMobileMenu}>
            <div className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-content">
          <ul className="mobile-nav-links">
            <li><a href="#home" className="mobile-nav-link" onClick={toggleMobileMenu}>Home</a></li>
            <li><a href="#new-base" className="mobile-nav-link" onClick={toggleMobileMenu}>New Base</a></li>
            <li><a href="#my-bases" className="mobile-nav-link" onClick={toggleMobileMenu}>My Bases</a></li>
            <li><a href="#chat" className="mobile-nav-link" onClick={toggleMobileMenu}>Chat</a></li>
          </ul>
          
          {/* Mobile Authentication Section */}
          <div className="mobile-auth-section">
            {isAuthenticated ? (
              <button className="mobile-auth-btn logout-btn" onClick={() => { onLogout(); toggleMobileMenu(); }}>
                Logout
              </button>
            ) : (
              <div className="mobile-auth-buttons">
                <button className="mobile-auth-btn login-btn" onClick={() => { onLogin(); toggleMobileMenu(); }}>
                  Log In
                </button>
                <button className="mobile-auth-btn signup-btn" onClick={() => { onSignUp(); toggleMobileMenu(); }}>
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;