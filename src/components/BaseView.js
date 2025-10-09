import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { chatService } from '../services/chatService';
import { chatPersistenceService } from '../services/chatPersistenceService';
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
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  const [chatError, setChatError] = useState('');
  
  // Chat management state
  const [userChats, setUserChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [showChatList, setShowChatList] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  useEffect(() => {
    const loadBaseData = async () => {
      if (!user || !baseId) return;
      
      setIsLoading(true);
      setError('');
      
      try {
        // Initialize chat persistence service
        chatPersistenceService.setCurrentUser(user.id);
        
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

        // Load user chats for this base
        await loadUserChats();

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

  // Check if selected PDF file has extracted text and enable chat
  useEffect(() => {
    const checkChatAvailability = async () => {
      if (selectedFile && selectedFile.file_type === 'application/pdf') {
        try {
          const hasText = await chatService.hasExtractedText(selectedFile.id);
          setIsChatEnabled(hasText);
          setChatError(hasText ? '' : 'No extracted text available for this PDF. Please wait for text extraction to complete.');
        } catch (error) {
          console.error('Error checking chat availability:', error);
          setIsChatEnabled(false);
          setChatError('Error checking PDF text availability.');
        }
      } else {
        setIsChatEnabled(false);
        setChatError(selectedFile ? 'Chat is only available for PDF files.' : '');
      }
    };

    checkChatAvailability();
  }, [selectedFile]);

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

  // Chat functionality
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !isChatEnabled || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setIsChatLoading(true);
    setChatError('');

    // Create new chat if none exists
    if (!activeChatId) {
      const chatName = selectedFile ? `Chat about ${selectedFile.file_name}` : 'New Chat';
      const result = await chatPersistenceService.createChat(baseId, selectedFile?.id, chatName);
      if (result.success) {
        setActiveChatId(result.chatId);
        await loadUserChats();
      }
    }

    // Add user message to chat
    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, newUserMessage]);

    // Save user message to database
    if (activeChatId) {
      await chatPersistenceService.saveMessage('user', userMessage);
    }

    try {
      // Get AI response
      const result = await chatService.processMessage(selectedFile.id, userMessage);
      
      if (result.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: result.response,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, aiMessage]);

        // Save AI message to database
        if (activeChatId) {
          await chatPersistenceService.saveMessage('ai', result.response);
        }
      } else {
        const errorMessage = {
          id: Date.now() + 1,
          type: 'error',
          content: result.error || 'Sorry, I encountered an error processing your question.',
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, errorMessage]);

        // Save error message to database
        if (activeChatId) {
          await chatPersistenceService.saveMessage('error', result.error || 'Sorry, I encountered an error processing your question.');
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Sorry, I encountered an error processing your question.',
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);

      // Save error message to database
      if (activeChatId) {
        await chatPersistenceService.saveMessage('error', 'Sorry, I encountered an error processing your question.');
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    setChatError('');
  };

  // Chat management functions
  const loadUserChats = async () => {
    setIsLoadingChats(true);
    try {
      const result = await chatPersistenceService.getUserChats(baseId);
      if (result.success) {
        setUserChats(result.chats);
      } else {
        console.error('Error loading chats:', result.error);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const createNewChat = async () => {
    if (!newChatName.trim()) return;
    
    try {
      const result = await chatPersistenceService.createChat(
        baseId, 
        selectedFile?.id, 
        newChatName.trim()
      );
      
      if (result.success) {
        setActiveChatId(result.chatId);
        setChatMessages([]);
        setShowNewChatForm(false);
        setNewChatName('');
        await loadUserChats();
      } else {
        console.error('Error creating chat:', result.error);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const loadChat = async (chatId) => {
    try {
      const result = await chatPersistenceService.getChatMessages(chatId);
      if (result.success) {
        setChatMessages(result.messages);
        setActiveChatId(chatId);
        chatPersistenceService.setCurrentChat(chatId);
        setShowChatList(false);
      } else {
        console.error('Error loading chat:', result.error);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const deleteChat = async (chatId) => {
    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }
    
    try {
      const result = await chatPersistenceService.deleteChat(chatId);
      if (result.success) {
        if (activeChatId === chatId) {
          setActiveChatId(null);
          setChatMessages([]);
          chatPersistenceService.clearCurrentChat();
        }
        await loadUserChats();
      } else {
        console.error('Error deleting chat:', result.error);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const renameChat = async (chatId, newName) => {
    try {
      const result = await chatPersistenceService.updateChatName(chatId, newName);
      if (result.success) {
        await loadUserChats();
      } else {
        console.error('Error renaming chat:', result.error);
      }
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
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
              <div className="chat-header">
                <div className="chat-header-left">
                  <h2 className="section-title">Chat</h2>
                  <div className="chat-controls">
                    <button 
                      className="chat-list-btn" 
                      onClick={() => setShowChatList(!showChatList)}
                      title="Show chat list"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button 
                      className="new-chat-btn" 
                      onClick={() => setShowNewChatForm(!showNewChatForm)}
                      title="Create new chat"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {chatMessages.length > 0 && (
                      <button className="clear-chat-btn" onClick={clearChat} title="Clear current chat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Chat List Sidebar */}
              {showChatList && (
                <div className="chat-list-sidebar">
                  <div className="chat-list-header">
                    <h3>Your Chats</h3>
                    <button 
                      className="close-chat-list-btn" 
                      onClick={() => setShowChatList(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <div className="chat-list">
                    {isLoadingChats ? (
                      <div className="chat-list-loading">
                        <div className="loading-spinner-small"></div>
                        <span>Loading chats...</span>
                      </div>
                    ) : userChats.length > 0 ? (
                      userChats.map((chat) => (
                        <div 
                          key={chat.id} 
                          className={`chat-list-item ${activeChatId === chat.id ? 'active' : ''}`}
                          onClick={() => loadChat(chat.id)}
                        >
                          <div className="chat-item-info">
                            <div className="chat-item-name">{chat.name}</div>
                            <div className="chat-item-meta">
                              {chat.messageCount} messages • {new Date(chat.updatedAt).toLocaleDateString()}
                            </div>
                            {chat.latestMessage && (
                              <div className="chat-item-preview">
                                {chat.latestMessage.content.substring(0, 50)}...
                              </div>
                            )}
                          </div>
                          <div className="chat-item-actions">
                            <button 
                              className="chat-item-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteChat(chat.id);
                              }}
                              title="Delete chat"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-chats">
                        <div className="no-chats-icon">💬</div>
                        <p>No chats yet</p>
                        <p>Start a conversation to create your first chat!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* New Chat Form */}
              {showNewChatForm && (
                <div className="new-chat-form">
                  <div className="new-chat-form-header">
                    <h3>Create New Chat</h3>
                    <button 
                      className="close-new-chat-btn" 
                      onClick={() => setShowNewChatForm(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <div className="new-chat-form-content">
                    <input
                      type="text"
                      placeholder="Enter chat name..."
                      value={newChatName}
                      onChange={(e) => setNewChatName(e.target.value)}
                      className="new-chat-name-input"
                      onKeyPress={(e) => e.key === 'Enter' && createNewChat()}
                    />
                    <div className="new-chat-form-actions">
                      <button 
                        className="create-chat-btn"
                        onClick={createNewChat}
                        disabled={!newChatName.trim()}
                      >
                        Create Chat
                      </button>
                      <button 
                        className="cancel-chat-btn"
                        onClick={() => {
                          setShowNewChatForm(false);
                          setNewChatName('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="chat-container">
                <div className="chat-messages">
                  {chatMessages.length === 0 ? (
                    <div className="chat-welcome">
                      <div className="welcome-icon">💬</div>
                      <h3>
                        {isChatEnabled 
                          ? `Ask questions about "${selectedFile?.file_name}"` 
                          : 'Select a PDF file to start chatting'
                        }
                      </h3>
                      <p>
                        {isChatEnabled 
                          ? 'I can help you understand the content of this PDF file.'
                          : 'Chat is only available for PDF files with extracted text.'
                        }
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((message) => (
                      <div key={message.id} className={`chat-message ${message.type}`}>
                        <div className="message-content">
                          {message.type === 'user' && (
                            <div className="message-avatar user-avatar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                          {message.type === 'ai' && (
                            <div className="message-avatar ai-avatar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                          {message.type === 'error' && (
                            <div className="message-avatar error-avatar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                          <div className="message-text">
                            <p>{message.content}</p>
                            <span className="message-time">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {isChatLoading && (
                    <div className="chat-message ai">
                      <div className="message-content">
                        <div className="message-avatar ai-avatar">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="message-text">
                          <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="chat-input-container">
                  {chatError && (
                    <div className="chat-error">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {chatError}
                    </div>
                  )}
                  <form onSubmit={handleChatSubmit} className="chat-input-form">
                    <div className="chat-input-wrapper">
                      <input
                        type="text"
                        placeholder={
                          isChatEnabled 
                            ? `Ask a question about "${selectedFile?.file_name}"...`
                            : "Select a PDF file to start chatting..."
                        }
                        className="chat-input"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={!isChatEnabled || isChatLoading}
                      />
                      <button 
                        type="submit"
                        className="chat-send-btn" 
                        disabled={!isChatEnabled || isChatLoading || !chatInput.trim()}
                      >
                        {isChatLoading ? (
                          <div className="loading-spinner-small"></div>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </form>
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
        </div>
      </div>
    </div>
  );
};

export default BaseView;
