import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { quizGenerationService } from '../services/quizGenerationService';
import { quizPersistenceService } from '../services/quizPersistenceService';
import './Quiz.css';

const Quiz = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bases, setBases] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Quiz configuration state
  const [quizConfig, setQuizConfig] = useState({
    quizName: '',
    difficulty: 'medium',
    totalMcqs: 5,
    totalSaqs: 3,
    totalLaqs: 2
  });

  useEffect(() => {
    if (user) {
      quizPersistenceService.setCurrentUser(user.id);
      loadUserBases();
    }
  }, [user]);

  const loadUserBases = async () => {
    try {
      setIsLoading(true);
      setError('');

      // First, get all bases for the user
      const { data: basesData, error: basesError } = await supabase
        .from('bases')
        .select(`
          id,
          name,
          created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (basesError) throw basesError;

      if (!basesData || basesData.length === 0) {
        setBases([]);
        return;
      }

      // Get all files for these bases
      const baseIds = basesData.map(base => base.id);
      const { data: filesData, error: filesError } = await supabase
        .from('base_files')
        .select(`
          id,
          base_id,
          file_name,
          file_type,
          uploaded_at
        `)
        .in('base_id', baseIds)
        .eq('file_type', 'application/pdf')
        .order('uploaded_at', { ascending: false });

      if (filesError) throw filesError;

      if (!filesData || filesData.length === 0) {
        setBases([]);
        return;
      }

      // Get PDF text content status for these files
      const fileIds = filesData.map(file => file.id);
      const { data: textData, error: textError } = await supabase
        .from('pdf_text_content')
        .select(`
          file_id,
          status
        `)
        .in('file_id', fileIds);

      if (textError) {
        console.warn('Error loading PDF text content:', textError);
        // Don't throw error, just continue with empty text data
      }

      // Create a map of file IDs to their processing status
      const fileStatusMap = new Map();
      (textData || []).forEach(item => {
        fileStatusMap.set(item.file_id, item.status);
      });

      console.log('PDF files found:', filesData.length);
      console.log('Text extraction records found:', textData?.length || 0);
      console.log('File status map:', fileStatusMap);

      // Combine bases with their files (show all PDF files, not just processed ones)
      const basesWithFiles = basesData.map(base => {
        const baseFiles = filesData
          .filter(file => file.base_id === base.id)
          .map(file => ({
            ...file,
            pdf_text_content: { 
              status: fileStatusMap.get(file.id) || 'not_processed' 
            }
          }));

        return {
          ...base,
          base_files: baseFiles
        };
      }).filter(base => base.base_files.length > 0);

      setBases(basesWithFiles);
      console.log(`Loaded ${basesWithFiles.length} bases with PDF files`);

    } catch (error) {
      console.error('Error loading bases:', error);
      setError('Failed to load your bases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelection = (fileId, isSelected) => {
    setSelectedFiles(prev => {
      if (isSelected) {
        return [...prev, fileId];
      } else {
        return prev.filter(id => id !== fileId);
      }
    });
  };

  const handleBaseSelection = (baseId, isSelected) => {
    const base = bases.find(b => b.id === baseId);
    if (!base) return;

    const fileIds = base.base_files.map(file => file.id);
    
    setSelectedFiles(prev => {
      if (isSelected) {
        // Add all files from this base
        const newFiles = fileIds.filter(id => !prev.includes(id));
        return [...prev, ...newFiles];
      } else {
        // Remove all files from this base
        return prev.filter(id => !fileIds.includes(id));
      }
    });
  };

  const handleConfigChange = (field, value) => {
    setQuizConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateConfig = () => {
    const validation = quizGenerationService.validateQuizConfig(quizConfig);
    if (!validation.valid) {
      setError(validation.error);
      return false;
    }

    if (selectedFiles.length === 0) {
      setError('Please select at least one file to generate questions from.');
      return false;
    }

    return true;
  };

  const handleGenerateQuiz = async () => {
    try {
      if (!validateConfig()) return;

      setIsGenerating(true);
      setError('');
      setSuccess('');

      console.log('Starting quiz generation...');
      console.log('Selected files:', selectedFiles);
      console.log('Quiz config:', quizConfig);

      // Generate questions using LLM
      const generationResult = await quizGenerationService.generateQuiz(selectedFiles, quizConfig);
      
      if (!generationResult.success) {
        throw new Error(generationResult.error);
      }

      console.log(`Generated ${generationResult.questions.length} questions`);

      // Save quiz to database
      const saveResult = await quizPersistenceService.createQuiz(
        quizConfig,
        generationResult.questions,
        selectedFiles
      );

      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }

      console.log('Quiz saved successfully:', saveResult.quizId);
      setSuccess('Quiz generated successfully! Redirecting to quiz...');

      // Navigate to quiz taking page
      setTimeout(() => {
        navigate(`/quiz/take/${saveResult.quizId}`);
      }, 1500);

    } catch (error) {
      console.error('Error generating quiz:', error);
      setError(error.message || 'Failed to generate quiz. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getTotalQuestions = () => {
    return quizConfig.totalMcqs + quizConfig.totalSaqs + quizConfig.totalLaqs;
  };

  const getTotalMarks = () => {
    return (quizConfig.totalMcqs * 1) + (quizConfig.totalSaqs * 3) + (quizConfig.totalLaqs * 5);
  };

  if (isLoading) {
    return (
      <div className="quiz-container">
        <div className="quiz-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <div className="quiz-loading">
          <div className="loading-spinner"></div>
          <p>Loading your bases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="quiz-content">
        <div className="quiz-header">
          <h1>Create New Quiz</h1>
          <p>Select files and configure your quiz settings</p>
        </div>

        {error && (
          <div className="quiz-error">
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="quiz-success">
            <p>{success}</p>
          </div>
        )}

        <div className="quiz-sections">
          {/* File Selection Section */}
          <div className="quiz-section">
            <h2>Select Files</h2>
            <p className="section-description">
              Choose the PDF files you want to generate questions from. Only files with completed text extraction can be selected.
            </p>
            
            {bases.length === 0 ? (
              <div className="no-bases">
                <div className="no-bases-icon">📚</div>
                <h3>No PDF Files Found</h3>
                <p>You need to upload PDF files to your bases first. The system will automatically extract text from them for quiz generation.</p>
                <button 
                  className="btn-primary"
                  onClick={() => navigate('/new-base')}
                >
                  Create New Base
                </button>
              </div>
            ) : (
              <div className="file-selection">
                <div className="selection-summary">
                  <span className="selected-count">
                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                  </span>
                </div>

                <div className="bases-list">
                  {bases.map(base => {
                    const isBaseSelected = base.base_files.every(file => selectedFiles.includes(file.id));
                    const hasSelectedFiles = base.base_files.some(file => selectedFiles.includes(file.id));
                    
                    return (
                      <div key={base.id} className={`base-group ${isBaseSelected ? 'selected' : hasSelectedFiles ? 'partially-selected' : ''}`}>
                        <div className="base-header">
                          <label className="base-checkbox">
                            <input
                              type="checkbox"
                              checked={isBaseSelected}
                              onChange={(e) => handleBaseSelection(base.id, e.target.checked)}
                            />
                          <span className="checkmark"></span>
                          <span className="base-name">{base.name}</span>
                          <span className="file-count">({base.base_files.length} files)</span>
                        </label>
                      </div>

                      <div className="files-list">
                        {base.base_files.map(file => {
                          const isProcessed = file.pdf_text_content?.status === 'completed';
                          const isProcessing = file.pdf_text_content?.status === 'processing';
                          const hasFailed = file.pdf_text_content?.status === 'failed';
                          const isNotProcessed = !file.pdf_text_content || file.pdf_text_content?.status === 'not_processed';
                          
                          const isSelected = selectedFiles.includes(file.id);
                          
                          return (
                            <label key={file.id} className={`file-item ${!isProcessed ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleFileSelection(file.id, e.target.checked)}
                                disabled={!isProcessed}
                              />
                              <span className="checkmark"></span>
                              <span className="file-icon">📄</span>
                              <span className="file-name">{file.file_name}</span>
                              <span className={`file-status ${isProcessed ? 'processed' : isProcessing ? 'processing' : hasFailed ? 'failed' : 'not-processed'}`}>
                                {isProcessed ? '✓ Ready' : 
                                 isProcessing ? '⏳ Processing...' : 
                                 hasFailed ? '❌ Failed' : 
                                 '⏸️ Not Processed'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quiz Configuration Section */}
          <div className="quiz-section">
            <h2>Quiz Configuration</h2>
            
            <div className="config-form">
              <div className="form-group">
                <label htmlFor="quizName">Quiz Name</label>
                <input
                  type="text"
                  id="quizName"
                  value={quizConfig.quizName}
                  onChange={(e) => handleConfigChange('quizName', e.target.value)}
                  placeholder="Enter quiz name"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="difficulty">Difficulty Level</label>
                <select
                  id="difficulty"
                  value={quizConfig.difficulty}
                  onChange={(e) => handleConfigChange('difficulty', e.target.value)}
                  className="form-select"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="question-counts">
                <div className="form-group">
                  <label htmlFor="totalMcqs">Multiple Choice Questions</label>
                  <input
                    type="number"
                    id="totalMcqs"
                    value={quizConfig.totalMcqs}
                    onChange={(e) => handleConfigChange('totalMcqs', parseInt(e.target.value) || 1)}
                    min="1"
                    max="20"
                    className="form-input"
                  />
                  <span className="marks-info">1 mark each</span>
                </div>

                <div className="form-group">
                  <label htmlFor="totalSaqs">Short Answer Questions</label>
                  <input
                    type="number"
                    id="totalSaqs"
                    value={quizConfig.totalSaqs}
                    onChange={(e) => handleConfigChange('totalSaqs', parseInt(e.target.value) || 1)}
                    min="1"
                    max="20"
                    className="form-input"
                  />
                  <span className="marks-info">3 marks each</span>
                </div>

                <div className="form-group">
                  <label htmlFor="totalLaqs">Long Answer Questions</label>
                  <input
                    type="number"
                    id="totalLaqs"
                    value={quizConfig.totalLaqs}
                    onChange={(e) => handleConfigChange('totalLaqs', parseInt(e.target.value) || 1)}
                    min="1"
                    max="20"
                    className="form-input"
                  />
                  <span className="marks-info">5 marks each</span>
                </div>
              </div>

              <div className="quiz-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Questions:</span>
                  <span className="summary-value">{getTotalQuestions()}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Marks:</span>
                  <span className="summary-value">{getTotalMarks()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="quiz-actions">
            <button
              className={`btn-primary btn-generate ${isGenerating ? 'loading' : ''}`}
              onClick={handleGenerateQuiz}
              disabled={isGenerating || selectedFiles.length === 0 || getTotalQuestions() === 0}
            >
              {isGenerating ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Generating Quiz...
                </>
              ) : (
                <>
                  <span className="btn-icon">🎯</span>
                  Generate Quiz
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
