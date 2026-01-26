import React, { useState } from 'react';
import { pdfTextExtractor } from '../services/pdfTextExtractor';

/**
 * PDF Text Extraction Test Component
 * This component can be used to test PDF text extraction functionality
 * Add this to any component temporarily to test the service
 */
const PDFExtractionTest = () => {
  const [testFile, setTestFile] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setTestFile(file);
      setError(null);
      setTestResult(null);
    } else {
      setError('Please select a PDF file');
    }
  };

  const testExtraction = async () => {
    if (!testFile) {
      setError('Please select a PDF file first');
      return;
    }

    setIsTesting(true);
    setError(null);
    setTestResult(null);

    try {
      // Convert file to ArrayBuffer
      const arrayBuffer = await testFile.arrayBuffer();
      
      // Test the extraction service
      const result = await pdfTextExtractor.extractAndStoreText(
        'test-file-id', // Mock file ID
        'test/path/file.pdf', // Mock file path
        testFile.name
      );

      setTestResult({
        success: result.success,
        message: result.message,
        textLength: result.text?.length || 0,
        preview: result.text?.substring(0, 200) + '...' || 'No text extracted'
      });

    } catch (err) {
      console.error('Test extraction failed:', err);
      setError(err.message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{ 
      padding: '2rem', 
      border: '1px solid #ccc', 
      borderRadius: '8px', 
      margin: '1rem',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>PDF Text Extraction Test</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          style={{ marginBottom: '0.5rem' }}
        />
        {testFile && (
          <p>Selected: {testFile.name} ({testFile.size} bytes)</p>
        )}
      </div>

      <button
        onClick={testExtraction}
        disabled={!testFile || isTesting}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isTesting ? 'not-allowed' : 'pointer',
          opacity: isTesting ? 0.6 : 1
        }}
      >
        {isTesting ? 'Testing...' : 'Test Extraction'}
      </button>

      {error && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.5rem', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {testResult && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.5rem', 
          backgroundColor: testResult.success ? '#d4edda' : '#f8d7da',
          color: testResult.success ? '#155724' : '#721c24',
          borderRadius: '4px'
        }}>
          <h4>Test Result:</h4>
          <p><strong>Success:</strong> {testResult.success ? 'Yes' : 'No'}</p>
          <p><strong>Message:</strong> {testResult.message}</p>
          <p><strong>Text Length:</strong> {testResult.textLength} characters</p>
          <p><strong>Preview:</strong> {testResult.preview}</p>
        </div>
      )}

      <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Select a PDF file using the file input</li>
          <li>Click "Test Extraction" to test the service</li>
          <li>Check the result to see if extraction worked</li>
          <li>If it fails, check the browser console for detailed errors</li>
        </ol>
      </div>
    </div>
  );
};

export default PDFExtractionTest;
