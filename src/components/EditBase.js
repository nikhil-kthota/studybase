import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './EditBase.css';

const EditBase = () => {
  const { baseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [base, setBase] = useState(null);
  const [files, setFiles] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = React.useRef(null);

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

        // Load base files
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

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setNewFiles(prev => [...prev, ...droppedFiles]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setNewFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeNewFile = (index) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = async (file) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('base_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      // Update local state
      setFiles(files.filter(f => f.id !== file.id));
      setSuccess(`File "${file.file_name}" deleted successfully`);

    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file. Please try again.');
    }
  };

  const uploadNewFiles = async () => {
    if (newFiles.length === 0) return [];

    setIsUploading(true);
    const uploadedFiles = [];

    for (const file of newFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${base.name}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        uploadedFiles.push({
          base_id: baseId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_at: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    setIsUploading(false);
    return uploadedFiles;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // Upload new files
      const uploadedFiles = await uploadNewFiles();

      // Save new file records to database
      if (uploadedFiles.length > 0) {
        const { error: filesError } = await supabase
          .from('base_files')
          .insert(uploadedFiles);

        if (filesError) throw filesError;

        // Update local state - sort by upload date to maintain chronological order
        setFiles(prev => {
          const allFiles = [...uploadedFiles, ...prev];
          return allFiles.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
        });
        setNewFiles([]);
      }

      setSuccess(`Base updated successfully! ${uploadedFiles.length} new files added.`);
      
      // Redirect back to base view after a short delay
      setTimeout(() => {
        navigate(`/base/${baseId}`);
      }, 2000);

    } catch (err) {
      console.error('Error updating base:', err);
      setError('Failed to update base. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="edit-base">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading base...</p>
        </div>
      </div>
    );
  }

  if (error && !base) {
    return (
      <div className="edit-base">
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

  return (
    <div className="edit-base">
      <div className="edit-base-container">
        {/* Header */}
        <div className="edit-base-header">
          <div className="base-info">
            <div className="base-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z" fill="currentColor"/>
              </svg>
            </div>
            <div className="base-details">
              <h1 className="base-name">Edit: {base?.name}</h1>
              <p className="base-meta">
                Manage files in your base
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button className="back-to-base-btn" onClick={() => navigate(`/base/${baseId}`)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Base
            </button>
            <button className="save-btn" onClick={handleSave} disabled={isSaving || isUploading}>
              {isSaving ? (
                <div className="spinner"></div>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
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

        {/* Main Content */}
        <div className="edit-base-content">
          {/* Existing Files */}
          <div className="existing-files-section">
            <h2 className="section-title">Current Files</h2>
            {files.length > 0 ? (
              <div className="files-list">
                {files.map((file) => (
                  <div key={file.id} className="file-item">
                    <div className="file-icon">{getFileIcon(file.file_type)}</div>
                    <div className="file-info">
                      <div className="file-name">{file.file_name}</div>
                      <div className="file-details">
                        {formatFileSize(file.file_size)} • {file.file_type}
                      </div>
                    </div>
                    <button 
                      className="remove-file-btn"
                      onClick={() => removeExistingFile(file)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2"/>
                        <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-files">
                <div className="no-files-icon">📁</div>
                <h3>No files in this base</h3>
                <p>Add files using the upload section below.</p>
              </div>
            )}
          </div>

          {/* Add New Files */}
          <div className="add-files-section">
            <h2 className="section-title">Add New Files</h2>
            
            {/* Drag and Drop Area */}
            <div
              className={`drag-drop-area ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDragIn}
              onDragLeave={handleDragOut}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="drag-drop-content">
                <div className="drag-drop-icon">📁</div>
                <h3>Drop files here or click to browse</h3>
                <p>Support for PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, images, audio, and video files</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInput}
              className="file-input"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.wav"
            />

            {/* New Files Preview */}
            {newFiles.length > 0 && (
              <div className="new-files-preview">
                <h3>Files to be added:</h3>
                <div className="new-files-list">
                  {newFiles.map((file, index) => (
                    <div key={index} className="new-file-item">
                      <div className="file-icon">{getFileIcon(file.type)}</div>
                      <div className="file-info">
                        <div className="file-name">{file.name}</div>
                        <div className="file-details">
                          {formatFileSize(file.size)} • {file.type}
                        </div>
                      </div>
                      <button 
                        className="remove-new-file-btn"
                        onClick={() => removeNewFile(index)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2"/>
                          <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditBase;
