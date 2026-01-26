import React, { useState, useEffect } from 'react';
import { usePDFTextExtraction } from '../hooks/usePDFTextExtraction';
import './PDFTextExtraction.css';

/**
 * PDF Text Extraction Component
 * Provides UI for extracting and managing text content from PDF files
 */
const PDFTextExtraction = ({ baseId, files, onExtractionComplete }) => {
  const {
    isExtracting,
    extractionProgress,
    extractionStatus,
    extractTextFromFile,
    processBasePDFs,
    getExtractionStatus,
    searchPDFText,
    deleteExtractedText
  } = usePDFTextExtraction();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Filter PDF files
  const pdfFiles = files.filter(file => file.file_type === 'application/pdf');

  // Load extraction status for all PDF files on component mount
  useEffect(() => {
    const loadExtractionStatus = async () => {
      for (const file of pdfFiles) {
        await getExtractionStatus(file.id);
      }
    };

    if (pdfFiles.length > 0) {
      loadExtractionStatus();
    }
  }, [pdfFiles, getExtractionStatus]);

  /**
   * Handle extracting text from a single PDF file
   */
  const handleExtractSingleFile = async (file) => {
    try {
      const result = await extractTextFromFile(file.id, file.file_path, file.file_name);
      
      if (result.success && onExtractionComplete) {
        onExtractionComplete(file.id, result.text);
      }
    } catch (error) {
      console.error('Error extracting text from single file:', error);
    }
  };

  /**
   * Handle processing all PDF files in the base
   */
  const handleProcessAllPDFs = async () => {
    try {
      const result = await processBasePDFs(baseId);
      
      if (result.success && onExtractionComplete) {
        // Notify parent component about successful extraction
        onExtractionComplete('all', result);
      }
    } catch (error) {
      console.error('Error processing all PDFs:', error);
    }
  };

  /**
   * Handle searching text content
   */
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      const results = await searchPDFText(baseId, searchTerm);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching PDF text:', error);
    }
  };

  /**
   * Handle deleting extracted text for a file
   */
  const handleDeleteText = async (fileId) => {
    if (window.confirm('Are you sure you want to delete the extracted text? This action cannot be undone.')) {
      try {
        await deleteExtractedText(fileId);
      } catch (error) {
        console.error('Error deleting extracted text:', error);
      }
    }
  };

  /**
   * Get status badge for a file
   */
  const getStatusBadge = (fileId) => {
    const status = extractionStatus[fileId];
    if (!status) return null;

    const statusClasses = {
      'completed': 'status-badge completed',
      'failed': 'status-badge failed',
      'processing': 'status-badge processing',
      'pending': 'status-badge pending',
      'not_processed': 'status-badge not-processed'
    };

    return (
      <span className={statusClasses[status.status] || 'status-badge'}>
        {status.status === 'completed' ? '✓' : 
         status.status === 'failed' ? '✗' :
         status.status === 'processing' ? '⏳' :
         status.status === 'pending' ? '⏸' : '○'}
        {status.status}
      </span>
    );
  };

  if (pdfFiles.length === 0) {
    return (
      <div className="pdf-extraction-section">
        <h3 className="section-title">PDF Text Extraction</h3>
        <div className="no-pdfs">
          <div className="no-pdfs-icon">📄</div>
          <p>No PDF files found in this base</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-extraction-section">
      <h3 className="section-title">PDF Text Extraction</h3>
      
      {/* Extraction Controls */}
      <div className="extraction-controls">
        <div className="control-group">
          <button
            className="extract-btn primary"
            onClick={handleProcessAllPDFs}
            disabled={isExtracting}
          >
            {isExtracting ? (
              <>
                <div className="loading-spinner"></div>
                Processing PDFs...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="currentColor"/>
                </svg>
                Extract Text from All PDFs
              </>
            )}
          </button>
          
          {isExtracting && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${extractionProgress}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Search Section */}
        <div className="search-group">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search extracted text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              className="search-btn"
              onClick={handleSearch}
              disabled={!searchTerm.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* PDF Files List */}
      <div className="pdf-files-list">
        <h4 className="list-title">PDF Files ({pdfFiles.length})</h4>
        <div className="files-grid">
          {pdfFiles.map((file) => {
            const status = extractionStatus[file.id];
            return (
              <div key={file.id} className="pdf-file-item">
                <div className="file-info">
                  <div className="file-icon">📄</div>
                  <div className="file-details">
                    <div className="file-name">{file.file_name}</div>
                    <div className="file-meta">
                      {status?.textLength && (
                        <span className="text-length">
                          {status.textLength.toLocaleString()} characters
                        </span>
                      )}
                      {status?.extractionDate && (
                        <span className="extraction-date">
                          Extracted: {new Date(status.extractionDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="file-actions">
                  {getStatusBadge(file.id)}
                  
                  <div className="action-buttons">
                    {status?.status !== 'completed' && (
                      <button
                        className="action-btn extract-single"
                        onClick={() => handleExtractSingleFile(file)}
                        disabled={isExtracting}
                        title="Extract text from this PDF"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="currentColor"/>
                        </svg>
                      </button>
                    )}
                    
                    {status?.status === 'completed' && (
                      <button
                        className="action-btn delete-text"
                        onClick={() => handleDeleteText(file.id)}
                        title="Delete extracted text"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2"/>
                          <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search Results */}
      {showSearchResults && (
        <div className="search-results">
          <div className="search-results-header">
            <h4>Search Results for "{searchTerm}"</h4>
            <button
              className="close-results-btn"
              onClick={() => setShowSearchResults(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          </div>
          
          {searchResults.length > 0 ? (
            <div className="results-list">
              {searchResults.map((result) => (
                <div key={result.id} className="search-result-item">
                  <div className="result-file">
                    📄 {result.base_files.file_name}
                  </div>
                  <div className="result-preview">
                    {result.extracted_text.substring(0, 200)}...
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-results">
              <p>No results found for "{searchTerm}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PDFTextExtraction;
