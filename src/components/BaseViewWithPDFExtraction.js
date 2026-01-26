import React, { useState } from 'react';
import PDFTextExtraction from './PDFTextExtraction';

/**
 * Example integration of PDF Text Extraction into BaseView component
 * This shows how to add the PDF text extraction functionality to your existing BaseView
 */

const BaseViewWithPDFExtraction = ({ baseId, files, user }) => {
  const [extractionResults, setExtractionResults] = useState({});

  /**
   * Handle extraction completion callback
   * @param {string} fileId - File ID or 'all' for batch processing
   * @param {string|Object} result - Extracted text or processing results
   */
  const handleExtractionComplete = (fileId, result) => {
    console.log('PDF text extraction completed:', { fileId, result });
    
    // Update extraction results state
    setExtractionResults(prev => ({
      ...prev,
      [fileId]: {
        extractedAt: new Date().toISOString(),
        textLength: typeof result === 'string' ? result.length : result.successCount,
        success: true
      }
    }));

    // You can add additional logic here, such as:
    // - Triggering AI processing of the extracted text
    // - Updating UI to show extraction status
    // - Sending notifications to the user
    // - Logging analytics data
  };

  return (
    <div className="base-view-with-extraction">
      {/* Your existing BaseView content goes here */}
      
      {/* Add the PDF Text Extraction component */}
      <PDFTextExtraction
        baseId={baseId}
        files={files}
        onExtractionComplete={handleExtractionComplete}
      />
      
      {/* Example: Display extraction results */}
      {Object.keys(extractionResults).length > 0 && (
        <div className="extraction-results-summary">
          <h3>Extraction Results</h3>
          <div className="results-list">
            {Object.entries(extractionResults).map(([fileId, result]) => (
              <div key={fileId} className="result-item">
                <span className="file-id">File ID: {fileId}</span>
                <span className="text-length">
                  {typeof result.textLength === 'number' 
                    ? `${result.textLength} characters extracted`
                    : `${result.textLength} files processed`
                  }
                </span>
                <span className="extraction-time">
                  {new Date(result.extractedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseViewWithPDFExtraction;
