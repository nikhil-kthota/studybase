import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { quizPersistenceService } from '../services/quizPersistenceService';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [stats, setStats] = useState(null);
  const [recentPerformance, setRecentPerformance] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      quizPersistenceService.setCurrentUser(user.id);
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Load all data in parallel
      const [statsResult, performanceResult, quizzesResult] = await Promise.all([
        quizPersistenceService.getUserQuizStats(),
        quizPersistenceService.getRecentQuizPerformance(),
        quizPersistenceService.getUserQuizzes()
      ]);

      if (statsResult.success) {
        console.log('Dashboard stats loaded:', statsResult.stats);
        setStats(statsResult.stats);
      } else {
        console.error('Failed to load stats:', statsResult.error);
      }

      if (performanceResult.success) {
        setRecentPerformance(performanceResult.performance);
      }

      if (quizzesResult.success) {
        setQuizzes(quizzesResult.quizzes);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 80) return '#63ff63';
    if (percentage >= 60) return '#ffd700';
    if (percentage >= 40) return '#ffa500';
    return '#ff6363';
  };

  const getGradeText = (percentage) => {
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleQuizClick = (quizId) => {
    navigate(`/quiz/results/${quizId}`);
  };

  const handleCreateQuiz = () => {
    navigate('/quiz');
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="dashboard-content">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Dashboard</h1>
            <p>Track your quiz performance and progress</p>
          </div>
          <button className="btn-primary" onClick={handleCreateQuiz}>
            Create New Quiz
          </button>
        </div>

        {error && (
          <div className="dashboard-error">
            <p>{error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="stats-section">
          <h2>Your Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{stats?.total_quizzes || 0}</div>
                <div className="stat-label">Quizzes Taken</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">❓</div>
              <div className="stat-content">
                <div className="stat-value">{stats?.total_questions_attempted || 0}</div>
                <div className="stat-label">Questions Attempted</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <div className="stat-value">{Math.round(stats?.average_percentage || 0)}%</div>
                <div className="stat-label">Average Score</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <div className="stat-value">{stats?.total_marks_obtained || 0}</div>
                <div className="stat-label">Total Marks</div>
                <div className="stat-detail">out of {stats?.total_possible_marks || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        {recentPerformance.length > 0 && (
          <div className="performance-section">
            <h2>Recent Performance</h2>
            <div className="performance-chart">
              <div className="chart-container">
                <div className="chart-bars">
                  {recentPerformance.map((quiz, index) => {
                    const height = Math.max(quiz.percentage, 10); // Minimum height for visibility
                    const gradeColor = getGradeColor(quiz.percentage);
                    
                    return (
                      <div key={quiz.quiz_id} className="chart-bar-container">
                        <div 
                          className="chart-bar"
                          style={{ 
                            height: `${height}%`,
                            backgroundColor: gradeColor
                          }}
                          title={`${quiz.quiz_name}: ${quiz.percentage}%`}
                        >
                          <div className="bar-value">{quiz.percentage}%</div>
                        </div>
                        <div className="bar-label">
                          <div className="quiz-name">{quiz.quiz_name}</div>
                          <div className="quiz-date">{formatDate(quiz.completed_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="chart-axis">
                  <div className="axis-label">Quiz Performance (%)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quiz History */}
        <div className="quizzes-section">
          <h2>Quiz History</h2>
          {quizzes.length === 0 ? (
            <div className="no-quizzes">
              <div className="no-quizzes-icon">📚</div>
              <h3>No Quizzes Yet</h3>
              <p>Create your first quiz to start tracking your progress!</p>
              <button className="btn-primary" onClick={handleCreateQuiz}>
                Create Your First Quiz
              </button>
            </div>
          ) : (
            <div className="quizzes-list">
              {quizzes.map(quiz => {
                const gradeColor = getGradeColor(quiz.percentage);
                const gradeText = getGradeText(quiz.percentage);
                
                return (
                  <div 
                    key={quiz.id} 
                    className="quiz-card"
                    onClick={() => handleQuizClick(quiz.id)}
                  >
                    <div className="quiz-header">
                      <div className="quiz-info">
                        <h3>{quiz.quiz_name}</h3>
                        <div className="quiz-meta">
                          <span className="difficulty-badge">{quiz.difficulty}</span>
                          <span className="quiz-date">{formatDate(quiz.created_at)}</span>
                        </div>
                      </div>
                      <div className="quiz-status">
                        <span className={`status-badge ${quiz.status}`}>
                          {quiz.status === 'completed' ? 'Completed' : 
                           quiz.status === 'in_progress' ? 'In Progress' : 
                           quiz.status === 'ready' ? 'Ready' : 'Generating'}
                        </span>
                      </div>
                    </div>
                    
                    {quiz.status === 'completed' && (
                      <div className="quiz-results">
                        <div className="result-item">
                          <span className="result-label">Score:</span>
                          <span className="result-value" style={{ color: gradeColor }}>
                            {quiz.percentage}%
                          </span>
                          <span className="result-grade" style={{ color: gradeColor }}>
                            {gradeText}
                          </span>
                        </div>
                        <div className="result-item">
                          <span className="result-label">Marks:</span>
                          <span className="result-value">{quiz.marks_obtained}/{quiz.total_marks}</span>
                        </div>
                        <div className="result-item">
                          <span className="result-label">Questions:</span>
                          <span className="result-value">
                            {quiz.total_mcqs + quiz.total_saqs + quiz.total_laqs}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="quiz-actions">
                      <span className="view-results">View Results →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Questions Attempted Summary */}
        {stats && stats.total_questions_attempted > 0 && (
          <div className="questions-summary">
            <h2>Questions Summary</h2>
            <div className="summary-content">
              <div className="summary-stats">
                <div className="summary-item">
                  <span className="summary-label">Total Questions Attempted:</span>
                  <span className="summary-value">{stats.total_questions_attempted}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Average Performance:</span>
                  <span className="summary-value">{Math.round(stats.average_percentage)}%</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Quizzes:</span>
                  <span className="summary-value">{stats.total_quizzes}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
