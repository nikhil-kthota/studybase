import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { quizPersistenceService } from '../services/quizPersistenceService';
import { quizEvaluationService } from '../services/quizEvaluationService';
import { supabase } from '../lib/supabase';
import './QuizTaking.css';

const QuizTaking = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);
  const [error, setError] = useState('');
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  const [userAnswers, setUserAnswers] = useState({});

  useEffect(() => {
    if (user && quizId) {
      quizPersistenceService.setCurrentUser(user.id);
      loadQuiz();
    }
  }, [user, quizId]);

  const loadQuiz = async () => {
    try {
      setIsLoading(true);
      setError('');

      const result = await quizPersistenceService.getQuiz(quizId);
      if (!result.success) {
        throw new Error(result.error);
      }

      setQuiz(result.quiz);

      // Load answered questions
      const answeredResult = await quizPersistenceService.getAnsweredQuestions(quizId);
      if (answeredResult.success) {
        setAnsweredQuestions(new Set(answeredResult.answeredQuestions));
      }

      // Update quiz status to in_progress if it's ready
      if (result.quiz.status === 'ready') {
        await quizPersistenceService.updateQuizProgress(quizId, { status: 'in_progress' });
      }

    } catch (error) {
      console.error('Error loading quiz:', error);
      setError('Failed to load quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (value) => {
    setUserAnswer(value);
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      setError('Please provide an answer before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const currentQuestion = quiz.questions[currentQuestionIndex];
      
      // Evaluate the answer
      const evaluation = await quizEvaluationService.evaluateAnswer(
        currentQuestion.question_type,
        userAnswer,
        {
          correctAnswer: currentQuestion.correct_answer,
          correctOptionNumber: currentQuestion.correct_option_number,
          questionText: currentQuestion.question_text
        }
      );

      // Save answer to database
      const saveResult = await quizPersistenceService.saveAnswer(
        quizId,
        currentQuestion.id,
        userAnswer,
        evaluation
      );

      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }

      // Update local state
      setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id]));
      setUserAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: {
          answer: userAnswer,
          evaluation: evaluation
        }
      }));

      // Move to next question or show completion
      if (currentQuestionIndex < quiz.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setUserAnswer('');
      } else {
        // Last question - show submit test option
        setError('');
      }

    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTest = async () => {
    try {
      setIsSubmittingTest(true);
      setError('');

      // Fetch all saved answers from database to calculate accurate total
      const { data: savedAnswers, error: answersError } = await supabase
        .from('quiz_answers')
        .select('marks_obtained')
        .eq('quiz_id', quizId);

      if (answersError) {
        throw new Error('Failed to fetch saved answers');
      }

      // Calculate total marks from all saved answers
      let totalMarksObtained = 0;
      if (savedAnswers && savedAnswers.length > 0) {
        totalMarksObtained = savedAnswers.reduce((sum, answer) => sum + (answer.marks_obtained || 0), 0);
      }

      const percentage = Math.round((totalMarksObtained / quiz.total_marks) * 100);

      console.log(`Final scoring: ${totalMarksObtained}/${quiz.total_marks} = ${percentage}%`);

      // Update quiz with final results
      await quizPersistenceService.updateQuizProgress(quizId, {
        status: 'completed',
        marks_obtained: totalMarksObtained,
        percentage: percentage,
        completed_at: new Date().toISOString()
      });

      // Navigate to results page
      navigate(`/quiz/results/${quizId}`);

    } catch (error) {
      console.error('Error submitting test:', error);
      setError('Failed to submit test. Please try again.');
    } finally {
      setIsSubmittingTest(false);
    }
  };

  const handleQuestionNavigation = (index) => {
    if (index >= 0 && index < quiz.questions.length) {
      setCurrentQuestionIndex(index);
      setUserAnswer('');
      
      // Load existing answer if available
      const questionId = quiz.questions[index].id;
      if (userAnswers[questionId]) {
        setUserAnswer(userAnswers[questionId].answer);
      }
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

  const getQuestionMarks = (type) => {
    switch (type) {
      case 'mcq': return 1;
      case 'saq': return 3;
      case 'laq': return 5;
      default: return 0;
    }
  };

  if (isLoading) {
    return (
      <div className="quiz-taking-container">
        <div className="quiz-taking-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <div className="quiz-loading">
          <div className="loading-spinner"></div>
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="quiz-taking-container">
        <div className="quiz-taking-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <div className="quiz-error">
          <h2>Quiz Not Found</h2>
          <p>The quiz you're looking for doesn't exist or you don't have permission to access it.</p>
          <button className="btn-primary" onClick={() => navigate('/quiz')}>
            Back to Quiz Creation
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const isQuestionAnswered = answeredQuestions.has(currentQuestion.id);

  return (
    <div className="quiz-taking-container">
      <div className="quiz-taking-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="quiz-taking-content">
        {/* Quiz Header */}
        <div className="quiz-header">
          <div className="quiz-info">
            <h1>{quiz.quiz_name}</h1>
            <p>Difficulty: <span className="difficulty-badge">{quiz.difficulty}</span></p>
          </div>
          <div className="quiz-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
              ></div>
            </div>
            <span className="progress-text">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </span>
          </div>
        </div>

        {/* Question Navigation */}
        <div className="question-navigation">
          <div className="nav-grid">
            {quiz.questions.map((question, index) => (
              <button
                key={question.id}
                className={`nav-item ${index === currentQuestionIndex ? 'active' : ''} ${answeredQuestions.has(question.id) ? 'answered' : ''}`}
                onClick={() => handleQuestionNavigation(index)}
              >
                <span className="nav-number">{index + 1}</span>
                <span className="nav-type">{question.question_type.toUpperCase()}</span>
                {answeredQuestions.has(question.id) && (
                  <span className="nav-check">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Current Question */}
        <div className="question-section">
          <div className="question-header">
            <div className="question-type">
              {getQuestionTypeLabel(currentQuestion.question_type)}
              <span className="question-marks">({getQuestionMarks(currentQuestion.question_type)} marks)</span>
            </div>
            {isQuestionAnswered && (
              <div className="answered-badge">Answered</div>
            )}
          </div>

          <div className="question-content">
            <h2>{currentQuestion.question_text}</h2>

            {/* MCQ Options */}
            {currentQuestion.question_type === 'mcq' && currentQuestion.options && (
              <div className="mcq-options">
                {Object.entries(currentQuestion.options).map(([optionNumber, optionText]) => (
                  <label key={optionNumber} className="option-item">
                    <input
                      type="radio"
                      name="mcq-answer"
                      value={optionNumber}
                      checked={userAnswer === optionNumber}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                    />
                    <span className="option-number">{optionNumber})</span>
                    <span className="option-text">{optionText}</span>
                  </label>
                ))}
              </div>
            )}

            {/* SAQ/LAQ Input */}
            {(currentQuestion.question_type === 'saq' || currentQuestion.question_type === 'laq') && (
              <div className="text-answer">
                <textarea
                  value={userAnswer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder={`Enter your ${currentQuestion.question_type === 'saq' ? 'short' : 'detailed'} answer here...`}
                  className="answer-textarea"
                  rows={currentQuestion.question_type === 'laq' ? 8 : 4}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="quiz-error">
              <p>{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="question-actions">
            {!isLastQuestion ? (
              <button
                className={`btn-primary ${isSubmitting ? 'loading' : ''}`}
                onClick={handleSubmitAnswer}
                disabled={isSubmitting || !userAnswer.trim()}
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner-small"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Answer'
                )}
              </button>
            ) : (
              <div className="final-actions">
                <button
                  className={`btn-primary ${isSubmitting ? 'loading' : ''}`}
                  onClick={handleSubmitAnswer}
                  disabled={isSubmitting || !userAnswer.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <div className="loading-spinner-small"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Answer'
                  )}
                </button>
                
                {isQuestionAnswered && (
                  <button
                    className={`btn-success ${isSubmittingTest ? 'loading' : ''}`}
                    onClick={handleSubmitTest}
                    disabled={isSubmittingTest}
                  >
                    {isSubmittingTest ? (
                      <>
                        <div className="loading-spinner-small"></div>
                        Submitting Test...
                      </>
                    ) : (
                      'Submit Test'
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quiz Summary */}
        <div className="quiz-summary">
          <div className="summary-item">
            <span className="summary-label">Total Questions:</span>
            <span className="summary-value">{quiz.questions.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Answered:</span>
            <span className="summary-value">{answeredQuestions.size}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Marks:</span>
            <span className="summary-value">{quiz.total_marks}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizTaking;
