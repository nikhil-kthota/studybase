import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { pdfTextExtractor } from '../services/pdfTextExtractor';
import './NewBase.css';

const NewBase = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [baseName, setBaseName] = useState('');
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

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
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).map(file => ({
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending'
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFile = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${baseName}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      return { path: filePath, name: file.name };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const createBase = async () => {
    if (!baseName.trim()) {
      setError('Please enter a base name');
      return;
    }

    if (files.length === 0) {
      setError('Please upload at least one file');
      return;
    }

    setIsCreating(true);
    setError('');
    setSuccess('');

    try {
      // Create base record in database
      const { data: baseData, error: baseError } = await supabase
        .from('bases')
        .insert([
          {
            name: baseName.trim(),
            user_id: user.id,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (baseError) throw baseError;

      // Upload files
      setIsUploading(true);
      const uploadedFiles = [];

      for (const fileItem of files) {
        try {
          const uploadResult = await uploadFile(fileItem.file);
          uploadedFiles.push({
            base_id: baseData.id,
            file_name: uploadResult.name,
            file_path: uploadResult.path,
            file_size: fileItem.size,
            file_type: fileItem.type,
            uploaded_at: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Failed to upload ${fileItem.name}:`, error);
        }
      }

      // Save file records to database
      if (uploadedFiles.length > 0) {
        const { data: insertedFiles, error: filesError } = await supabase
          .from('base_files')
          .insert(uploadedFiles)
          .select();

        if (filesError) throw filesError;

        // Automatically extract text from PDF files
        const pdfFiles = insertedFiles.filter(file => file.file_type === 'application/pdf');
        if (pdfFiles.length > 0) {
          console.log(`Starting automatic text extraction for ${pdfFiles.length} PDF file(s)...`);
          
          // Extract text from each PDF file asynchronously (don't wait for completion)
          pdfFiles.forEach(async (file) => {
            try {
              console.log(`Extracting text from PDF: ${file.file_name}`);
              await pdfTextExtractor.extractAndStoreText(file.id, file.file_path, file.file_name);
              console.log(`Successfully extracted text from: ${file.file_name}`);
            } catch (extractionError) {
              console.error(`Failed to extract text from ${file.file_name}:`, extractionError);
              // Don't throw error - extraction failure shouldn't prevent base creation
            }
          });
        }
      }

      setSuccess(`Base "${baseName}" created successfully with ${uploadedFiles.length} files!${uploadedFiles.filter(f => f.file_type === 'application/pdf').length > 0 ? ' PDF text extraction started automatically.' : ''}`);
      
      // Redirect to the base view after a short delay
      setTimeout(() => {
        navigate(`/base/${baseData.id}`);
      }, 2000);
      
      setBaseName('');
      setFiles([]);
      
    } catch (error) {
      console.error('Create base error:', error);
      setError(error.message || 'Failed to create base. Please try again.');
    } finally {
      setIsCreating(false);
      setIsUploading(false);
    }
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

  return (
    <div className="new-base">
      <div className="new-base-container">
        {/* Header */}
        <div className="new-base-header">
          <div className="header-icon">📚</div>
          <h1 className="header-title">Create New Base</h1>
          <p className="header-subtitle">Organize your study materials in a new base</p>
        </div>

        {/* Base Name Section */}
        <div className="base-name-section">
          <h2 className="section-title">Base Information</h2>
          <div className="form-group">
            <label htmlFor="baseName" className="form-label">Base Name</label>
            <input
              type="text"
              id="baseName"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              className="form-input"
              placeholder="Enter your base name (e.g., Computer Science, Mathematics)"
              maxLength={50}
            />
            <div className="char-count">{baseName.length}/50</div>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="file-upload-section">
          <h2 className="section-title">Upload Files</h2>
          
          {/* Drag and Drop Area */}
          <div
            className={`drop-zone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="drop-zone-content">
              <div className="upload-icon">📁</div>
              <h3 className="drop-zone-title">
                {dragActive ? 'Drop files here' : 'Drag & drop files here'}
              </h3>
              <p className="drop-zone-subtitle">
                or <span className="click-to-browse">click to browse</span>
              </p>
              <p className="drop-zone-info">
                Supports PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, images, and more
              </p>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden-file-input"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.wav"
          />

          {/* File List */}
          {files.length > 0 && (
            <div className="file-list">
              <h3 className="file-list-title">Selected Files ({files.length})</h3>
              <div className="files-grid">
                {files.map((fileItem) => (
                  <div key={fileItem.id} className="file-item">
                    <div className="file-icon">{getFileIcon(fileItem.type)}</div>
                    <div className="file-info">
                      <div className="file-name">{fileItem.name}</div>
                      <div className="file-size">{formatFileSize(fileItem.size)}</div>
                    </div>
                    <button
                      className="remove-file-btn"
                      onClick={() => removeFile(fileItem.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error and Success Messages */}
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

        {/* Create Base Button */}
        <div className="create-base-section">
          <button
            className="create-base-btn"
            onClick={createBase}
            disabled={isCreating || isUploading || !baseName.trim() || files.length === 0}
          >
            {isCreating || isUploading ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Create Base
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewBase;
