import React from 'react';
import './HeroSection.css';

const HeroSection = () => {
  return (
    <section className="hero-section">
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title" align = "left">
              Welcome to <span className="gradient-text">StudyBase</span>
            </h1>
            <p className="hero-subtitle">
            Your personal learning hub built for focused, organized study sessions.
            </p>
            <div className="hero-description">
              <p>
              Each “Base” is a space where you can upload course material,
               chat with an AI tutor, and generate quizzes to test your understanding.
               Create multiple Bases for different subjects, track your progress, and revisit topics whenever you need.
              </p>
              <p>
              StudyBase is built to make learning interactive and enjoyable.
              You can ask questions, get quick explanations, and review important concepts at your own pace.
              The quiz engine helps you understand how well you know the material, 
              while progress tracking highlights your strengths and areas that need more attention.
              </p>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-container">
              <div className="main-card">
                <div className="card-icon">📚</div>
                <h3>StudyBase Platform</h3>
                <p>Your comprehensive learning hub</p>
              </div>
              
              <div className="floating-elements">
                <div className="floating-icon icon-1">🎯</div>
                <div className="floating-icon icon-2">⚡</div>
                <div className="floating-icon icon-3">🔗</div>
                <div className="floating-icon icon-4">📊</div>
                <div className="floating-icon icon-5">💡</div>
                <div className="floating-icon icon-6">🚀</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="hero-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
    </section>
  );
};

export default HeroSection;
