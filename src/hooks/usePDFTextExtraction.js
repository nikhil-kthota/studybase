import { useState, useCallback } from 'react';
import { pdfTextExtractor } from '../services/pdfTextExtractor';

/**
 * Custom hook for PDF text extraction functionality
 * Provides methods to extract text from PDFs and manage extraction status
 */
export const usePDFTextExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionStatus, setExtractionStatus] = useState({});

  /**
   * Extract text from a single PDF file
   * @param {string} fileId - File ID from base_files table
   * @param {string} filePath - Storage path of the PDF
   * @param {string} fileName - Original filename
   * @returns {Promise<Object>} - Extraction result
   */
  const extractTextFromFile = useCallback(async (fileId, filePath, fileName) => {
    setIsExtracting(true);
    setExtractionStatus(prev => ({
      ...prev,
      [fileId]: { status: 'processing', message: 'Extracting text...' }
    }));

    try {
      const result = await pdfTextExtractor.extractAndStoreText(fileId, filePath, fileName);
      
      setExtractionStatus(prev => ({
        ...prev,
        [fileId]: {
          status: result.success ? 'completed' : 'failed',
          message: result.message,
          textLength: result.text?.length || 0
        }
      }));

      return result;
    } catch (error) {
      console.error('Error in extractTextFromFile:', error);
      setExtractionStatus(prev => ({
        ...prev,
        [fileId]: {
          status: 'failed',
          message: error.message
        }
      }));
      
      return {
        success: false,
        error: error.message,
        message: 'Failed to extract text from PDF'
      };
    } finally {
      setIsExtracting(false);
    }
  }, []);

  /**
   * Process all PDF files in a base
   * @param {string} baseId - Base ID
   * @returns {Promise<Object>} - Processing results
   */
  const processBasePDFs = useCallback(async (baseId) => {
    setIsExtracting(true);
    setExtractionProgress(0);

    try {
      const result = await pdfTextExtractor.processBasePDFs(baseId);
      
      // Update status for each processed file
      if (result.results) {
        const statusUpdates = {};
        result.results.forEach(fileResult => {
          statusUpdates[fileResult.fileId] = {
            status: fileResult.success ? 'completed' : 'failed',
            message: fileResult.message
          };
        });
        setExtractionStatus(prev => ({ ...prev, ...statusUpdates }));
      }

      setExtractionProgress(100);
      return result;
    } catch (error) {
      console.error('Error in processBasePDFs:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to process PDF files in base'
      };
    } finally {
      setIsExtracting(false);
    }
  }, []);

  /**
   * Get extraction status for a specific file
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} - Status information
   */
  const getExtractionStatus = useCallback(async (fileId) => {
    try {
      const status = await pdfTextExtractor.getExtractionStatus(fileId);
      setExtractionStatus(prev => ({
        ...prev,
        [fileId]: status
      }));
      return status;
    } catch (error) {
      console.error('Error getting extraction status:', error);
      return {
        status: 'error',
        message: 'Failed to get extraction status'
      };
    }
  }, []);

  /**
   * Search text content across PDFs in a base
   * @param {string} baseId - Base ID
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} - Search results
   */
  const searchPDFText = useCallback(async (baseId, searchTerm) => {
    try {
      return await pdfTextExtractor.searchPDFText(baseId, searchTerm);
    } catch (error) {
      console.error('Error searching PDF text:', error);
      return [];
    }
  }, []);

  /**
   * Delete extracted text for a file
   * @param {string} fileId - File ID
   */
  const deleteExtractedText = useCallback(async (fileId) => {
    try {
      await pdfTextExtractor.deleteExtractedText(fileId);
      setExtractionStatus(prev => ({
        ...prev,
        [fileId]: { status: 'not_processed', message: 'Text deleted' }
      }));
    } catch (error) {
      console.error('Error deleting extracted text:', error);
      throw error;
    }
  }, []);

  /**
   * Clear all extraction status
   */
  const clearExtractionStatus = useCallback(() => {
    setExtractionStatus({});
    setExtractionProgress(0);
  }, []);

  return {
    // State
    isExtracting,
    extractionProgress,
    extractionStatus,
    
    // Methods
    extractTextFromFile,
    processBasePDFs,
    getExtractionStatus,
    searchPDFText,
    deleteExtractedText,
    clearExtractionStatus
  };
};

export default usePDFTextExtraction;
