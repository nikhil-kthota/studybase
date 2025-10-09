import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { quizPersistenceService } from '../services/quizPersistenceService';
import './QuizResults.css';

const QuizResults = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && quizId) {
      quizPersistenceService.setCurrentUser(user.id);
      loadQuizResults();
    }
  }, [user, quizId]);

  const loadQuizResults = async () => {
    try {
      setIsLoading(true);
      setError('');

      const result = await quizPersistenceService.getQuizResults(quizId);
      if (!result.success) {
        throw new Error(result.error);
      }

      setResults(result.results);

    } catch (error) {
      console.error('Error loading quiz results:', error);
      setError('Failed to load quiz results. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getQuestionTypeLabel = (type) => {
    switch (type) {
      case 'mcq': return 'Multiple Choice Question';
      case 'saq': return 'Short Answer Question';
      case 'laq': return 'Long Answer Question';
      default: return 'Question';
    }
  };

  const getCorrectAnswersCount = () => {
    if (!results) return 0;
    return results.answers.filter(answer => answer.is_correct).length;
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

  if (isLoading) {
    return (
      <div className="quiz-results-container">
        <div className="quiz-results-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <div className="quiz-loading">
          <div className="loading-spinner"></div>
          <p>Loading quiz results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-results-container">
        <div className="quiz-results-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <div className="quiz-error">
          <h2>Error Loading Results</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="quiz-results-container">
        <div className="quiz-results-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <div className="quiz-error">
          <h2>Results Not Found</h2>
          <p>The quiz results you're looking for don't exist or you don't have permission to access them.</p>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { quiz, answers } = results;
  const correctAnswersCount = getCorrectAnswersCount();
  const gradeColor = getGradeColor(quiz.percentage);
  const gradeText = getGradeText(quiz.percentage);

  return (
    <div className="quiz-results-container">
      <div className="quiz-results-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="quiz-results-content">
        {/* Results Header */}
        <div className="results-header">
          <div className="results-title">
            <h1>Quiz Results</h1>
            <h2>{quiz.quiz_name}</h2>
            <p>Completed on {new Date(quiz.completed_at).toLocaleDateString()}</p>
          </div>
          
          <div className="results-summary">
            <div className="summary-card">
              <div className="summary-icon">📊</div>
              <div className="summary-content">
                <div className="summary-value" style={{ color: gradeColor }}>
                  {quiz.percentage}%
                </div>
                <div className="summary-label">Overall Score</div>
                <div className="summary-grade" style={{ color: gradeColor }}>
                  {gradeText}
                </div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-icon">✅</div>
              <div className="summary-content">
                <div className="summary-value">{correctAnswersCount}</div>
                <div className="summary-label">Correct Answers</div>
                <div className="summary-detail">out of {quiz.questions.length}</div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-icon">🎯</div>
              <div className="summary-content">
                <div className="summary-value">{quiz.marks_obtained}</div>
                <div className="summary-label">Marks Obtained</div>
                <div className="summary-detail">out of {quiz.total_marks}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Question-by-Question Results */}
        <div className="question-results">
          <h3>Question-by-Question Review</h3>
          
          <div className="results-list">
            {quiz.questions.map((question, index) => {
              const answer = answers.find(a => a.question_id === question.id);
              const isCorrect = answer ? answer.is_correct : false;
              const marksObtained = answer ? answer.marks_obtained : 0;
              const similarityScore = answer ? answer.similarity_score : 0;

              return (
                <div key={question.id} className={`result-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="result-header">
                    <div className="result-question-info">
                      <span className="question-number">Q{question.question_number}</span>
                      <span className="question-type">{getQuestionTypeLabel(question.question_type)}</span>
                      <span className="question-marks">({question.marks} marks)</span>
                    </div>
                    <div className="result-status">
                      {isCorrect ? (
                        <span className="status-correct">✓ Correct</span>
                      ) : (
                        <span className="status-incorrect">✗ Incorrect</span>
                      )}
                      <span className="marks-obtained">{marksObtained}/{question.marks}</span>
                    </div>
                  </div>

                  <div className="result-content">
                    <div className="question-text">
                      <h4>{question.question_text}</h4>
                    </div>

                    {/* MCQ Options Display */}
                    {question.question_type === 'mcq' && question.options && (
                      <div className="mcq-options-display">
                        {Object.entries(question.options).map(([optionNumber, optionText]) => {
                          const isSelected = answer && answer.user_answer === optionNumber;
                          const isCorrectOption = optionNumber === question.correct_option_number.toString();
                          
                          return (
                            <div 
                              key={optionNumber} 
                              className={`option-display ${isSelected ? 'selected' : ''} ${isCorrectOption ? 'correct' : ''}`}
                            >
                              <span className="option-number">{optionNumber})</span>
                              <span className="option-text">{optionText}</span>
                              {isSelected && <span className="option-indicator">Your Answer</span>}
                              {isCorrectOption && <span className="option-indicator correct">Correct Answer</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* SAQ/LAQ Answer Display */}
                    {(question.question_type === 'saq' || question.question_type === 'laq') && (
                      <div className="answer-comparison">
                        <div className="answer-section">
                          <h5>Your Answer:</h5>
                          <div className="answer-text user-answer">
                            {answer ? answer.user_answer : 'No answer provided'}
                          </div>
                        </div>
                        
                        <div className="answer-section">
                          <h5>Correct Answer:</h5>
                          <div className="answer-text correct-answer">
                            {question.correct_answer}
                          </div>
                        </div>

                        {(question.question_type === 'saq' || question.question_type === 'laq') && similarityScore !== null && (
                          <div className="similarity-info">
                            <span className="similarity-label">Similarity Score:</span>
                            <span className="similarity-score">{similarityScore}%</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="explanation-section">
                      <h5>Explanation:</h5>
                      <div className="explanation-text">
                        {question.explanation}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="results-actions">
          <button 
            className="btn-secondary"
            onClick={() => navigate('/quiz')}
          >
            Create New Quiz
          </button>
          <button 
            className="btn-primary"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
