import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ theme, toggleTheme, isAuthenticated, onLogin, onSignUp, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileAuthOpen, setIsMobileAuthOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setIsMobileAuthOpen(false); // Close auth dropdown when menu opens
  };

  const toggleMobileAuth = () => {
    setIsMobileAuthOpen(!isMobileAuthOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleProfileAction = (action) => {
    if (action === 'logout') {
      onLogout();
    } else if (action === 'account') {
      navigate('/my-account');
    } else if (action === 'dashboard') {
      navigate('/');
    }
    setIsProfileDropdownOpen(false);
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
            <li><a href="#home" className="nav-link" onClick={() => navigate('/')}>Home</a></li>
            <li><a href="#new-base" className="nav-link" onClick={() => navigate('/new-base')}>New Base</a></li>
            <li><a href="#my-bases" className="nav-link" onClick={() => navigate('/my-bases')}>My Bases</a></li>
            <li><a href="#chat" className="nav-link">Quiz</a></li>
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
            // Authenticated User - Show Profile Icon with Dropdown
            <div className="profile-section">
              <div 
                className="profile-icon" 
                onClick={toggleProfileDropdown}
                onMouseEnter={() => setIsProfileDropdownOpen(true)}
                onMouseLeave={() => setIsProfileDropdownOpen(false)}
              >
                <div className="profile-avatar">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
              
              {/* Profile Dropdown */}
              <div 
                className={`profile-dropdown ${isProfileDropdownOpen ? 'active' : ''}`}
                onMouseEnter={() => setIsProfileDropdownOpen(true)}
                onMouseLeave={() => setIsProfileDropdownOpen(false)}
              >
                <div className="dropdown-item" onClick={() => handleProfileAction('dashboard')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z" fill="currentColor"/>
                  </svg>
                  Dashboard
                </div>
                <div className="dropdown-item" onClick={() => handleProfileAction('account')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  My Account
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item logout" onClick={() => handleProfileAction('logout')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.59L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="currentColor"/>
                  </svg>
                  Sign Out
                </div>
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
            <li><a href="#home" className="mobile-nav-link" onClick={() => { navigate('/'); toggleMobileMenu(); }}>Home</a></li>
            <li><a href="#new-base" className="mobile-nav-link" onClick={() => { navigate('/new-base'); toggleMobileMenu(); }}>New Base</a></li>
            <li><a href="#my-bases" className="mobile-nav-link" onClick={() => { navigate('/my-bases'); toggleMobileMenu(); }}>My Bases</a></li>
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