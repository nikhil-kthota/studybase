import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './BaseView.css';

const BaseView = () => {
  const { baseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [base, setBase] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileViewerUrl, setFileViewerUrl] = useState(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBaseData = async () => {
      if (!user || !baseId) return;
      
      setIsLoading(true);
      setError('');
      
      try {
        // Load base information
        const { data: baseData, error: baseError } = await supabase
          .from('bases')
          .select('*')
          .eq('id', baseId)
          .eq('user_id', user.id)
          .single();

        if (baseError) throw baseError;
        if (!baseData) {
          setError('Base not found or access denied');
          return;
        }

        setBase(baseData);

        // Load base files (sorted by upload date - latest first)
        const { data: filesData, error: filesError } = await supabase
          .from('base_files')
          .select('*')
          .eq('base_id', baseId)
          .order('uploaded_at', { ascending: false });

        if (filesError) throw filesError;
        setFiles(filesData || []);

      } catch (err) {
        console.error('Error loading base data:', err);
        setError('Failed to load base data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadBaseData();
  }, [user, baseId]);

  // Refresh data when component becomes visible (e.g., navigating back from EditBase)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && baseId) {
        // Reload data when page becomes visible
        const loadBaseData = async () => {
          try {
            const { data: filesData, error: filesError } = await supabase
              .from('base_files')
              .select('*')
              .eq('base_id', baseId)
              .order('uploaded_at', { ascending: false });

            if (!filesError && filesData) {
              setFiles(filesData);
            }
          } catch (err) {
            console.error('Error refreshing base data:', err);
          }
        };
        
        loadBaseData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, baseId]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📽️';
    return '📁';
  };

  const handleFileClick = async (file) => {
    setSelectedFile(file);
    setIsLoadingFile(true);
    setFileViewerUrl(null);
    
    try {
      // Get signed URL for file viewing
      const { data, error } = await supabase.storage
        .from('files')
        .createSignedUrl(file.file_path, 3600); // 1 hour expiry

      if (error) throw error;
      
      setFileViewerUrl(data.signedUrl);
    } catch (err) {
      console.error('Error loading file:', err);
      setError('Failed to load file. Please try again.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleChatClick = () => {
    console.log('Chat clicked for base:', base?.name);
    // TODO: Implement chat functionality
  };

  const handleQuizClick = () => {
    console.log('Quiz clicked for base:', base?.name);
    // TODO: Implement quiz functionality
  };

  const handleYouTubeClick = () => {
    console.log('YouTube suggestions clicked for base:', base?.name);
    // TODO: Implement YouTube suggestions functionality
  };

  if (isLoading) {
    return (
      <div className="base-view">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading base...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="base-view">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error</h3>
          <p>{error}</p>
          <button className="back-btn" onClick={() => navigate('/my-bases')}>
            Back to My Bases
          </button>
        </div>
      </div>
    );
  }

  if (!base) {
    return (
      <div className="base-view">
        <div className="error-container">
          <div className="error-icon">📁</div>
          <h3>Base Not Found</h3>
          <p>The requested base could not be found.</p>
          <button className="back-btn" onClick={() => navigate('/my-bases')}>
            Back to My Bases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="base-view">
      <div className="base-view-container">
        {/* Header */}
        <div className="base-header">
          <div className="base-info">
            <div className="base-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z" fill="currentColor"/>
              </svg>
            </div>
            <div className="base-details">
              <h1 className="base-name">{base.name}</h1>
              <p className="base-meta">
                Created {new Date(base.created_at).toLocaleDateString()} • {files.length} files
              </p>
            </div>
          </div>
          <button className="back-to-bases-btn" onClick={() => navigate('/my-bases')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Bases
          </button>
        </div>

        {/* Main Content */}
        <div className="base-content">
          {/* Files Strip */}
          <div className="files-strip-section">
            <div className="section-header">
              <h2 className="section-title">Files</h2>
              <button 
                className="edit-files-btn"
                onClick={() => navigate(`/edit-base/${baseId}`)}
                title="Edit files in this base"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2"/>
                  <path d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Edit
              </button>
            </div>
            {files.length > 0 ? (
              <div className="files-strip">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className={`file-card ${selectedFile?.id === file.id ? 'selected' : ''}`}
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="file-card-icon">{getFileIcon(file.file_type)}</div>
                    <div className="file-card-info">
                      <div className="file-card-name">{file.file_name}</div>
                      <div className="file-card-details">
                        {formatFileSize(file.file_size)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-files">
                <div className="no-files-icon">📁</div>
                <h3>No files uploaded</h3>
                <p>Upload files to this base to get started.</p>
              </div>
            )}
          </div>

          {/* Chat and Viewer Section */}
          <div className="chat-viewer-section">
            {/* Chat Module */}
            <div className="chat-section">
              <h2 className="section-title">Chat</h2>
              <div className="chat-container">
                <div className="chat-messages">
                  <div className="chat-welcome">
                    <div className="welcome-icon">💬</div>
                    <h3>Start a conversation</h3>
                    <p>Ask questions about your files or get help with your studies.</p>
                  </div>
                </div>
                <div className="chat-input-container">
                  <div className="chat-input-wrapper">
                    <input
                      type="text"
                      placeholder="Ask a question about your files..."
                      className="chat-input"
                      disabled
                    />
                    <button className="chat-send-btn" disabled>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <p className="chat-disabled-note">Chat functionality coming soon!</p>
                </div>
              </div>
            </div>

            {/* File Viewer */}
            <div className="file-viewer-section">
              <h2 className="section-title">File Viewer</h2>
              {isLoadingFile ? (
                <div className="viewer-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading file...</p>
                </div>
              ) : fileViewerUrl ? (
                <div className="file-viewer">
                  {selectedFile?.file_type.includes('pdf') ? (
                    <iframe
                      src={fileViewerUrl}
                      className="pdf-viewer"
                      title={selectedFile.file_name}
                    />
                  ) : selectedFile?.file_type.includes('image') ? (
                    <img
                      src={fileViewerUrl}
                      alt={selectedFile.file_name}
                      className="image-viewer"
                    />
                  ) : (
                    <div className="unsupported-file">
                      <div className="unsupported-icon">📄</div>
                      <h3>File Preview Not Available</h3>
                      <p>This file type cannot be previewed in the browser.</p>
                      <a 
                        href={fileViewerUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="open-external-btn"
                      >
                        Open in New Tab
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-file-selected">
                  <div className="no-file-icon">👆</div>
                  <h3>Select a file to view</h3>
                  <p>Click on a file from the list to preview it here.</p>
                </div>
              )}
            </div>
          </div>

          {/* Study Options Section */}
          <div className="options-section">
            <h2 className="section-title">Study Options</h2>
            <div className="options-grid">
              <button className="option-btn quiz-btn" onClick={handleQuizClick}>
                <div className="option-icon">🧠</div>
                <div className="option-content">
                  <h3>Quiz</h3>
                  <p>Test your knowledge</p>
                </div>
              </button>

              <button className="option-btn youtube-btn" onClick={handleYouTubeClick}>
                <div className="option-icon">📺</div>
                <div className="option-content">
                  <h3>YouTube Suggestions</h3>
                  <p>Related educational content</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseView;
