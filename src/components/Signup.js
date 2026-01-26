import React, { useState } from 'react';
import './AuthForm.css';
import { useAuth } from '../contexts/AuthContext';

const Signup = ({ onSwitchToLogin, onClose }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signUp } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await signUp(formData.email, formData.password, formData.fullName);
      
      if (result.success) {
        setSuccess(result.message);
        // Don't close modal immediately - user needs to see the success message
        // The modal will close when they click the close button or switch to login
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon">🚀</div>
            <h2 className="auth-title">Join StudyBase</h2>
            <p className="auth-subtitle">Create your account and start studying smarter</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            {success && (
              <div className="success-message">
                {success}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="Create a password"
                required
              />
            </div>

            <div className="form-options">
              <label className="checkbox-container">
                <input type="checkbox" required />
                <span className="checkmark"></span>
                I agree to the Terms of Service and Privacy Policy
              </label>
            </div>

            <button type="submit" className="auth-button primary" disabled={isLoading}>
              {isLoading ? (
                <div className="loading-spinner"></div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? 
              <button className="switch-link" onClick={onSwitchToLogin}>
                Sign in here
              </button>
            </p>
          </div>

          <button className="close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
