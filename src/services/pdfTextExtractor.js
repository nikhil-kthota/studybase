import { supabase } from '../lib/supabase';

/**
 * PDF Text Extraction Service
 * Extracts text content from PDF files and stores it in the database
 * for search and AI interaction purposes
 */

class PDFTextExtractor {
  constructor() {
    this.isProcessing = false;
    this.processingQueue = [];
  }

  /**
   * Extract text from a PDF file and store it in the database
   * @param {string} fileId - The ID of the file in base_files table
   * @param {string} filePath - The storage path of the PDF file
   * @param {string} fileName - The original filename
   * @returns {Promise<Object>} - Result object with success status and extracted text
   */
  async extractAndStoreText(fileId, filePath, fileName) {
    try {
      console.log(`Starting text extraction for file: ${fileName}`);

      // Check if text is already extracted
      const existingText = await this.getExistingText(fileId);
      if (existingText) {
        console.log(`Text already extracted for file: ${fileName}`);
        return {
          success: true,
          text: existingText,
          message: 'Text already extracted'
        };
      }

      // Download PDF from Supabase storage
      const pdfBuffer = await this.downloadPDF(filePath);
      if (!pdfBuffer) {
        throw new Error('Failed to download PDF file');
      }

      // Extract text from PDF
      const extractedText = await this.extractTextFromPDF(pdfBuffer);
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text content found in PDF');
      }

      // Store extracted text in database
      await this.storeExtractedText(fileId, extractedText, fileName);

      console.log(`Successfully extracted and stored text for file: ${fileName}`);

      return {
        success: true,
        text: extractedText,
        message: 'Text extracted and stored successfully'
      };

    } catch (error) {
      console.error(`Error extracting text from ${fileName}:`, error);

      // Store error information
      await this.storeExtractionError(fileId, error.message);

      return {
        success: false,
        error: error.message,
        message: 'Failed to extract text from PDF'
      };
    }
  }

  /**
   * Download PDF file from Supabase storage
   * @param {string} filePath - Storage path of the PDF
   * @returns {Promise<ArrayBuffer|null>} - PDF file as ArrayBuffer
   */
  async downloadPDF(filePath) {
    try {
      const { data, error } = await supabase.storage
        .from('files')
        .download(filePath);

      if (error) {
        console.error('Error downloading PDF:', error);
        return null;
      }

      // Convert Blob to ArrayBuffer
      const arrayBuffer = await data.arrayBuffer();
      return arrayBuffer;

    } catch (error) {
      console.error('Error converting PDF to ArrayBuffer:', error);
      return null;
    }
  }

  /**
   * Extract text from PDF using PDF.js
   * @param {ArrayBuffer} pdfBuffer - PDF file as ArrayBuffer
   * @returns {Promise<string>} - Extracted text content
   */
  async extractTextFromPDF(pdfBuffer) {
    try {
      // Dynamically import PDF.js
      const pdfjsLib = await import('pdfjs-dist');

      // Use a reliable CDN for the worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      console.log('PDF.js worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);

      // Load PDF document with basic settings
      const pdf = await pdfjsLib.getDocument({
        data: pdfBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      }).promise;

      let fullText = '';
      const totalPages = pdf.numPages;

      // Extract text from each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();

          // Combine text items from the page
          const pageText = textContent.items
            .map(item => item.str)
            .join(' ')
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

          fullText += pageText + '\n\n';

          // Add progress logging for large PDFs
          if (totalPages > 10 && pageNum % 10 === 0) {
            console.log(`Processed ${pageNum}/${totalPages} pages`);
          }
        } catch (pageError) {
          console.warn(`Error processing page ${pageNum}:`, pageError);
          // Continue with other pages
        }
      }

      // Clean up the extracted text
      const cleanedText = this.cleanExtractedText(fullText);

      console.log(`Extracted text from ${totalPages} pages, ${cleanedText.length} characters`);

      return cleanedText;

    } catch (error) {
      console.error('Error extracting text from PDF:', error);

      // Try fallback method if PDF.js fails
      console.log('Attempting fallback text extraction method...');
      try {
        return await this.extractTextFromPDFFallback(pdfBuffer);
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError);
        throw new Error(`PDF text extraction failed: ${error.message}`);
      }
    }
  }

  /**
   * Fallback method for PDF text extraction (simplified approach)
   * @param {ArrayBuffer} pdfBuffer - PDF file as ArrayBuffer
   * @returns {Promise<string>} - Extracted text content
   */
  async extractTextFromPDFFallback(pdfBuffer) {
    try {
      // Convert ArrayBuffer to Uint8Array for processing
      const uint8Array = new Uint8Array(pdfBuffer);

      // Simple text extraction using regex patterns
      // This is a basic fallback - not as accurate as PDF.js but works for simple PDFs
      const textContent = this.extractTextFromPDFBytes(uint8Array);

      if (!textContent || textContent.trim().length === 0) {
        throw new Error('No text content found in PDF using fallback method');
      }

      console.log('Fallback extraction successful:', textContent.length, 'characters');
      return this.cleanExtractedText(textContent);

    } catch (error) {
      console.error('Fallback extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract text from PDF bytes using basic parsing
   * @param {Uint8Array} bytes - PDF file bytes
   * @returns {string} - Extracted text
   */
  extractTextFromPDFBytes(bytes) {
    try {
      // Convert bytes to string for text extraction
      const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);

      // Extract text between BT (Begin Text) and ET (End Text) markers
      const textMatches = text.match(/BT[\s\S]*?ET/g);

      if (!textMatches) {
        return '';
      }

      let extractedText = '';

      for (const match of textMatches) {
        // Extract text content from PDF text objects
        const textContent = match.match(/\((.*?)\)/g);
        if (textContent) {
          for (const content of textContent) {
            // Remove parentheses and decode PDF text
            const cleanText = content.slice(1, -1);
            extractedText += cleanText + ' ';
          }
        }
      }

      return extractedText;

    } catch (error) {
      console.error('Error in basic PDF text extraction:', error);
      return '';
    }
  }

  /**
   * Clean and normalize extracted text
   * @param {string} text - Raw extracted text
   * @returns {string} - Cleaned text
   */
  cleanExtractedText(text) {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove page numbers and headers/footers (basic patterns)
      .replace(/\b\d+\b(?=\s*$)/gm, '') // Remove standalone numbers at end of lines
      .replace(/^Page \d+$/gm, '') // Remove "Page X" lines
      .replace(/^\d+$/gm, '') // Remove lines with only numbers
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();
  }

  /**
   * Store extracted text in the database
   * @param {string} fileId - File ID
   * @param {string} text - Extracted text
   * @param {string} fileName - Original filename
   */
  async storeExtractedText(fileId, text, fileName) {
    try {
      // First, verify the file belongs to the current user
      const { data: fileData, error: fileError } = await supabase
        .from('base_files')
        .select(`
          id,
          base_id,
          bases!inner(user_id)
        `)
        .eq('id', fileId)
        .maybeSingle();

      if (fileError || !fileData) {
        throw new Error(`File not found or access denied: ${fileError?.message || 'Unknown error'}`);
      }

      // Now insert the text content
      const { error } = await supabase
        .from('pdf_text_content')
        .upsert({
          file_id: fileId,
          extracted_text: text,
          text_length: text.length,
          extraction_date: new Date().toISOString(),
          status: 'completed'
        });

      if (error) {
        console.error('Error storing extracted text:', error);

        // If RLS policy fails, try alternative approach
        if (error.code === '42501') {
          console.log('RLS policy error detected, trying alternative storage method...');
          return await this.storeExtractedTextAlternative(fileId, text, fileName);
        }

        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`Stored ${text.length} characters of text for file: ${fileName}`);

    } catch (error) {
      console.error('Error in storeExtractedText:', error);
      throw error;
    }
  }

  /**
   * Alternative method to store extracted text (bypasses RLS issues)
   * @param {string} fileId - File ID
   * @param {string} text - Extracted text
   * @param {string} fileName - Original filename
   */
  async storeExtractedTextAlternative(fileId, text, fileName) {
    try {
      // Use a direct SQL query with proper user context
      const { error } = await supabase.rpc('store_pdf_text_content', {
        p_file_id: fileId,
        p_extracted_text: text,
        p_text_length: text.length,
        p_status: 'completed'
      });

      if (error) {
        console.error('Alternative storage method also failed:', error);
        throw new Error(`Alternative storage failed: ${error.message}`);
      }

      console.log(`Stored ${text.length} characters of text for file: ${fileName} (alternative method)`);

    } catch (error) {
      console.error('Error in storeExtractedTextAlternative:', error);
      throw error;
    }
  }

  /**
   * Store extraction error information
   * @param {string} fileId - File ID
   * @param {string} errorMessage - Error message
   */
  async storeExtractionError(fileId, errorMessage) {
    try {
      await supabase
        .from('pdf_text_content')
        .upsert({
          file_id: fileId,
          extracted_text: null,
          text_length: 0,
          extraction_date: new Date().toISOString(),
          status: 'failed',
          error_message: errorMessage
        });
    } catch (error) {
      console.error('Error storing extraction error:', error);
    }
  }

  /**
   * Get existing extracted text for a file
   * @param {string} fileId - File ID
   * @returns {Promise<string|null>} - Existing text or null
   */
  async getExistingText(fileId) {
    try {
      const { data, error } = await supabase
        .from('pdf_text_content')
        .select('extracted_text, status')
        .eq('file_id', fileId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return data.status === 'completed' ? data.extracted_text : null;

    } catch (error) {
      console.error('Error getting existing text:', error);
      return null;
    }
  }

  /**
   * Process all PDF files in a base
   * @param {string} baseId - Base ID
   * @returns {Promise<Object>} - Processing results
   */
  async processBasePDFs(baseId) {
    try {
      console.log(`Starting PDF processing for base: ${baseId}`);

      // Get all PDF files in the base
      const { data: files, error } = await supabase
        .from('base_files')
        .select('id, file_name, file_path, file_type')
        .eq('base_id', baseId)
        .eq('file_type', 'application/pdf');

      if (error) {
        throw new Error(`Error fetching PDF files: ${error.message}`);
      }

      if (!files || files.length === 0) {
        return {
          success: true,
          processed: 0,
          message: 'No PDF files found in this base'
        };
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      // Process each PDF file
      for (const file of files) {
        try {
          const result = await this.extractAndStoreText(
            file.id,
            file.file_path,
            file.file_name
          );

          results.push({
            fileId: file.id,
            fileName: file.file_name,
            success: result.success,
            message: result.message
          });

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }

          // Add delay between processing to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error processing file ${file.file_name}:`, error);
          errorCount++;
          results.push({
            fileId: file.id,
            fileName: file.file_name,
            success: false,
            message: error.message
          });
        }
      }

      console.log(`PDF processing completed for base ${baseId}: ${successCount} success, ${errorCount} errors`);

      return {
        success: true,
        processed: files.length,
        successCount,
        errorCount,
        results,
        message: `Processed ${files.length} PDF files: ${successCount} successful, ${errorCount} failed`
      };

    } catch (error) {
      console.error(`Error processing base PDFs:`, error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to process PDF files in base'
      };
    }
  }

  /**
   * Get extraction status for a file
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} - Status information
   */
  async getExtractionStatus(fileId) {
    try {
      const { data, error } = await supabase
        .from('pdf_text_content')
        .select('*')
        .eq('file_id', fileId)
        .maybeSingle();

      if (error || !data) {
        return {
          status: 'not_processed',
          message: 'File has not been processed yet'
        };
      }

      return {
        status: data.status,
        textLength: data.text_length,
        extractionDate: data.extraction_date,
        errorMessage: data.error_message,
        message: data.status === 'completed'
          ? `Text extracted successfully (${data.text_length} characters)`
          : data.status === 'failed'
            ? `Extraction failed: ${data.error_message}`
            : 'Processing status unknown'
      };

    } catch (error) {
      console.error('Error getting extraction status:', error);
      return {
        status: 'error',
        message: 'Failed to get extraction status'
      };
    }
  }

  /**
   * Search text content across all PDFs in a base
   * @param {string} baseId - Base ID
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} - Search results
   */
  async searchPDFText(baseId, searchTerm) {
    try {
      const { data, error } = await supabase
        .from('pdf_text_content')
        .select(`
          *,
          base_files!inner(
            id,
            file_name,
            file_type,
            base_id
          )
        `)
        .eq('base_files.base_id', baseId)
        .eq('status', 'completed')
        .textSearch('extracted_text', searchTerm);

      if (error) {
        console.error('Error searching PDF text:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error in searchPDFText:', error);
      return [];
    }
  }

  /**
   * Delete extracted text for a file
   * @param {string} fileId - File ID
   */
  async deleteExtractedText(fileId) {
    try {
      const { error } = await supabase
        .from('pdf_text_content')
        .delete()
        .eq('file_id', fileId);

      if (error) {
        console.error('Error deleting extracted text:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`Deleted extracted text for file: ${fileId}`);

    } catch (error) {
      console.error('Error in deleteExtractedText:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const pdfTextExtractor = new PDFTextExtractor();

// Export the class for testing purposes
export default PDFTextExtractor;
